import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePageSlug } from "./slug.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const pagesDirectory = path.join(rootDirectory, "pages");
const outputDirectory = path.join(rootDirectory, "dist");
const privacyMetaTag = '<meta name="robots" content="noindex, nofollow, noarchive">';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const rootHtml = await readFile(path.join(outputDirectory, "index.html"), "utf8");
const mainHtml = await readFile(path.join(outputDirectory, "main.html"), "utf8");
const outputEntries = await readdir(outputDirectory);
const pageEntries = await readdir(pagesDirectory, { withFileTypes: true });
const sourcePageFiles = pageEntries
  .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".html")
  .map((entry) => entry.name);

assert(/<body>\s*<\/body>/i.test(rootHtml), "網站根頁不是空白頁。");
assert(rootHtml.includes(privacyMetaTag), "網站根頁缺少防搜尋引擎索引設定。");
assert(!rootHtml.includes("FamilyNote"), "網站根頁洩漏了首頁內容。");
assert(!rootHtml.includes("href="), "網站根頁不應包含任何連結。");

assert(sourcePageFiles.length > 0, "pages 資料夾中沒有任何子頁。");
assert(!mainHtml.includes("{{PAGE_"), "/main 仍含有尚未取代的建置標記。");
assert(mainHtml.includes(privacyMetaTag), "/main 缺少防搜尋引擎索引設定。");
assert(mainHtml.includes('id="page-search"'), "/main 缺少搜尋欄位。");
assert(mainHtml.includes('aria-live="polite"'), "/main 缺少搜尋結果狀態提示。");
assert(mainHtml.includes('href="/main"'), "/main 的首頁連結設定錯誤。");
assert(mainHtml.includes('href="/health-check"'), "/main 缺少健康檢查頁連結。");
assert(
  mainHtml.includes('content="https://family-note-seven.vercel.app/og.png"'),
  "/main 缺少正式分享預覽圖網址。",
);
assert(!outputEntries.includes("pages.json"), "建置結果不應公開 pages.json 分頁清單。");

assert(normalizePageSlug("TRIP260721.html") === "trip260721", "大寫檔名轉換失敗。");
assert(normalizePageSlug("TRIP_260721.html") === "trip-260721", "底線檔名轉換失敗。");
assert(
  normalizePageSlug("Family__Trip-2026.HTML") === "family-trip-2026",
  "混合檔名轉換失敗。",
);

for (const sourceFile of sourcePageFiles) {
  const slug = normalizePageSlug(sourceFile);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug), `網址代稱不合法：${slug}`);
  const builtPagePath = path.join(outputDirectory, `${slug}.html`);
  await access(builtPagePath);
  const builtPageHtml = await readFile(builtPagePath, "utf8");
  assert(builtPageHtml.includes(privacyMetaTag), `子頁缺少防搜尋引擎索引設定：/${slug}`);
}

await access(path.join(outputDirectory, "og.png"));

console.log(
  `FamilyNote 檢查完成：根頁空白、/main 首頁、分享圖與 ${sourcePageFiles.length} 個子頁均正常。`,
);
