import { useT } from "../i18n.jsx";
import { useTheme } from "../theme.jsx";
import Icon from "./Icon.jsx";

// Light / dark switch in the same style as the language switch: a pill with a gold knob (sun or moon).
export default function ThemeSwitch({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const t = useT();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={t("Мавзӯи торик")}
      title={dark ? t("Мавзӯи равшан") : t("Мавзӯи торик")}
      onClick={toggleTheme}
      className={`relative shrink-0 w-[60px] h-8 rounded-full bg-surface-container-high p-0.5 ${className}`}
    >
      <span className="absolute inset-0 flex items-center justify-between px-2 text-on-surface-variant">
        <Icon name="light_mode" size={14} />
        <Icon name="dark_mode" size={14} />
      </span>
      <span
        className={`relative w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center transition-transform duration-300 ${dark ? "translate-x-7" : ""}`}
      >
        <Icon name={dark ? "dark_mode" : "light_mode"} filled size={16} />
      </span>
    </button>
  );
}
