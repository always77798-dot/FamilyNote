import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(rootDirectory, "dist");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const indexHtml = await readFile(path.join(outputDirectory, "index.html"), "utf8");
const pageManifest = JSON.parse(await readFile(path.join(outputDirectory, "pages.json"), "utf8"));

assert(pageManifest.length > 0, "pages.json 沒有任何子頁。");
assert(!indexHtml.includes("{{PAGE_"), "首頁仍含有尚未取代的建置標記。");
assert(indexHtml.includes('id="page-search"'), "首頁缺少搜尋欄位。");
assert(indexHtml.includes('aria-live="polite"'), "首頁缺少搜尋結果狀態提示。");
assert(indexHtml.includes('href="/health-check"'), "首頁缺少健康檢查頁連結。");
assert(indexHtml.includes('content="https://family-note-seven.vercel.app/og.png"'), "首頁缺少正式分享預覽圖網址。");

for (const page of pageManifest) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug), `網址代稱不合法：${page.slug}`);
  assert(page.title.trim(), `子頁缺少標題：${page.slug}`);
  await access(path.join(outputDirectory, `${page.slug}.html`));
}

await access(path.join(outputDirectory, "og.png"));

const sourcePage = await readFile(path.join(rootDirectory, "pages", "health-check.html"));
const builtPage = await readFile(path.join(outputDirectory, "health-check.html"));
assert(sourcePage.equals(builtPage), "健康檢查頁在建置過程中被意外改動。");

console.log(`FamilyNote 檢查完成：首頁、分享圖與 ${pageManifest.length} 個子頁均正常。`);
