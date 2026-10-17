import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fanDistance, fanStyle } from "./fan.js";
import Icon from "./Icon.jsx";

const SECONDS = 5;

// Authors with their portraits, oldest first, turning by themselves (they wait while the mouse is over them).
export default function AuthorCarousel({ authors }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = authors.length;
  const go = (index) => setCurrent((index + count) % count);

  // next author after SECONDS; starts again after every change, so a click is not followed by a quick jump
  useEffect(() => {
    if (paused || count < 2) return;
    const timer = setTimeout(() => setCurrent((index) => (index + 1) % count), SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [paused, count, current]);

  const author = authors[current];

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="p-5 md:p-6 rounded-2xl bg-gradient-to-b from-surface-container-high to-surface-container shadow-md overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="history_edu" size={18} />
          <span className="text-label-sm uppercase tracking-wider font-bold">Муаллифон</span>
        </div>
        <span className="text-label-sm text-on-surface-variant">
          {current + 1} / {count}
        </span>
      </div>

      {/* portraits */}
      <div className="relative h-56 flex items-center justify-center" style={{ perspective: 900 }}>
        <div className="absolute w-40 h-40 rounded-full bg-primary/15 blur-2xl" />
        {authors.map((item, index) => {
          return (
            <button key={item.id} onClick={() => go(index)} aria-label={item.name} className="absolute" style={fanStyle(fanDistance(index, current, count), 92)}>
              {/* arch-shaped frame, like a window in old Persian buildings */}
              <img
                src={item.photo}
                alt={item.name}
                loading="lazy"
                className="w-32 h-40 object-cover rounded-t-full rounded-b-2xl border-2 border-primary/40 shadow-xl transition-all duration-300 hover:border-primary hover:shadow-[0_0_28px_rgba(255,192,65,0.45)]"
              />
            </button>
          );
        })}
      </div>

      {/* about the current author */}
      <div key={author.id} className="animate-fade-up text-center mt-2">
        <h3 className="font-serif text-headline-sm">{author.name}</h3>
        {author.birth_year && (
          <p className="text-label-md text-primary">
            {author.birth_year}–{author.death_year}
          </p>
        )}
        {author.bio && <p className="text-body-sm text-on-surface-variant mt-2 line-clamp-2">{author.bio}</p>}
        <Link
          to={`/search?author_id=${author.id}`}
          className="inline-flex items-center gap-1 mt-3 text-label-md text-secondary hover:underline"
        >
          {author.books_count ? `${author.books_count} китоб` : "Китобҳо ба наздикӣ"}
          <Icon name="chevron_right" size={16} />
        </Link>
        {author.photo_credit && <p className="text-[10px] text-outline mt-2">{author.photo_credit}</p>}
      </div>

      {/* arrows and dots */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <button onClick={() => go(current - 1)} className="w-8 h-8 rounded-full bg-surface-container-highest hover:bg-surface-bright flex items-center justify-center" aria-label="Муаллифи қаблӣ">
          <Icon name="chevron_left" size={18} />
        </button>
        <div className="flex gap-1.5">
          {authors.map((item, index) => (
            <button
              key={item.id}
              onClick={() => go(index)}
              aria-label={item.name}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === current ? "w-6 bg-primary" : "w-1.5 bg-surface-variant hover:bg-outline"}`}
            />
          ))}
        </div>
        <button onClick={() => go(current + 1)} className="w-8 h-8 rounded-full bg-surface-container-highest hover:bg-surface-bright flex items-center justify-center" aria-label="Муаллифи навбатӣ">
          <Icon name="chevron_right" size={18} />
        </button>
      </div>
    </section>
  );
}
