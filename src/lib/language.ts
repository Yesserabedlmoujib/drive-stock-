import i18n from "@/i18n";

export const applyLanguage = (lang: string) => {
  i18n.changeLanguage(lang);

  const isArabic = lang === "ar";

  document.documentElement.lang = lang;
  document.documentElement.dir = isArabic ? "rtl" : "ltr";

  document.body.dir = isArabic ? "rtl" : "ltr";

  localStorage.setItem("language", lang);
};
