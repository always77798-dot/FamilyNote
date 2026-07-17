import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePageSlug } from "./slug.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const pagesDirectory = path.join(rootDirectory, "pages");
const staticDirectory = path.join(rootDirectory, "static");
const outputDirectory = path.join(rootDirectory, "dist");
const templatePath = path.join(rootDirectory, "src", "index.template.html");
const privacyMetaTag = '<meta name="robots" content="noindex, nofollow, noarchive">';
const blankRootHtml = `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${privacyMetaTag}
  </head>
  <body></body>
</html>
`;

function decodeHtml(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readTitle(html, slug) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1]) : slug.replaceAll("-", " ");
}

function readMeta(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const nameMatch = tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i);
    if (!nameMatch || nameMatch[1].toLowerCase() !== name.toLowerCase()) continue;

    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    if (contentMatch) return decodeHtml(contentMatch[1]);
  }

  return "";
}

function protectFromIndexing(html, fileName) {
  const robotsMetaPattern = /<meta\b(?=[^>]*\bname\s*=\s*["']robots["'])[^>]*>/i;

  if (robotsMetaPattern.test(html)) {
    return html.replace(robotsMetaPattern, privacyMetaTag);
  }

  const headPattern = /<head\b[^>]*>/i;
  if (!headPattern.test(html)) {
    throw new Error(`「${fileName}」缺少 <head>，無法自動加入防搜尋引擎索引設定。`);
  }

  return html.replace(headPattern, (headTag) => `${headTag}\n    ${privacyMetaTag}`);
}

function accentFor(slug) {
  const score = [...slug].reduce((total, character) => total + character.charCodeAt(0), 0);
  return (score % 4) + 1;
}

function cardMarkup(page, index) {
  const searchText = `${page.title} ${page.description} ${page.slug}`.toLocaleLowerCase("zh-Hant");
  const sequence = String(index + 1).padStart(2, "0");

  return `
          <article class="note-card note-card--${page.accent}" data-page-card data-search="${escapeHtml(searchText)}">
            <a class="note-card__link" href="/${page.slug}" aria-label="查看${escapeHtml(page.title)}">
              <div class="note-card__topline">
                <span class="note-card__number">${sequence}</span>
                <span class="note-card__slug">/${escapeHtml(page.slug)}</span>
              </div>
              <div class="note-card__body">
                <h3>${escapeHtml(page.title)}</h3>
                <p>${escapeHtml(page.description)}</p>
              </div>
              <span class="note-card__action">打開這一頁 <span aria-hidden="true">→</span></span>
            </a>
          </article>`;
}

async function build() {
  const entries = await readdir(pagesDirectory, { withFileTypes: true });
  const htmlFiles = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".html")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));

  if (htmlFiles.length === 0) {
    throw new Error("pages 資料夾中至少需要一個 .html 檔案。");
  }

  const pages = [];
  const sourceFileBySlug = new Map();

  for (const fileName of htmlFiles) {
    const slug = normalizePageSlug(fileName);
    const existingSourceFile = sourceFileBySlug.get(slug);

    if (existingSourceFile) {
      throw new Error(
        `檔名「${existingSourceFile}」與「${fileName}」都會轉成網址「/${slug}」，請擇一改名。`,
      );
    }

    sourceFileBySlug.set(slug, fileName);

    const sourcePath = path.join(pagesDirectory, fileName);
    const sourceHtml = await readFile(sourcePath, "utf8");
    const title = readTitle(sourceHtml, slug);
    const customDescription =
      readMeta(sourceHtml, "family-note:summary") || readMeta(sourceHtml, "description");
    const description = customDescription || `點開查看「${title}」的完整內容。`;

    pages.push({
      slug,
      sourceFile: fileName,
      title,
      description,
      accent: accentFor(slug),
      html: protectFromIndexing(sourceHtml, fileName),
    });
  }

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  for (const page of pages) {
    await writeFile(path.join(outputDirectory, `${page.slug}.html`), page.html, "utf8");
  }

  await cp(staticDirectory, outputDirectory, { recursive: true, force: true });

  const template = await readFile(templatePath, "utf8");
  const publicPageData = pages.map(({ slug, title, description }) => ({ slug, title, description }));
  const safePageData = JSON.stringify(publicPageData).replaceAll("<", "\\u003c");
  const cards = pages.map(cardMarkup).join("\n");
  const mainHtml = protectFromIndexing(
    template
    .replaceAll("{{PAGE_COUNT}}", String(pages.length))
    .replace("{{PAGE_CARDS}}", cards)
      .replace("{{PAGE_DATA}}", safePageData),
    "src/index.template.html",
  );

  await writeFile(path.join(outputDirectory, "index.html"), blankRootHtml, "utf8");
  await writeFile(path.join(outputDirectory, "main.html"), mainHtml, "utf8");

  console.log(`FamilyNote 建置完成：根頁空白、/main 為首頁，共 ${pages.length} 個子頁。`);
  for (const page of pages) console.log(`  /${page.slug}  ←  pages/${page.sourceFile}`);
}

build().catch((error) => {
  console.error(`建置失敗：${error.message}`);
  process.exitCode = 1;
});
