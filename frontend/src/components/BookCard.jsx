import { Link } from "react-router-dom";
import { formatDuration } from "../format.js";
import Cover from "./Cover.jsx";
import Icon from "./Icon.jsx";

// Small vertical card: cover, title, author, length
export default function BookCard({ book }) {
  return (
    <Link to={`/books/${book.id}`} className="w-36 shrink-0 snap-start flex flex-col gap-2 group">
      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-surface-container shadow-md">
        <Cover book={book} className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
        {book.reviews_count > 0 && (
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-[10px] flex items-center gap-0.5">
            <Icon name="star" filled size={11} className="text-primary" />
            {book.average_rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <h4 className="font-serif text-label-md truncate group-hover:text-primary">{book.title}</h4>
        <p className="text-label-sm text-on-surface-variant truncate">{book.author.name}</p>
        {book.total_duration > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-tertiary mt-0.5">
            <Icon name="schedule" size={13} />
            {formatDuration(book.total_duration)}
          </div>
        )}
      </div>
    </Link>
  );
}
