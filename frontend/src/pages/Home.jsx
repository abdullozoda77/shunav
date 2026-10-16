import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import BookCard from "../components/BookCard.jsx";
import Cover from "../components/Cover.jsx";
import Icon from "../components/Icon.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import Spinner from "../components/Spinner.jsx";
import { formatDuration, percent } from "../format.js";
import { useApi } from "../hooks.js";
import { usePlayer } from "../player.jsx";

const VERSES = [
  { text: "Бани одам аъзои якдигаранд, ки дар офариниш зи як гавҳаранд.", author: "Саъдии Шерозӣ" },
  { text: "Бӯи Ҷӯи Мӯлиён ояд ҳаме, ёди ёри меҳрубон ояд ҳаме.", author: "Рӯдакӣ" },
  { text: "Тавоно бувад ҳар ки доно бувад, зи дониш дили пир барно бувад.", author: "Фирдавсӣ" },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const player = usePlayer();
  const [categoryId, setCategoryId] = useState(null);
  const [search, setSearch] = useState("");

  const { data: continueList } = useApi(user ? "/me/continue" : null);
  const { data: categories } = useApi("/categories");
  const { data: newBooks, loading } = useApi(`/books?limit=10${categoryId ? `&category_id=${categoryId}` : ""}`);
  const { data: topBooks } = useApi("/books?sort=rating&limit=5");

  const featured = topBooks?.[0];
  const verse = VERSES[new Date().getDate() % VERSES.length]; // a new verse every day

  function submitSearch(event) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(search)}`);
  }

  return (
    <div className="px-4 pt-3 pb-8 flex flex-col gap-6">
      {/* Greeting */}
      <section className="flex flex-col gap-1">
        <h1 className="font-serif text-headline-lg-mobile tracking-tight">
          Салом{user ? `, ${user.name}` : ""} <span className="inline-block animate-bounce">👋</span>
        </h1>
        <p className="text-body-sm text-on-surface-variant">Имрӯз чиро мешунавед? Ҳикмат ва каломи наку интизор аст.</p>
      </section>

      {/* Search */}
      <form onSubmit={submitSearch} className="flex items-center w-full h-12 bg-surface-container-high rounded-xl px-3.5 shadow-md gap-3 focus-within:bg-surface-container-highest">
        <Icon name="search" size={22} className="text-primary" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full bg-transparent outline-none text-body-sm placeholder:text-outline"
          placeholder="Ҷустуҷӯи асар ё шоир..."
        />
        <Link to="/search" className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-secondary" aria-label="Филтрҳо">
          <Icon name="tune" size={20} />
        </Link>
      </form>

      {/* Continue listening */}
      {continueList?.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(79,219,200,0.6)]" />
            <h2 className="font-serif text-headline-sm">Идома додан</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
            {continueList.map(({ book, chapter, position_seconds }, index) => {
              const done = percent(position_seconds, chapter.duration_seconds);
              return (
                <div key={book.id} className="w-[82vw] max-w-[320px] shrink-0 snap-center bg-surface-container-high rounded-xl p-3.5 shadow-lg relative overflow-hidden">
                  <Link to={`/books/${book.id}`} className="flex items-start gap-3">
                    <Cover book={book} showTitle={false} className="w-14 h-[72px] rounded-lg shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-label-sm text-secondary">{book.category?.name}</span>
                      <h3 className="font-serif text-label-lg truncate">{book.title}</h3>
                      <p className="text-label-sm text-on-surface-variant truncate">{book.author.name}</p>
                      <p className="text-[12px] text-tertiary truncate mt-0.5">{chapter.title}</p>
                    </div>
                  </Link>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ProgressRing value={done} color={index % 2 ? "text-secondary" : "text-primary"} />
                      <span className="text-label-sm text-on-surface-variant">
                        {formatDuration(chapter.duration_seconds - position_seconds)} боқӣ монд
                      </span>
                    </div>
                    <button
                      onClick={() => player.playById(book.id, chapter.id, position_seconds)}
                      className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_0_12px_rgba(255,192,65,0.35)] active:scale-95"
                      aria-label="Идома додан"
                    >
                      <Icon name="play_arrow" filled size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {[{ id: null, name: "Ҳама" }, ...(categories || [])].map((category) => (
          <button
            key={category.name}
            onClick={() => setCategoryId(category.id)}
            className={`px-4 py-2 rounded-full text-label-md shrink-0 active:scale-95 ${
              categoryId === category.id
                ? "bg-primary text-on-primary font-bold shadow-[0_0_14px_rgba(255,192,65,0.3)]"
                : "bg-surface-container-high hover:text-primary"
            }`}
          >
            {category.name}
          </button>
        ))}
      </section>

      {/* Featured book */}
      {featured && !categoryId && (
        <section className="relative w-full rounded-2xl overflow-hidden bg-surface-container-low shadow-xl">
          <div className="relative w-full aspect-[16/9] overflow-hidden">
            <Cover book={featured} showTitle={false} className="w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/40 to-transparent" />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/90 text-on-primary text-label-sm font-bold">
              <Icon name="stars" filled size={15} /> Интихоби ҳафта
            </div>
            {featured.narrator && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high/90 text-secondary">
                <Icon name="record_voice_over" size={15} />
                <span className="text-[11px] font-semibold text-on-surface">{featured.narrator.name}</span>
              </div>
            )}
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div>
              <h3 className="font-serif text-headline-md">{featured.title}</h3>
              <p className="text-label-md text-primary">{featured.author.name}</p>
              <p className="text-body-sm text-on-surface-variant line-clamp-2 mt-1">{featured.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => player.playById(featured.id)}
                className="flex-1 h-12 bg-primary text-on-primary rounded-xl text-label-lg font-bold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,192,65,0.35)] active:scale-95"
              >
                <Icon name="play_circle" filled size={22} /> Гӯш кардан
              </button>
              <Link to={`/books/${featured.id}`} className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center hover:text-primary" aria-label="Рӯйхати бобҳо">
                <Icon name="format_list_bulleted" size={22} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* New books */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="auto_stories" size={20} className="text-primary" />
            <h2 className="font-serif text-headline-sm">Нав илова шуд</h2>
          </div>
          <Link to="/search" className="text-label-sm text-primary hover:underline flex items-center">
            Ҳама <Icon name="chevron_right" size={14} />
          </Link>
        </div>
        {loading ? (
          <Spinner />
        ) : newBooks?.length ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
            {newBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-on-surface-variant">Дар ин бахш ҳоло китоб нест.</p>
        )}
      </section>

      {/* Top rated */}
      {topBooks?.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon name="military_tech" size={20} className="text-secondary" />
            <h2 className="font-serif text-headline-sm">Беҳтаринҳо</h2>
          </div>
          <div className="flex flex-col gap-2">
            {topBooks.map((book, index) => (
              <div key={book.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-container hover:bg-surface-container-high">
                <Link to={`/books/${book.id}`} className="flex items-center gap-3 min-w-0">
                  <span className={`font-serif text-headline-sm font-bold w-5 text-center ${["text-primary", "text-secondary", "text-tertiary"][index] || "text-outline"}`}>
                    {index + 1}
                  </span>
                  <Cover book={book} showTitle={false} className="w-11 h-14 rounded-lg shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-serif text-label-lg truncate">{book.title}</h4>
                    <p className="text-label-sm text-on-surface-variant truncate">{book.author.name}</p>
                    <span className="flex items-center text-[11px] text-primary font-semibold mt-0.5">
                      <Icon name="star" filled size={12} className="mr-0.5" />
                      {book.average_rating.toFixed(1)}
                      <span className="text-outline font-normal ml-1">• {book.reviews_count} тақриз</span>
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => player.playById(book.id)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-primary bg-surface-container-high hover:bg-primary hover:text-on-primary shrink-0 ml-2"
                  aria-label="Гӯш кардан"
                >
                  <Icon name="play_arrow" filled size={20} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Verse of the day */}
      <section className="p-4 rounded-xl bg-gradient-to-r from-surface-container-high to-surface-container flex flex-col gap-2 shadow-md">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="format_quote" size={18} />
          <span className="text-label-sm uppercase tracking-wider font-bold">Байти рӯз</span>
        </div>
        <p className="font-serif text-verse italic">«{verse.text}»</p>
        <span className="text-label-sm text-secondary">— {verse.author}</span>
      </section>
    </div>
  );
}
