import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import BookCard from "../components/BookCard.jsx";
import Cover from "../components/Cover.jsx";
import GenreCard from "../components/GenreCard.jsx";
import BooksBackground from "../components/BooksBackground.jsx";
import AuthorCarousel from "../components/AuthorCarousel.jsx";
import HeroCarousel from "../components/HeroCarousel.jsx";
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

const HERO_SECONDS = 6;

// Phones: a sideways-scrolling row. Wide screens: a normal grid.
const ROW = "flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory md:mx-0 md:px-0 md:grid md:overflow-visible md:gap-5";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const player = usePlayer();
  const [categoryId, setCategoryId] = useState(null);
  const [search, setSearch] = useState("");

  const { data: continueList } = useApi(user ? "/me/continue" : null);
  const { data: categories } = useApi("/categories");
  const { data: newBooks, loading } = useApi(`/books?page_size=12${categoryId ? `&category_id=${categoryId}` : ""}`);
  const { data: topBooks } = useApi("/books?sort_by=rating&order=desc&page_size=5");
  const { data: stats } = useApi("/stats");
  const { data: heroBooks } = useApi("/books?sort_by=rating&order=desc&page_size=50");
  const { data: allAuthors } = useApi("/authors?sort_by=birth_year&order=asc&page_size=100");
  const authors = allAuthors?.filter((author) => author.photo); // oldest first, only those with a portrait

  // the banner shows one book at a time and moves on by itself (it waits while the mouse is over it)
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  // a new timer after every change, so clicking an arrow is not followed by a quick jump
  useEffect(() => {
    if (heroPaused || !heroBooks?.length) return;
    const timer = setTimeout(() => setHeroIndex((index) => (index + 1) % heroBooks.length), HERO_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [heroPaused, heroBooks, heroIndex]);

  const featured = heroBooks?.[heroIndex];
  const verse = VERSES[new Date().getDate() % VERSES.length]; // a new verse every day

  function submitSearch(event) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(search)}`);
  }

  return (
    <div className="px-4 md:px-8 pt-3 md:pt-8 pb-8 flex flex-col gap-6 md:gap-12">
      {/* Hero: greeting + featured book */}
      <section
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        className="relative md:rounded-3xl md:overflow-hidden md:bg-surface-container-low md:p-10 lg:p-14 md:shadow-2xl">
        {/* background: the current book's painting, blurred, slowly drifting; it fades into the next book's */}
        <div className="hidden md:block absolute inset-0 pointer-events-none overflow-hidden">
          {heroBooks?.map((book, index) =>
            book.cover ? (
              <img
                key={book.id}
                src={book.cover}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-xl animate-drift transition-opacity duration-1000"
                style={{ opacity: index === heroIndex ? 0.45 : 0 }}
              />
            ) : null
          )}
          {/* darker on the left, so the text stays easy to read */}
          <div className="absolute inset-0 bg-gradient-to-r from-surface-container-low via-surface-container-low/85 to-surface-container-low/40" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_45%,rgba(255,192,65,0.16),transparent_60%)]" />
          <BooksBackground className="opacity-[0.14]" />
        </div>

        <div className="relative grid md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-center">
          <div className="flex flex-col gap-4 md:gap-5">
            <div>
              <h1 className="font-serif text-headline-lg-mobile md:text-[44px] md:leading-[52px] font-semibold tracking-tight">
                Салом{user ? `, ${user.name}` : ""} <span className="inline-block animate-bounce">👋</span>
              </h1>
              <p className="text-body-sm md:text-body-md text-on-surface-variant mt-1 md:mt-3 max-w-xl">
                Имрӯз чиро мешунавед? Классикони форсу тоҷик — аз Рӯдакӣ то Айнӣ — бо овоз ва матн, ройгон.
              </p>
            </div>

            <form onSubmit={submitSearch} className="flex items-center w-full max-w-xl h-12 md:h-14 bg-surface-container-high rounded-xl px-3.5 shadow-md gap-3 focus-within:bg-surface-container-highest">
              <Icon name="search" size={22} className="text-primary" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent outline-none text-body-sm md:text-body-md placeholder:text-outline"
                placeholder="Ҷустуҷӯи асар ё шоир..."
              />
              <button className="hidden md:block h-10 px-5 rounded-lg bg-primary text-on-primary text-label-md font-bold">Ёфтан</button>
            </form>

            {/* featured book: a card on phones, part of the hero on wide screens */}
            {featured && (
              <div key={featured.id} className="animate-fade-up rounded-2xl overflow-hidden bg-surface-container-low md:bg-transparent shadow-xl md:shadow-none mt-2">
                <div className="relative aspect-[16/9] md:hidden overflow-hidden">
                  <Cover book={featured} showTitle={false} frame={false} className="w-full h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/40 to-transparent" />
                </div>
                <div className="p-4 md:p-0 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/90 text-on-primary text-label-sm font-bold">
                      <Icon name="auto_stories" filled size={15} /> Китоби {heroIndex + 1} аз {heroBooks.length}
                    </span>
                    {featured.narrator && (
                      <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-label-sm">
                        <Icon name="record_voice_over" size={15} className="text-secondary" /> {featured.narrator.name}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="font-serif text-headline-md md:text-[32px] md:leading-[40px] font-semibold">{featured.title}</h2>
                    <p className="text-label-md md:text-label-lg text-primary">{featured.author.name}</p>
                    <p className="text-body-sm md:text-body-md text-on-surface-variant line-clamp-2 mt-1 max-w-xl">{featured.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => player.playById(featured.id)}
                      className="flex-1 md:flex-none md:px-8 h-12 bg-primary text-on-primary rounded-xl text-label-lg font-bold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,192,65,0.35)] hover:brightness-110 active:scale-95"
                    >
                      <Icon name="play_circle" filled size={22} /> Гӯш кардан
                    </button>
                    <Link to={`/books/${featured.id}`} className="h-12 px-5 rounded-xl bg-surface-container-high hover:bg-surface-bright flex items-center justify-center gap-2 text-label-lg">
                      <Icon name="format_list_bulleted" size={22} />
                      <span className="hidden sm:inline">Мундариҷа</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* all books as a turning fan (wide screens) */}
          {heroBooks?.length > 0 && <HeroCarousel books={heroBooks} current={heroIndex} onChange={setHeroIndex} />}
        </div>
      </section>

      {/* Continue listening */}
      {continueList?.length > 0 && (
        <section className="flex flex-col gap-3 md:gap-5">
          <SectionTitle dot title="Идома додан" link="/library" linkText="Китобхона" />
          <div className={`${ROW} md:grid-cols-2 lg:grid-cols-3`}>
            {continueList.slice(0, 6).map(({ book, chapter, position_seconds }, index) => (
              <div key={book.id} className="group w-[82vw] max-w-[320px] md:w-auto md:max-w-none shrink-0 snap-center bg-surface-container-high rounded-xl p-3.5 md:p-5 shadow-lg hover:bg-surface-container-highest transition-colors">
                <Link to={`/books/${book.id}`} className="flex items-start gap-3 md:gap-4">
                  <Cover book={book} showTitle={false} className="w-14 h-[72px] md:w-16 md:h-[84px] rounded-lg shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-label-sm text-secondary">{book.category?.name}</span>
                    <h3 className="font-serif text-label-lg md:text-headline-sm truncate">{book.title}</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">{book.author.name}</p>
                    <p className="text-[12px] text-tertiary truncate mt-0.5">{chapter.title}</p>
                  </div>
                </Link>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ProgressRing value={percent(position_seconds, chapter.duration_seconds)} color={index % 2 ? "text-secondary" : "text-primary"} />
                    <span className="text-label-sm text-on-surface-variant">{formatDuration(chapter.duration_seconds - position_seconds)} боқӣ монд</span>
                  </div>
                  <button
                    onClick={() => player.playById(book.id, chapter.id, position_seconds)}
                    className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_0_12px_rgba(255,192,65,0.35)] hover:brightness-110 active:scale-95"
                    aria-label="Идома додан"
                  >
                    <Icon name="play_arrow" filled size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories + new books */}
      <section className="flex flex-col gap-4 md:gap-5">
        <SectionTitle icon="auto_stories" title="Нав илова шуд" link="/search" linkText="Ҳама" />
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
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
        </div>
        {loading ? (
          <Spinner />
        ) : newBooks?.length ? (
          <div className={`${ROW} md:grid-cols-4 lg:grid-cols-6`}>
            {newBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-on-surface-variant">Дар ин бахш ҳоло китоб нест.</p>
        )}
      </section>

      {/* Top rated + verse of the day */}
      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
          {topBooks?.length > 0 && (
          <section className="flex flex-col gap-3 md:gap-5">
            <SectionTitle icon="military_tech" iconColor="text-secondary" title="Беҳтаринҳо" />
            <div className="grid md:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
              {topBooks.map((book, index) => (
                <div key={book.id} className="group flex items-center justify-between p-3 md:p-4 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
                  <Link to={`/books/${book.id}`} className="flex items-center gap-3 md:gap-4 min-w-0">
                    <span className={`font-serif text-headline-sm font-bold w-6 text-center ${["text-primary", "text-secondary", "text-tertiary"][index] || "text-outline"}`}>
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
                        {book.total_duration > 0 && <span className="text-outline font-normal ml-1">• {formatDuration(book.total_duration)}</span>}
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

          {/* the library in numbers */}
          {stats && (
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: "auto_stories", value: stats.books, label: "китоб", color: "text-primary" },
                { icon: "history_edu", value: stats.authors, label: "муаллиф", color: "text-secondary" },
                { icon: "menu_book", value: stats.chapters, label: "боб", color: "text-primary" },
                { icon: "headphones", value: formatDuration(stats.audio_seconds), label: "аудио", color: "text-secondary" },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-2xl bg-surface-container flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                    <Icon name={item.icon} size={22} className={item.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-headline-sm leading-none truncate">{item.value}</p>
                    <p className="text-label-sm text-on-surface-variant mt-1">{item.label}</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* genres: an emblem and a colour each */}
          {stats?.genres.length > 0 && (
            <section className="flex flex-col gap-3 md:gap-5">
              <SectionTitle icon="category" iconColor="text-secondary" title="Жанрҳо" link="/search" linkText="Ҳама китобҳо" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.genres.map((genre) => (
                  <GenreCard key={genre.id} genre={genre} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:pt-14">
          <section className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-surface-container-high to-surface-container flex flex-col gap-3 shadow-md relative overflow-hidden">
            <Icon name="format_quote" size={96} className="absolute -right-3 -bottom-4 text-surface-container-highest/60" />
            <div className="flex items-center gap-2 text-primary">
              <Icon name="format_quote" size={18} />
              <span className="text-label-sm uppercase tracking-wider font-bold">Байти рӯз</span>
            </div>
            <p className="relative font-serif text-verse md:text-[20px] md:leading-[36px] italic">«{verse.text}»</p>
            <span className="relative text-label-sm text-secondary">— {verse.author}</span>
          </section>

          {authors?.length > 0 && <AuthorCarousel authors={authors} />}

          {!user && (
            <section className="p-5 md:p-6 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col gap-3">
              <h3 className="font-serif text-headline-sm">Аз ҳамон ҷо давом диҳед</h3>
              <p className="text-body-sm text-on-surface-variant">Ворид шавед, то пешрафт, хатчӯбҳо ва китобҳои дилхоҳи шумо нигоҳ дошта шаванд.</p>
              <Link to="/register" className="h-11 rounded-xl bg-primary text-on-primary text-label-lg flex items-center justify-center">Сабти ном</Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ title, icon, iconColor = "text-primary", dot, link, linkText }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {dot && <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(79,219,200,0.6)]" />}
        {icon && <Icon name={icon} size={22} className={iconColor} />}
        <h2 className="font-serif text-headline-sm md:text-headline-md">{title}</h2>
      </div>
      {link && (
        <Link to={link} className="text-label-sm md:text-label-md text-primary hover:underline flex items-center">
          {linkText} <Icon name="chevron_right" size={16} />
        </Link>
      )}
    </div>
  );
}
