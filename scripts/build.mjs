import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const pagesDirectory = path.join(rootDirectory, "pages");
const staticDirectory = path.join(rootDirectory, "static");
const outputDirectory = path.join(rootDirectory, "dist");
const templatePath = path.join(rootDirectory, "src", "index.template.html");

const reservedSlugs = new Set(["index", "pages", "api", "assets", "static"]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

  for (const fileName of htmlFiles) {
    const originalSlug = path.basename(fileName, path.extname(fileName));
    const slug = originalSlug.toLowerCase();

    if (originalSlug !== slug) {
      throw new Error(`檔名「${fileName}」含有大寫字母；請全部改成英文小寫。`);
    }

    if (!slugPattern.test(slug)) {
      throw new Error(`檔名「${fileName}」不符合規則；請使用英文小寫、數字與連字號。`);
    }

    if (reservedSlugs.has(slug)) {
      throw new Error(`檔名「${fileName}」使用了保留名稱「${slug}」，請更換檔名。`);
    }

    const sourcePath = path.join(pagesDirectory, fileName);
    const html = await readFile(sourcePath, "utf8");
    const title = readTitle(html, slug);
    const customDescription = readMeta(html, "family-note:summary") || readMeta(html, "description");
    const description = customDescription || `點開查看「${title}」的完整內容。`;

    pages.push({
      slug,
      title,
      description,
      accent: accentFor(slug),
      html,
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
  const indexHtml = template
    .replaceAll("{{PAGE_COUNT}}", String(pages.length))
    .replace("{{PAGE_CARDS}}", cards)
    .replace("{{PAGE_DATA}}", safePageData);

  await writeFile(path.join(outputDirectory, "index.html"), indexHtml, "utf8");
  await writeFile(
    path.join(outputDirectory, "pages.json"),
    `${JSON.stringify(publicPageData, null, 2)}\n`,
    "utf8",
  );

  console.log(`FamilyNote 建置完成：${pages.length} 個子頁。`);
  for (const page of pages) console.log(`  /${page.slug}  ←  pages/${page.slug}.html`);
}

build().catch((error) => {
  console.error(`建置失敗：${error.message}`);
  process.exitCode = 1;
});
