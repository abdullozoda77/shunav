// Background of small open books; in each one a page turns over in 3D around the spine, at its own moment.
// The look and the animation are in index.css (.mini-book, .mini-page, .turning-page).

const COLUMNS = 8;
const ROWS = 4;

// Fixed positions and delays (not random), so the picture is the same on every render
const BOOKS = Array.from({ length: COLUMNS * ROWS }, (_, index) => {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return {
    left: `${column * (100 / COLUMNS) + (row % 2 ? 6 : 2)}%`, // every second row a bit to the right
    top: `${row * (100 / ROWS) + 6}%`,
    color: index % 3 === 0 ? "teal" : "gold",
    delay: `${((index * 7) % 13) * 0.6}s`,
  };
});

export default function BooksBackground({ className = "", style }) {
  return (
    <div className={`books-background absolute inset-0 pointer-events-none overflow-hidden ${className}`} style={style}>
      {BOOKS.map((book, index) => (
        <div key={index} className={`mini-book mini-book-${book.color}`} style={{ left: book.left, top: book.top }}>
          <div className="mini-page mini-page-left" />
          <div className="mini-page mini-page-right" />
          <div className="mini-page mini-page-right turning-page" style={{ animationDelay: book.delay }} />
        </div>
      ))}
    </div>
  );
}
