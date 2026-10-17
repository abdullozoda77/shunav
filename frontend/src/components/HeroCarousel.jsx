import { Link } from "react-router-dom";
import Cover from "./Cover.jsx";
import { fanDistance, fanStyle } from "./fan.js";
import Icon from "./Icon.jsx";

// All books as a fan of three; the middle one is the current book.
export default function HeroCarousel({ books, current, onChange }) {
  const count = books.length;
  const go = (index) => onChange((index + count) % count);

  return (
    <div className="hidden md:flex flex-col items-center gap-6">
      {/* perspective makes the turned side books look 3D */}
      <div className="relative w-[340px] lg:w-[420px] h-[340px] lg:h-[400px] flex items-center justify-center" style={{ perspective: 1100 }}>
        <div className="absolute w-72 h-72 rounded-full bg-primary/15 blur-3xl" />

        {books.map((book, index) => {
          const d = fanDistance(index, current, count);
          const isCurrent = d === 0;

          return (
            <div key={book.id} className="absolute" style={fanStyle(d, 125)}>
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
