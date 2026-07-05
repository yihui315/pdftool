export const LOCALES = Object.freeze([
  Object.freeze({ code: "zh-CN", prefix: "", hrefLang: "zh-CN", label: "简体中文", dir: "ltr" }),
  Object.freeze({ code: "en", prefix: "en", hrefLang: "en", label: "English", dir: "ltr" }),
  Object.freeze({ code: "es", prefix: "es", hrefLang: "es", label: "Español", dir: "ltr" }),
  Object.freeze({
    code: "pt-BR",
    prefix: "pt-br",
    hrefLang: "pt-BR",
    label: "Português (Brasil)",
    dir: "ltr"
  }),
  Object.freeze({ code: "ja", prefix: "ja", hrefLang: "ja", label: "日本語", dir: "ltr" }),
  Object.freeze({ code: "id", prefix: "id", hrefLang: "id", label: "Bahasa Indonesia", dir: "ltr" })
]);

export const LOCALE_BY_CODE = new Map(LOCALES.map((locale) => [locale.code, locale]));

export function getLocale(code) {
  const locale = LOCALE_BY_CODE.get(code);
  if (!locale) throw new Error(`Unsupported locale: ${code}`);
  return locale;
}
