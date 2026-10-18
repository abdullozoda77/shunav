import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useT } from "../i18n.jsx";
import { NAV_LINKS } from "./BottomNav.jsx";
import Icon from "./Icon.jsx";
import LanguageSwitch from "./LanguageSwitch.jsx";
import SettingsMenu from "./SettingsMenu.jsx";
import ThemeSwitch from "./ThemeSwitch.jsx";

// Top bar.
// Wide screens: logo, menu, search, language, theme, account menu.
// Phones: the logo on main tabs, or a back button + `title` on inner pages; language and theme are in the account menu.
// `actions` = extra buttons on the right (e.g. share).
export default function Header({ title, actions }) {
  const navigate = useNavigate();
  const t = useT();
  const [search, setSearch] = useState("");

  function submitSearch(event) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    setSearch("");
  }

  const logo = (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <Icon name="auto_stories" filled size={28} className="text-primary" />
      <div className="flex flex-col">
        <span className="font-serif text-headline-sm text-primary leading-none">{t("Шунав")}</span>
        <span className="text-label-sm text-on-surface-variant/80 hidden lg:inline">{t("Китобхонаи савтӣ")}</span>
      </div>
    </Link>
  );

  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-surface/85 backdrop-blur-xl border-b border-line/5 shadow-[0_4px_24px_rgba(0,0,0,0.15)]">
      <div className="h-16 md:h-[72px] px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* left: phones see the back button on inner pages, wide screens always see the logo */}
        {title ? (
          <>
            <div className="flex items-center gap-2 min-w-0 md:hidden">
              <button onClick={() => navigate(-1)} className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full hover:text-primary" aria-label={t("Ба қафо")}>
                <Icon name="arrow_back" size={24} />
              </button>
              <h1 className="font-serif text-headline-sm truncate">{title}</h1>
            </div>
            <div className="hidden md:block">{logo}</div>
          </>
        ) : (
          logo
        )}

        {/* menu (wide screens) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `px-4 h-10 rounded-full flex items-center gap-2 text-label-md ${
                  isActive ? "bg-primary/15 text-primary font-bold" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`
              }
            >
              <Icon name={link.icon} size={18} />
              {t(link.label)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {/* search (wide screens) */}
          <form onSubmit={submitSearch} className="hidden xl:flex items-center h-10 w-56 bg-surface-container-high rounded-full px-3 gap-2 focus-within:ring-2 focus-within:ring-primary/50">
            <Icon name="search" size={18} className="text-primary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent outline-none text-body-sm placeholder:text-outline"
              placeholder={t("Асар ё шоир...")}
            />
          </form>

          {actions}

          <LanguageSwitch className={title ? "hidden md:flex" : "hidden sm:flex"} />
          <ThemeSwitch className="hidden sm:block md:hidden xl:block" />
          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}
