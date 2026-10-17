import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";

// Each genre: an emblem, its own colour and one line about what it is
const GENRES = {
  Достон: { icon: "swords", from: "#5a1f14", to: "#a8501c", text: "Ҳикояи манзуми қаҳрамонӣ" },
  Наср: { icon: "menu_book", from: "#0d3b33", to: "#1f7a5f", text: "Ҳикоят ва панд бо наср" },
  Рубоӣ: { icon: "counter_4", from: "#1d2257", to: "#3c4fa8", text: "Шеъри чормисраъа" },
  Шеър: { icon: "history_edu", from: "#3d2814", to: "#8a6224", text: "Қасида, қитъа ва ғайра" },
  Ғазал: { icon: "local_florist", from: "#4a0f22", to: "#a4264d", text: "Шеъри ошиқона ва ирфонӣ" },
};
const OTHER = { icon: "category", from: "#1c1f2a", to: "#313540", text: "Асарҳои классикӣ" };

// A big open book drawn faintly in the corner
function OpenBook({ className }) {
  return (
    <svg viewBox="0 0 48 34" className={className} fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 6C17 1 8 1 2 5v26c6-4 15-4 22 1 7-5 16-5 22-1V5c-6-4-15-4-22 1z" />
      <path d="M24 6v26M7 11h11M7 15h11M7 19h9M30 11h11M30 15h11M30 19h9" />
    </svg>
  );
}

export default function GenreCard({ genre }) {
  const style = GENRES[genre.name] || OTHER;

  return (
    <Link
      to={`/search?category_id=${genre.id}`}
      className="group relative h-40 rounded-2xl overflow-hidden p-4 flex flex-col justify-between border border-white/10 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-primary/70 hover:shadow-[0_16px_36px_-12px_rgba(255,192,65,0.45)]"
      style={{ background: `linear-gradient(140deg, ${style.from}, ${style.to})` }}
    >
      <OpenBook className="absolute -right-5 -bottom-3 w-32 h-24 text-white/10 -rotate-12 transition-transform duration-700 ease-out group-hover:rotate-0 group-hover:scale-110" />

      {/* emblem */}
      <div className="w-12 h-12 rounded-xl bg-black/25 border border-white/15 flex items-center justify-center text-primary-fixed transition-all duration-500 group-hover:scale-110 group-hover:text-primary group-hover:shadow-[0_0_20px_rgba(255,192,65,0.45)]">
        <Icon name={style.icon} size={26} />
      </div>

      <div className="relative">
        <p className="font-serif text-headline-sm leading-tight text-white">{genre.name}</p>
        <p className="text-label-sm text-white/70 line-clamp-1">{style.text}</p>
        <p className="text-label-sm text-primary-fixed mt-1">{genre.books} китоб</p>
      </div>
    </Link>
  );
}
