import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import Icon from "./Icon.jsx";

const LANGUAGES = ["tg", "ru", "en"];

// Top bar. With `title` it shows a back button (inner pages), otherwise the logo (main tabs).
// `actions` = extra buttons on the right (e.g. share).
export default function Header({ title, actions }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const language = user?.preferred_language || "tg";

  async function changeLanguage(code) {
    if (!user) return navigate("/login");
    setUser(await api.patch("/me", { preferred_language: code }));
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="h-16 px-4 max-w-3xl mx-auto flex items-center justify-between gap-3">
        {title ? (
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate(-1)} className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full hover:text-primary" aria-label="Ба қафо">
              <Icon name="arrow_back" size={24} />
            </button>
            <h1 className="font-serif text-headline-sm truncate">{title}</h1>
          </div>
        ) : (
          <Link to="/" className="flex items-center gap-2">
            <Icon name="auto_stories" filled size={26} className="text-primary" />
            <div className="flex flex-col">
              <span className="font-serif text-headline-sm text-primary leading-none">Шунав</span>
              <span className="text-label-sm text-on-surface-variant/80 hidden sm:inline">Китобхонаи савтӣ</span>
            </div>
          </Link>
        )}

        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
          {!title && (
            <div className="flex items-center bg-surface-container-high rounded-full p-0.5">
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
          )}
          <Link to={user ? "/profile" : "/login"} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold" aria-label="Профил">
            {user ? user.name[0] : <Icon name="person" size={18} />}
          </Link>
        </div>
      </div>
    </header>
  );
}
