import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { useLanguage, useT } from "../i18n.jsx";
import { useTheme } from "../theme.jsx";
import Icon from "./Icon.jsx";
import LanguageSwitch from "./LanguageSwitch.jsx";
import ThemeSwitch from "./ThemeSwitch.jsx";

// The round button on the right of the top bar (the user's first letter, or a person icon for guests).
// Click: a menu with the account, language, light/dark theme and links. Guests get the same menu.
export default function SettingsMenu() {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  // close on a click outside, on Esc and when the page changes
  useEffect(() => {
    if (!open) return;
    const onClick = (event) => box.current && !box.current.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => setOpen(false), [location.pathname]);

  const links = [
    { to: "/profile", icon: "person", label: t("Профил") },
    { to: "/library", icon: "local_library", label: t("Китобхона") },
  ];

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={t("Танзимот ва ҳисоб")}
        aria-expanded={open}
        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${user ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"} ${open ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-surface" : ""}`}
      >
        {user ? user.name[0] : <Icon name="person" size={20} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-[min(300px,calc(100vw-24px))] rounded-2xl overflow-hidden bg-surface-container-low border border-line/10 shadow-2xl z-[70]">
          {/* who */}
          <div className="p-4 flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold shrink-0 ${user ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant"}`}>
              {user ? user.name[0] : <Icon name="person" size={22} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-headline-sm leading-tight truncate">{user ? user.name : t("Меҳмон")}</p>
              <p className="text-label-sm text-on-surface-variant truncate">{user ? `@${user.username}` : t("Ворид нашудаед")}</p>
            </div>
          </div>

          {!user && (
            <div className="px-4 pb-3 grid grid-cols-2 gap-2">
              <Link to="/login" className="h-10 rounded-xl bg-primary text-on-primary text-label-md font-bold flex items-center justify-center gap-1.5 hover:brightness-110">
                <Icon name="login" size={18} /> {t("Ворид шудан")}
              </Link>
              <Link to="/register" className="h-10 rounded-xl border border-line/15 text-label-md flex items-center justify-center hover:border-primary/60 hover:text-primary">
                {t("Сабти ном")}
              </Link>
            </div>
          )}

          <div className="px-4 py-3 flex flex-col gap-4 border-t border-line/10">
            {/* language */}
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-label-sm uppercase tracking-wider text-on-surface-variant">
                <Icon name="translate" size={16} className="text-secondary" /> {t("Забони сомона")}
              </span>
              <LanguageSwitch full />
              {language !== "tg" && (
                <span className="flex items-center gap-1.5 text-label-sm text-tertiary">
                  <Icon name="headphones" size={14} className="text-primary" /> {t("Матн ва аудио бо забони тоҷикӣ")}
                </span>
              )}
            </div>

            {/* theme */}
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-label-sm uppercase tracking-wider text-on-surface-variant">
                <Icon name={theme === "dark" ? "dark_mode" : "light_mode"} size={16} className="text-secondary" />
                {t("Мавзӯ")}: <span className="normal-case tracking-normal text-on-surface font-semibold">{theme === "dark" ? t("Торик") : t("Равшан")}</span>
              </span>
              <ThemeSwitch />
            </div>
          </div>

          {/* pages and leaving */}
          <nav className="p-2 border-t border-line/10 flex flex-col">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className="group h-11 px-3 rounded-xl flex items-center gap-3 text-label-lg hover:bg-surface-container-high">
                <Icon name={link.icon} size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                <span className="flex-1">{link.label}</span>
                <Icon name="chevron_right" size={18} className="text-outline transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
            {user?.is_admin && (
              <a href="/api/docs" target="_blank" rel="noreferrer" className="group h-11 px-3 rounded-xl flex items-center gap-3 text-label-lg hover:bg-surface-container-high">
                <Icon name="admin_panel_settings" size={20} className="text-on-surface-variant group-hover:text-secondary transition-colors" />
                <span className="flex-1">{t("Идоракунӣ (API docs)")}</span>
                <Icon name="open_in_new" size={16} className="text-outline" />
              </a>
            )}
            {user && (
              <button
                onClick={() => {
                  logout();
                  navigate("/welcome");
                }}
                className="h-11 px-3 rounded-xl flex items-center gap-3 text-label-lg text-error hover:bg-error/10"
              >
                <Icon name="logout" size={20} /> {t("Баромадан")}
              </button>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
