// Lists t("...") strings in src/ that have no uz or ru translation.
// Usage: node --experimental-strip-types scripts/check-i18n.mjs [file ...]
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const localeDir = path.join(root, "src/i18n/locales");
const dict = { uz: {}, ru: {} };
for (const file of fs.readdirSync(localeDir)) {
  const mod = await import(path.join(localeDir, file));
  Object.assign(dict.uz, mod.default.uz);
  Object.assign(dict.ru, mod.default.ru);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []);
}
const files = process.argv.slice(2).length ? process.argv.slice(2).map((f) => path.resolve(f)) : walk(path.join(root, "src"));
const re = /\bt\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\$]|\\.)*`)/g;
let missing = 0;
for (const file of files) {
  if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(re)) {
    const key = m[1].startsWith("`") ? m[1].slice(1, -1) : JSON.parse(m[1].startsWith("'") ? `"${m[1].slice(1, -1).replace(/"/g, '\\"')}"` : m[1]);
    const langs = ["uz", "ru"].filter((l) => !(key in dict[l]));
    if (langs.length) {
      missing++;
      console.log(`${path.relative(root, file)}: missing ${langs.join("+")}: ${JSON.stringify(key)}`);
    }
  }
}
console.log(missing ? `${missing} missing` : "All t() strings translated.");
process.exit(missing ? 1 : 0);
