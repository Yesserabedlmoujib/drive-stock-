// import i18n from "@/i18n";

// export default function LanguageSwitcher() {
//   const changeLanguage = (lng: string) => {
//     i18n.changeLanguage(lng);
//     document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
//   };

//   return (
//     <select
//       className="bg-primary text-primary-foreground shadow hover:bg-primary/90 border rounded px-2 py-1 text-sm text-center"
//       value={i18n.language}
//       onChange={(e) => changeLanguage(e.target.value)}
//     >
//       <option className="text-center" value="fr">
//         Français
//       </option>
//       <option className="text-center" value="ar">
//         العربية
//       </option>
//     </select>
//   );
// }

import i18n from "@/i18n";
import { applyLanguage } from "@/lib/language";

export default function LanguageSwitcher() {
  return (
    <select
      className="bg-primary text-primary-foreground shadow hover:bg-primary/90 border rounded px-2 py-1 text-sm text-center"
      value={i18n.language}
      onChange={(e) => applyLanguage(e.target.value)}
    >
      <option className="text-center" value="fr">
        Français
      </option>

      <option className="text-center" value="ar">
        العربية
      </option>
    </select>
  );
}