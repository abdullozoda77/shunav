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
import { useT } from "../i18n.jsx";

// `author` is the full name as in the database, so the verse can show the author's 3D portrait
const VERSES = [
  { text: "Бани одам аъзои якдигаранд, ки дар офариниш зи як гавҳаранд.", author: "Саъдии Шерозӣ" },
  { text: "Бӯи Ҷӯи Мӯлиён ояд ҳаме, ёди ёри меҳрубон ояд ҳаме.", author: "Абӯабдуллоҳи Рӯдакӣ" },
  { text: "Тавоно бувад ҳар ки доно бувад, зи дониш дили пир барно бувад.", author: "Абулқосим Фирдавсӣ" },
  { text: "Ин қофилаи умр аҷаб мегузарад, дарёб даме, ки бо тараб мегузарад.", author: "Умари Хайём" },
  { text: "Агар он турки шерозӣ ба даст орад дили моро, ба холи ҳиндуяш бахшам Самарқанду Бухороро.", author: "Ҳофизи Шерозӣ" },
  { text: "Бишнав аз най чун ҳикоят мекунад, аз ҷудоиҳо шикоят мекунад.", author: "Ҷалолиддини Балхӣ (Румӣ)" },
];

const HERO_SECONDS = 6;

// Phones: a sideways-scrolling row. Wide screens: a normal grid.
const ROW = "flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory md:mx-0 md:px-0 md:grid md:overflow-visible md:gap-5";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const player = usePlayer();
  const t = useT();
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
  const verseAuthor = allAuthors?.find((author) => author.name === verse.author);

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
          <BooksBackground className="opacity-[0.14]" style={{ maskImage: "linear-gradient(to right, transparent 35%, black 75%)" }} />
        </div>

        <div className="relative grid md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-center">
          <div className="flex flex-col gap-6 md:gap-7 min-w-0">
            {/* greeting and search */}
            <div className="flex flex-col gap-3">
              <span className="flex items-center gap-2 text-label-sm uppercase tracking-[0.2em] text-primary">
                <span className="w-6 h-px bg-primary" /> {t("Китобхонаи савтӣ")}
              </span>
              <h1 className="font-serif font-semibold tracking-tight">
                <span className="block text-headline-sm md:text-[26px] md:leading-[34px] text-on-surface-variant font-normal">
                  {user ? `${t("Салом")},` : t("Хуш омадед")}
                </span>
                <span className="block text-headline-lg-mobile md:text-[46px] md:leading-[54px] text-primary">
                  {user ? user.name : t("Шунав")}
                </span>
              </h1>
              <p className="text-body-sm md:text-body-md text-on-surface-variant max-w-lg">
                {t("Классикони форсу тоҷик — аз Рӯдакӣ то Айнӣ — бо матни пурра ва овоз.")}
              </p>
            </div>

            <form onSubmit={submitSearch} className="flex items-center w-full max-w-lg h-12 md:h-14 bg-surface-container-lowest/70 backdrop-blur-md border border-line/10 rounded-2xl pl-4 pr-1.5 gap-3 focus-within:border-primary/60 transition-colors">
              <Icon name="search" size={22} className="text-primary" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent outline-none text-body-sm md:text-body-md placeholder:text-outline"
                placeholder={t("Ҷустуҷӯи асар ё шоир...")}
              />
              <button className="hidden md:flex items-center gap-1.5 h-10 md:h-11 px-5 rounded-xl bg-primary text-on-primary text-label-md font-bold hover:brightness-110">
                {t("Ёфтан")} <Icon name="arrow_forward" size={18} />
              </button>
            </form>

            {/* the current book of the banner, in a glass card */}
            {featured && (
              <div className="relative max-w-lg rounded-2xl overflow-hidden bg-surface-container-lowest/60 backdrop-blur-md border border-line/10 shadow-xl">
                {/* phones: the cover on top (wide screens see it in the fan) */}
                <div className="relative aspect-[16/9] md:hidden overflow-hidden">
                  <Cover book={featured} showTitle={false} frame={false} className="w-full h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent" />
                </div>

                <div key={featured.id} className="animate-fade-up p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-label-sm">
                    <span className="flex items-center gap-1.5 text-primary uppercase tracking-wider">
                      <Icon name="auto_stories" filled size={15} /> {t("Китоб")}
                    </span>
                    <span className="text-on-surface-variant">
                      {heroIndex + 1} / {heroBooks.length}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-serif text-headline-md md:text-[30px] md:leading-[38px] font-semibold">{featured.title}</h2>
                    <p className="text-label-lg text-primary mt-0.5">{t(featured.author.name)}</p>
                  </div>

                  {/* details */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label-md text-on-surface-variant">
                    {featured.category && (
                      <span className="flex items-center gap-1">
                        <Icon name="category" size={16} className="text-secondary" /> {t(featured.category.name)}
                      </span>
                    )}
                    {featured.total_duration > 0 && (
                      <span className="flex items-center gap-1">
                        <Icon name="schedule" size={16} className="text-secondary" /> {formatDuration(featured.total_duration)}
                      </span>
                    )}
                    {featured.reviews_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Icon name="star" filled size={16} className="text-primary" /> {featured.average_rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <p className="text-body-sm text-on-surface-variant line-clamp-2">{t(featured.description)}</p>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => player.playById(featured.id)}
                      className="flex-1 h-11 bg-primary text-on-primary rounded-xl text-label-lg font-bold flex items-center justify-center gap-2 shadow-[0_6px_20px_-6px_rgba(255,192,65,0.6)] hover:brightness-110 active:scale-95"
                    >
                      <Icon name="play_circle" filled size={22} /> {t("Гӯш кардан")}
                    </button>
                    <Link
                      to={`/books/${featured.id}`}
                      className="flex-1 h-11 rounded-xl border border-line/15 hover:border-primary/60 hover:text-primary flex items-center justify-center gap-2 text-label-lg"
                    >
                      <Icon name="auto_stories" size={20} /> {t("Хондан")}
                    </Link>
                  </div>
                </div>

                {/* fills up until the banner turns to the next book (waits while paused) */}
                <div className="h-0.5 bg-line/5">
                  <div
                    key={heroIndex}
                    className="h-full bg-primary hero-progress"
                    style={{ animationDuration: `${HERO_SECONDS}s`, animationPlayState: heroPaused ? "paused" : "running" }}
                  />
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
          <SectionTitle dot title={t("Идома додан")} link="/library" linkText={t("Китобхона")} />
          <div className={`${ROW} md:grid-cols-2 lg:grid-cols-3`}>
            {continueList.slice(0, 6).map(({ book, chapter, position_seconds }, index) => (
              <div key={book.id} className="group w-[82vw] max-w-[320px] md:w-auto md:max-w-none shrink-0 snap-center bg-surface-container-high rounded-xl p-3.5 md:p-5 shadow-lg hover:bg-surface-container-highest transition-colors">
                <Link to={`/books/${book.id}`} className="flex items-start gap-3 md:gap-4">
                  <Cover book={book} showTitle={false} className="w-14 h-[72px] md:w-16 md:h-[84px] rounded-lg shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-label-sm text-secondary">{book.category && t(book.category.name)}</span>
                    <h3 className="font-serif text-label-lg md:text-headline-sm truncate">{book.title}</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">{t(book.author.name)}</p>
                    <p className="text-[12px] text-tertiary truncate mt-0.5">{chapter.title}</p>
                  </div>
                </Link>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ProgressRing value={percent(position_seconds, chapter.duration_seconds)} color={index % 2 ? "text-secondary" : "text-primary"} />
                    <span className="text-label-sm text-on-surface-variant">{t("{time} боқӣ монд", { time: formatDuration(chapter.duration_seconds - position_seconds) })}</span>
                  </div>
                  <button
                    onClick={() => player.playById(book.id, chapter.id, position_seconds)}
                    className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_0_12px_rgba(255,192,65,0.35)] hover:brightness-110 active:scale-95"
                    aria-label={t("Идома додан")}
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
        <SectionTitle icon="auto_stories" title={t("Нав илова шуд")} link="/search" linkText={t("Ҳама")} />
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
              {t(category.name)}
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
          <p className="text-body-sm text-on-surface-variant">{t("Дар ин бахш ҳоло китоб нест.")}</p>
        )}
      </section>

      {/* Top rated + verse of the day */}
      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
          {topBooks?.length > 0 && (
          <section className="flex flex-col gap-3 md:gap-5">
            <SectionTitle icon="military_tech" iconColor="text-secondary" title={t("Беҳтаринҳо")} />
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
                      <p className="text-label-sm text-on-surface-variant truncate">{t(book.author.name)}</p>
                      <span className="flex items-center text-[11px] text-primary font-semibold mt-0.5">
                        <Icon name="star" filled size={12} className="mr-0.5" />
                        {book.average_rating.toFixed(1)}
                        <span className="text-outline font-normal ml-1">• {t("{n} тақриз", { n: book.reviews_count })}</span>
                        {book.total_duration > 0 && <span className="text-outline font-normal ml-1">• {formatDuration(book.total_duration)}</span>}
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={() => player.playById(book.id)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-primary bg-surface-container-high hover:bg-primary hover:text-on-primary shrink-0 ml-2"
                    aria-label={t("Гӯш кардан")}
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
                { icon: "auto_stories", value: stats.books, label: t("китоб"), color: "text-primary" },
                { icon: "history_edu", value: stats.authors, label: t("муаллиф"), color: "text-secondary" },
                { icon: "menu_book", value: stats.chapters, label: t("боб"), color: "text-primary" },
                { icon: "headphones", value: formatDuration(stats.audio_seconds), label: t("аудио"), color: "text-secondary" },
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
              <SectionTitle icon="category" iconColor="text-secondary" title={t("Жанрҳо")} link="/search" linkText={t("Ҳама китобҳо")} />
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
            <div className="flex items-center gap-2 text-primary">
              <Icon name="format_quote" size={18} />
              <span className="text-label-sm uppercase tracking-wider font-bold">{t("Байти рӯз")}</span>
            </div>
            <p className="relative font-serif text-verse md:text-[20px] md:leading-[36px] italic">«{verse.text}»</p>
            {/* the author: small 3D portrait in an arch, like in the authors section */}
            <div className="flex items-center gap-3 mt-1">
              {verseAuthor?.photo && (
                <img
                  src={verseAuthor.photo}
                  alt={verse.author}
                  className="w-11 h-14 object-cover rounded-t-full rounded-b-lg border border-primary/50 shadow-md"
                />
              )}
              <div className="min-w-0">
                <p className="text-label-md text-secondary truncate">{t(verse.author)}</p>
                {verseAuthor?.birth_year && (
                  <p className="text-label-sm text-on-surface-variant">
                    {verseAuthor.birth_year}–{verseAuthor.death_year}
                  </p>
                )}
              </div>
            </div>
          </section>

          {authors?.length > 0 && <AuthorCarousel authors={authors} />}

          {!user && (
            <section className="p-5 md:p-6 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col gap-3">
              <h3 className="font-serif text-headline-sm">{t("Аз ҳамон ҷо давом диҳед")}</h3>
              <p className="text-body-sm text-on-surface-variant">{t("Ворид шавед, то пешрафт, хатчӯбҳо ва китобҳои дилхоҳи шумо нигоҳ дошта шаванд.")}</p>
              <Link to="/register" className="h-11 rounded-xl bg-primary text-on-primary text-label-lg flex items-center justify-center">{t("Сабти ном")}</Link>
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
        <Link to={link} className="text-label-sm md:text-label-md text-primary hover:opacity-75 transition-opacity flex items-center">
          {linkText} <Icon name="chevron_right" size={16} />
        </Link>
      )}
    </div>
  );
}
