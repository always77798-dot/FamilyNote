import path from "node:path";

const reservedSlugs = new Set(["index", "pages", "api", "assets", "static"]);
const sourceNamePattern = /^[a-z0-9_-]+$/i;
const publicSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePageSlug(fileName) {
  const sourceSlug = path.basename(fileName, path.extname(fileName));

  if (!sourceNamePattern.test(sourceSlug)) {
    throw new Error(
      `檔名「${fileName}」不符合規則；請使用英文字母、數字、連字號或底線。`,
    );
  }

  const slug = sourceSlug
    .toLowerCase()
    .replace(/_+/g, "-")
    .replace(/-+/g, "-");

  if (!publicSlugPattern.test(slug)) {
    throw new Error(`檔名「${fileName}」的開頭與結尾必須是英文字母或數字。`);
  }

  if (reservedSlugs.has(slug)) {
    throw new Error(`檔名「${fileName}」轉換後使用了保留名稱「${slug}」，請更換檔名。`);
  }

  return slug;
}
