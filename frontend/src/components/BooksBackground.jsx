// Background made of thin book drawings: a tiled pattern that slowly drifts, plus a few bigger books floating.

const GOLD = "#fabc3e";
const TEAL = "#4fdbc8";

// One 160×160 tile with four little drawings: a closed book, an open book, a stack of books and a quill
const TILE = `
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <g stroke="${GOLD}" stroke-width="1.2">
    <rect x="18" y="16" width="26" height="34" rx="2"/>
    <path d="M22 16v34M30 26h10M30 31h8"/>
  </g>
  <g stroke="${TEAL}" stroke-width="1.2">
    <path d="M96 30c8-5 18-5 24 0v26c-6-5-16-5-24 0zM120 30c6-5 16-5 24 0v26c-8-5-18-5-24 0z"/>
  </g>
  <g stroke="${TEAL}" stroke-width="1.2">
    <rect x="22" y="108" width="40" height="8" rx="1.5"/>
    <rect x="26" y="100" width="34" height="8" rx="1.5"/>
    <rect x="20" y="116" width="44" height="8" rx="1.5"/>
  </g>
  <g stroke="${GOLD}" stroke-width="1.2">
    <path d="M136 96c-14 6-24 18-28 34l6-2c4-14 12-24 22-32zM108 130l-4 8"/>
  </g>
</svg>`;

const TILE_URL = `url("data:image/svg+xml,${encodeURIComponent(TILE)}")`;

// The bigger floating books: where they are, how big, and a delay so they do not move together
const FLOATING = [
  { left: "8%", top: "18%", size: 46, delay: "0s", color: GOLD },
  { left: "42%", top: "70%", size: 38, delay: "2s", color: TEAL },
  { left: "88%", top: "12%", size: 52, delay: "4s", color: GOLD },
  { left: "70%", top: "78%", size: 34, delay: "1s", color: TEAL },
  { left: "25%", top: "84%", size: 30, delay: "3s", color: GOLD },
];

function OpenBook({ size, color }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 48 34" fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round">
      <path d="M24 6C17 1 8 1 2 5v26c6-4 15-4 22 1 7-5 16-5 22-1V5c-6-4-15-4-22 1z" />
      <path d="M24 6v26M8 11h10M8 16h10M30 11h10M30 16h10" strokeLinecap="round" />
    </svg>
  );
}

export default function BooksBackground({ className = "" }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <div className="absolute -inset-[160px] animate-pattern-drift" style={{ backgroundImage: TILE_URL, backgroundSize: "160px 160px" }} />
      {FLOATING.map((book, index) => (
        <div key={index} className="absolute animate-float opacity-70" style={{ left: book.left, top: book.top, animationDelay: book.delay }}>
          <OpenBook size={book.size} color={book.color} />
        </div>
      ))}
    </div>
  );
}
