// Tiny i18n layer. English source strings are the keys; each file in
// ./locales exports { uz: {...}, ru: {...} } with translations for them.
// Missing keys fall back to English. The language lives in the `zd_lang`
// cookie (so the server-rendered login page can read it too) and switching
// reloads the page, so plain module-level `t()` calls are always current.

export type Lang = "uz" | "ru" | "en";
type Dict = Record<string, string>;
type LocaleModule = { default: { uz: Dict; ru: Dict } };

export const LANGUAGES: Array<{ code: Lang; label: string; short: string }> = [
  { code: "uz", label: "O'zbekcha", short: "UZ" },
  { code: "ru", label: "Русский", short: "RU" },
  { code: "en", label: "English", short: "EN" },
];

function readLang(): Lang {
  const match = document.cookie.match(/(?:^|;\s*)zd_lang=(uz|ru|en)/);
  return (match?.[1] as Lang) || "uz";
}

export const lang: Lang = readLang();
document.documentElement.lang = lang;

export const intlLocale = { uz: "uz-Latn-UZ", ru: "ru-RU", en: "en-US" }[lang];

export function setLang(next: Lang) {
  document.cookie = `zd_lang=${next}; Path=/; Max-Age=${365 * 86400}; SameSite=Lax`;
  window.location.reload();
}

const modules = import.meta.glob<LocaleModule>("./locales/*.ts", { eager: true });
const dict: Dict = {};
if (lang !== "en") {
  for (const mod of Object.values(modules)) Object.assign(dict, mod.default[lang]);
}

/** Translate an English source string. `{name}` placeholders are filled from vars. */
export function t(text: string, vars?: Record<string, string | number>): string {
  let out = lang === "en" ? text : (dict[text] ?? text);
  if (vars) {
    for (const [key, value] of Object.entries(vars)) out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}

/** Pick a plural form. Russian uses one/few/many; Uzbek has no plural agreement. */
export function plural(count: number, forms: { en: [string, string]; ru: [string, string, string]; uz: string }): string {
  let form: string;
  if (lang === "uz") form = forms.uz;
  else if (lang === "ru") {
    const n = Math.abs(count) % 100;
    const n1 = n % 10;
    form = n > 10 && n < 20 ? forms.ru[2] : n1 === 1 ? forms.ru[0] : n1 >= 2 && n1 <= 4 ? forms.ru[1] : forms.ru[2];
  } else form = count === 1 ? forms.en[0] : forms.en[1];
  return form.split("{n}").join(String(count));
}
