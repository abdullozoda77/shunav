import { NavLink } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useT } from "../i18n.jsx";

// The same links are shown in the top menu on wide screens (Header.jsx). Labels are translated where shown.. Labels are translated where shown.
export const NAV_LINKS = [
  { to: "/", icon: "menu_book", label: "Асосӣ" },
  { to: "/search", icon: "search", label: "Ҷустуҷӯ" },
  { to: "/library", icon: "local_library", label: "Китобхона" },
  { to: "/profile", icon: "person", label: "Профил" },
];

// Phones only: the menu at the bottom of the screen
export default function BottomNav() {
  const t = useT();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] ${
                isActive ? "text-primary font-bold" : "text-on-surface-variant hover:text-on-surface"
              }`
            }
          >
            <Icon name={link.icon} size={22} />
            <span className="text-label-sm">{t(link.label)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
