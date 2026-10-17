// Book cover: the book's picture (see covers.py), or a drawn manuscript-style cover when there is none.
const PALETTES = [
  ["#1b2a4a", "#ffc041"],
  ["#0e3b3a", "#4fdbc8"],
  ["#3a1f2b", "#fabc3e"],
  ["#22263f", "#71f8e4"],
  ["#2d2414", "#ffdea8"],
];

// Thin gold border; glows when the mouse is over the cover (or over a card around it with class "group")
const FRAME =
  "border border-primary/30 shadow-lg transition-all duration-300 " +
  "hover:border-primary hover:shadow-[0_0_28px_rgba(255,192,65,0.45)] hover:-translate-y-1 " +
  "group-hover:border-primary group-hover:shadow-[0_0_28px_rgba(255,192,65,0.45)] group-hover:-translate-y-1 group-hover:brightness-110";

// frame={false} for decorative use (e.g. the blurred background of the player)
export default function Cover({ book, className = "", showTitle = true, frame = true }) {
  const frameClass = frame ? FRAME : "";

  if (book?.cover) {
    return <img src={book.cover} alt={book.title} loading="lazy" className={`object-cover ${frameClass} ${className}`} />;
  }

  const [background, accent] = PALETTES[(book?.id || 0) % PALETTES.length];
  // keep `absolute` from the caller, otherwise `relative` (for the pattern inside)
  const position = className.includes("absolute") ? "" : "relative";
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
          <p className="text-[9px] text-tertiary-fixed opacity-80">{book?.author?.name}</p>
        </div>
      )}
    </div>
  );
}
