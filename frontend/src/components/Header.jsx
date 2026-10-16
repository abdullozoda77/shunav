import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { NAV_LINKS } from "./BottomNav.jsx";
import Icon from "./Icon.jsx";

const LANGUAGES = ["tg", "ru", "en"];

// Top bar.
// Wide screens: logo, menu, search, language, profile.
// Phones: the logo on main tabs, or a back button + `title` on inner pages.
// `actions` = extra buttons on the right (e.g. share).
export default function Header({ title, actions }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const language = user?.preferred_language || "tg";

  async function changeLanguage(code) {
    if (!user) return navigate("/login");
    setUser(await api.patch("/me", { preferred_language: code }));
  }

  function submitSearch(event) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    setSearch("");
  }

  const logo = (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <Icon name="auto_stories" filled size={28} className="text-primary" />
      <div className="flex flex-col">
        <span className="font-serif text-headline-sm text-primary leading-none">Шунав</span>
        <span className="text-label-sm text-on-surface-variant/80 hidden lg:inline">Китобхонаи савтӣ</span>
      </div>
    </Link>
  );

  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-surface/85 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="h-16 md:h-[72px] px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* left: phones see the back button on inner pages, wide screens always see the logo */}
        {title ? (
          <>
            <div className="flex items-center gap-2 min-w-0 md:hidden">
              <button onClick={() => navigate(-1)} className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full hover:text-primary" aria-label="Ба қафо">
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
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {/* search (wide screens) */}
          <form onSubmit={submitSearch} className="hidden lg:flex items-center h-10 w-64 bg-surface-container-high rounded-full px-3 gap-2 focus-within:ring-2 focus-within:ring-primary/50">
            <Icon name="search" size={18} className="text-primary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent outline-none text-body-sm placeholder:text-outline"
              placeholder="Асар ё шоир..."
            />
          </form>

          {actions}

          <div className={`items-center bg-surface-container-high rounded-full p-0.5 ${title ? "hidden md:flex" : "flex"}`}>
            {LANGUAGES.map((code) => (
              <button
                key={code}
                onClick={() => changeLanguage(code)}
                className={`px-2 py-1 rounded-full text-label-sm uppercase min-h-[28px] ${
                  code === language ? "bg-primary text-on-primary font-bold" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          {user ? (
            <Link to="/profile" className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold" aria-label="Профил">
              {user.name[0]}
            </Link>
          ) : (
            <Link to="/login" className="h-10 px-4 rounded-full bg-primary text-on-primary text-label-md font-bold flex items-center gap-1.5">
              <Icon name="login" size={18} />
              <span className="hidden sm:inline">Ворид шудан</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
