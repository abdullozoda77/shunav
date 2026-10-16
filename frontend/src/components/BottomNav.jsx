import { NavLink } from "react-router-dom";
import Icon from "./Icon.jsx";

const TABS = [
  { to: "/", icon: "menu_book", label: "Асосӣ" },
  { to: "/search", icon: "search", label: "Ҷустуҷӯ" },
  { to: "/library", icon: "local_library", label: "Китобхона" },
  { to: "/profile", icon: "person", label: "Профил" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] ${
                isActive ? "text-primary font-bold" : "text-on-surface-variant hover:text-on-surface"
              }`
            }
          >
            <Icon name={tab.icon} size={22} />
            <span className="text-label-sm">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
