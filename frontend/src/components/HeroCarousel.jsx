import { Link } from "react-router-dom";
import Cover from "./Cover.jsx";
import Icon from "./Icon.jsx";

// Where a book stands, by its distance from the current one: -1 = left, 0 = middle, 1 = right.
// Books further away wait hidden behind the side ones, so the next one slides in smoothly.
const PLACES = {
  "-2": { x: -150, rotate: -20, scale: 0.75, opacity: 0, z: 0 },
  "-1": { x: -120, rotate: -12, scale: 0.88, opacity: 0.85, z: 10 },
  0: { x: 0, rotate: 0, scale: 1, opacity: 1, z: 20 },
  1: { x: 120, rotate: 12, scale: 0.88, opacity: 0.85, z: 10 },
  2: { x: 150, rotate: 20, scale: 0.75, opacity: 0, z: 0 },
};

// -1, 0, 1 for the visible books; ±2 for the rest (the list goes round: after the last comes the first)
function distance(bookIndex, current, count) {
  let d = (bookIndex - current + count) % count;
  if (d > count / 2) d -= count;
  return Math.max(-2, Math.min(2, d));
}

// All books as a fan of three; the middle one is the current book.
export default function HeroCarousel({ books, current, onChange }) {
  const count = books.length;
  const go = (index) => onChange((index + count) % count);

  return (
    <div className="hidden md:flex flex-col items-center gap-6">
      <div className="relative w-[340px] lg:w-[420px] h-[340px] lg:h-[400px] flex items-center justify-center">
        <div className="absolute w-72 h-72 rounded-full bg-primary/15 blur-3xl" />

        {books.map((book, index) => {
          const d = distance(index, current, count);
          const place = PLACES[d];
          const isCurrent = d === 0;

          return (
            <div
              key={book.id}
              className="absolute transition-all duration-700 ease-out"
              style={{
                transform: `translateX(${place.x}px) rotate(${place.rotate}deg) scale(${place.scale})`,
                opacity: place.opacity,
                zIndex: place.z,
                pointerEvents: place.opacity ? "auto" : "none",
              }}
            >
              {isCurrent ? (
                <Link to={`/books/${book.id}`} aria-label={book.title}>
                  <Cover book={book} className="w-48 lg:w-56 aspect-[3/4.4] rounded-xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.85)]" />
                </Link>
              ) : (
                // a side book: click it to bring it to the middle
                <button onClick={() => go(index)} aria-label={book.title}>
                  <Cover book={book} className="w-48 lg:w-56 aspect-[3/4.4] rounded-xl shadow-2xl" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* arrows and dots */}
      <div className="flex items-center gap-3">
        <button onClick={() => go(current - 1)} className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-bright flex items-center justify-center" aria-label="Китоби қаблӣ">
          <Icon name="chevron_left" size={20} />
        </button>
        <div className="flex items-center gap-1.5">
          {books.map((book, index) => (
            <button
              key={book.id}
              onClick={() => go(index)}
              aria-label={book.title}
              className={`h-2 rounded-full transition-all duration-300 ${index === current ? "w-7 bg-primary" : "w-2 bg-surface-variant hover:bg-outline"}`}
            />
          ))}
        </div>
        <button onClick={() => go(current + 1)} className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-bright flex items-center justify-center" aria-label="Китоби навбатӣ">
          <Icon name="chevron_right" size={20} />
        </button>
      </div>
    </div>
  );
}
