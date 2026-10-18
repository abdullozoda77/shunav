import { useLanguage } from "../i18n.jsx";
import { LANGUAGES } from "../translations.js";

// TG | RU | EN with a gold pill that slides to the chosen language.
// full = whole names ("Тоҷикӣ", "Русский", "English") and the full width, for the settings menu.
export default function LanguageSwitch({ full = false, className = "" }) {
  const { language, setLanguage } = useLanguage();
  const index = LANGUAGES.findIndex((item) => item.code === language);

  return (
    <div className={`relative flex items-center bg-surface-container-high rounded-full p-0.5 ${full ? "w-full" : ""} ${className}`}>
      <span
        className="absolute top-0.5 bottom-0.5 left-0.5 rounded-full bg-primary shadow-[0_0_12px_rgb(var(--c-primary)/0.45)] transition-transform duration-500 ease-[cubic-bezier(0.68,-0.3,0.27,1.3)]"
        style={{ width: `calc((100% - 4px) / ${LANGUAGES.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {LANGUAGES.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => setLanguage(item.code)}
          aria-pressed={item.code === language}
          title={item.name}
          className={`relative z-10 flex-1 rounded-full transition-colors duration-300 ${full ? "h-9 text-label-md" : "min-w-[34px] h-7 px-2 text-label-sm uppercase"} ${
            item.code === language ? "text-on-primary font-bold" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {full ? item.name : item.short}
        </button>
      ))}
    </div>
  );
}
