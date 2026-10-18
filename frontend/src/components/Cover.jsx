// Book cover: the book's picture (see covers.py), or a drawn manuscript-style cover when there is none.
const PALETTES = [
  ["#1b2a4a", "#ffc041"],
  ["#0e3b3a", "#4fdbc8"],
  ["#3a1f2b", "#fabc3e"],
  ["#22263f", "#71f8e4"],
  ["#2d2414", "#ffdea8"],
];

// Thin gold border. When the mouse is over the cover (or over a card around it with class "group") the cover
// lifts a little, the border and a soft glow turn gold, and a light shine sweeps across (.cover-shine in index.css).
// (classes are written out in full: Tailwind only finds class names that appear whole in the code)
const FRAME =
  "cover border border-primary/25 shadow-lg transition-[transform,box-shadow,border-color] duration-500 ease-out " +
  "hover:-translate-y-1 hover:border-primary/80 hover:shadow-[0_16px_36px_-12px_rgba(255,192,65,0.5)] " +
  "group-hover:-translate-y-1 group-hover:border-primary/80 group-hover:shadow-[0_16px_36px_-12px_rgba(255,192,65,0.5)]";

// frame={false} for decorative use (e.g. the blurred background of the player)
export default function Cover({ book, className = "", showTitle = true, frame = true }) {
  const frameClass = frame ? FRAME : "";

  // keep `absolute` from the caller, otherwise `relative` (for what is drawn inside)
  const position = className.includes("absolute") ? "" : "relative";

  if (book?.cover) {
    return (
      <div className={`${position} overflow-hidden ${frameClass} ${className}`}>
        <img src={book.cover} alt={book.title} loading="lazy" className="w-full h-full object-cover" />
        {frame && <span className="cover-shine" />}
      </div>
    );
  }

  const [background, accent] = PALETTES[(book?.id || 0) % PALETTES.length];
  return (
    <div
      className={`${position} overflow-hidden flex flex-col justify-end p-2 ${frameClass} ${className}`}
      style={{ background: `radial-gradient(circle at 50% 30%, ${accent}33, transparent 60%), ${background}` }}
    >
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 140" preserveAspectRatio="none">
        <g fill="none" stroke={accent} strokeWidth="0.6">
          <rect x="6" y="6" width="88" height="128" rx="4" />
          <path d="M50 22 L78 50 L50 78 L22 50 Z" />
          <circle cx="50" cy="50" r="14" />
          <path d="M50 30 L57 45 L72 50 L57 55 L50 70 L43 55 L28 50 L43 45 Z" />
        </g>
      </svg>
      {showTitle && (
        <div className="relative font-serif leading-tight">
          <p className="font-bold text-[13px]" style={{ color: accent }}>
            {book?.title}
          </p>
          <p className="text-[9px] text-[#e9e2d0] opacity-80">{book?.author?.name}</p>
        </div>
      )}
    </div>
  );
}
