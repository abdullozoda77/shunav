// Background of open books that turn their pages, each at its own moment (animation in index.css).

const GOLD = "#ffc041";
const TEAL = "#4fdbc8";

const COLUMNS = 8;
const ROWS = 4;

// Fixed positions and delays (not random), so the picture is the same on every render
const BOOKS = Array.from({ length: COLUMNS * ROWS }, (_, index) => {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return {
    left: `${column * (100 / COLUMNS) + (row % 2 ? 6 : 2)}%`, // every second row a bit to the right
    top: `${row * (100 / ROWS) + 6}%`,
    color: index % 3 === 0 ? TEAL : GOLD,
    delay: `${((index * 7) % 13) * 0.45}s`,
  };
});

function OpenBook({ color, delay }) {
  return (
    <svg width="44" height="31" viewBox="0 0 48 34" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      {/* left page */}
      <path d="M24 6C17 1 8 1 2 5v26c6-4 15-4 22 1z M8 11h10M8 16h10M8 21h8" />
      {/* right page: turns over to the left and back */}
      <g className="page-turn" style={{ animationDelay: delay }}>
        <path d="M24 6c7-5 16-5 22-1v26c-6-4-15-4-22 1z M30 11h10M30 16h10M30 21h8" />
      </g>
    </svg>
  );
}

export default function BooksBackground({ className = "" }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {BOOKS.map((book, index) => (
        <div key={index} className="absolute" style={{ left: book.left, top: book.top }}>
          <OpenBook color={book.color} delay={book.delay} />
        </div>
      ))}
    </div>
  );
}
