import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import Cover from "../components/Cover.jsx";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import Icon from "../components/Icon.jsx";
import MiniPlayer from "../components/MiniPlayer.jsx";
import Modal from "../components/Modal.jsx";
import Spinner from "../components/Spinner.jsx";
import Stars from "../components/Stars.jsx";
import { formatClock, formatDuration, percent, timeAgo } from "../format.js";
import { useApi } from "../hooks.js";
import { usePlayer } from "../player.jsx";

const LICENSES = {
  public_domain: "Мулки ҷамъиятӣ (Public Domain) — бепул ва кушода",
  creative_commons: "Creative Commons — бо иҷозати муаллиф",
  licensed: "Бо шартномаи нашриёт",
};

const SHOWN_CHAPTERS = 4;
const FINISHED_GAP = 10; // the same rule as the backend: under 10 s left = finished

export default function Book() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const player = usePlayer();

  const { data: book, loading, error } = useApi(`/books/${id}`);
  const { data: reviews, reload: reloadReviews } = useApi(`/books/${id}/reviews`);
  const { data: progressList } = useApi(user ? `/books/${id}/progress` : null);
  const { data: favorites, reload: reloadFavorites } = useApi(user ? "/me/favorites" : null);

  const [showAllChapters, setShowAllChapters] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [modal, setModal] = useState(null); // "review" | "report" | null

  if (loading)
    return (
      <Page>
        <Spinner />
      </Page>
    );
  if (error || !book)
    return (
      <Page>
        <p className="p-6 text-center text-on-surface-variant">Китоб ёфт нашуд.</p>
      </Page>
    );

  // position in each chapter: { chapterId: seconds }
  const positions = {};
  for (const row of progressList || []) positions[row.chapter_id] = row.position_seconds;

  const isFinished = (chapter) => chapter.duration_seconds > 0 && (positions[chapter.id] || 0) >= chapter.duration_seconds - FINISHED_GAP;
  const listened = book.chapters.reduce((sum, chapter) => sum + Math.min(positions[chapter.id] || 0, chapter.duration_seconds), 0);
  const bookPercent = percent(listened, book.total_duration);

  // where "Listen" starts: the first unfinished chapter with audio, from the saved place
  const withAudio = book.chapters.filter((chapter) => chapter.audio_file);
  const resumeChapter = withAudio.find((chapter) => !isFinished(chapter)) || withAudio[0];
  const isFavorite = favorites?.some((favorite) => favorite.book.id === book.id);
  const myReview = reviews?.find((review) => review.user_id === user?.id);

  function listen(chapter = resumeChapter) {
    if (!chapter) return;
    const startAt = isFinished(chapter) ? 0 : positions[chapter.id] || 0;
    player.playChapter(book, chapter, startAt);
  }

  async function toggleFavorite() {
    if (!user) return navigate("/login");
    if (isFavorite) await api.delete(`/books/${book.id}/favorite`);
    else await api.post(`/books/${book.id}/favorite`);
    reloadFavorites();
  }

  function share() {
    const data = { title: book.title, text: `${book.title} — ${book.author.name}`, url: window.location.href };
    if (navigator.share) navigator.share(data).catch(() => {});
    else navigator.clipboard?.writeText(window.location.href);
  }

  // how many reviews gave 5, 4, 3, 2, 1 stars
  const starCounts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    share: percent(reviews?.filter((review) => review.rating === stars).length || 0, reviews?.length || 0),
  }));

  const chapters = showAllChapters ? book.chapters : book.chapters.slice(0, SHOWN_CHAPTERS);

  return (
    <Page onShare={share}>
      {/* Wide screens: left column (cover, buttons) stays in place, right column scrolls */}
      <div className="lg:grid lg:grid-cols-[380px_1fr] lg:gap-12 lg:px-8 lg:pt-8">
        <aside className="lg:sticky lg:top-24 lg:self-start lg:bg-surface-container-low lg:rounded-3xl lg:pb-2 lg:shadow-xl">
          {/* Badge + favorite */}
          <div className="px-4 py-2 lg:pt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/80">
              <Icon name="verified" size={16} className="text-secondary" />
              <span className="text-label-sm text-secondary uppercase">{book.category?.name || "Асари классикӣ"}</span>
            </div>
            <button
              onClick={toggleFavorite}
              className={`w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center active:scale-90 shadow-md ${isFavorite ? "text-primary" : "text-on-surface-variant"}`}
              aria-label="Ба дилхоҳ"
            >
              <Icon name="favorite" filled={isFavorite} size={22} className={isFavorite ? "scale-110 transition-transform" : ""} />
            </button>
          </div>

          {/* Cover, title, author */}
          <section className="px-4 pt-1 pb-6 flex flex-col items-center text-center relative">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            <Cover book={book} className="relative w-44 aspect-[3/4.4] rounded-xl shadow-[0_16px_36px_rgba(0,0,0,0.65)] my-2" />

            <h2 className="font-serif text-headline-lg-mobile font-bold mt-4">«{book.title}»</h2>
            <Link to={`/search?author_id=${book.author.id}`} className="text-label-lg text-primary mt-1 hover:underline">
              {book.author.name}
              {book.author.birth_year && (
                <span className="text-on-surface-variant text-label-md">
                  {" "}
                  ({book.author.birth_year}–{book.author.death_year})
                </span>
              )}
            </Link>

            {book.narrator && (
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high/90">
                <Icon name="mic" size={18} className="text-secondary" />
                <span className="text-label-md">
                  Ровӣ: <strong className="text-secondary-fixed-dim">{book.narrator.name}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary-fixed-dim text-label-sm">
                  {book.narrator.kind === "ai" ? "AI" : "Инсонӣ"}
                </span>
              </div>
            )}

            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant text-label-sm">
              <Icon name="lock_open_right" size={14} className="text-tertiary" />
              {LICENSES[book.license_type]}
            </div>

            {/* Numbers */}
            <div className="w-full mt-5 grid grid-cols-3 gap-2 bg-surface-container-low/80 p-3 rounded-xl">
              <Stat icon="schedule" value={book.total_duration ? formatDuration(book.total_duration) : "—"} label="Давомнокӣ" />
              <Stat icon="star" filled value={book.reviews_count ? book.average_rating.toFixed(1) : "—"} label={`${book.reviews_count} тақриз`} />
              <Stat icon="menu_book" value={book.chapters.length} label="Боб" color="text-secondary" />
            </div>

            {/* Main buttons */}
            <div className="w-full mt-4 flex items-center gap-2">
              <button
                onClick={() => listen()}
                disabled={!resumeChapter}
                className="flex-1 h-12 rounded-xl bg-primary-container text-on-primary-container text-label-lg font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] disabled:opacity-50"
              >
                <Icon name="headphones" size={22} />
                {resumeChapter ? (positions[resumeChapter.id] ? "Идома додан" : "Гӯш кардан") : "Аудио ба наздикӣ"}
              </button>
              <button
                onClick={() => book.chapters[0] && navigate(`/read/${book.chapters[0].id}`)}
                disabled={!book.chapters.length}
                className="flex-1 h-12 rounded-xl bg-surface-container-high text-label-lg flex items-center justify-center gap-2 shadow active:scale-[0.98] disabled:opacity-50"
              >
                <Icon name="auto_stories" size={20} className="text-secondary" /> Хондан
              </button>
            </div>
          </section>
        </aside>

        <div className="min-w-0">
          {/* Description */}
          {book.description && (
            <section className="px-4 py-2 lg:px-0 lg:py-0">
              <div className="bg-surface-container rounded-xl p-4 lg:p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="history_edu" size={20} className="text-primary" />
                  <h3 className="font-serif text-headline-sm font-semibold">Шарҳи китоб</h3>
                </div>
                <p className={`text-body-sm lg:text-body-md text-on-surface-variant ${showFullText ? "" : "line-clamp-3"}`}>{book.description}</p>
                <button onClick={() => setShowFullText(!showFullText)} className="mt-2 text-primary text-label-sm flex items-center gap-1">
                  {showFullText ? "Пӯшидан" : "Бештар хондан"}
                  <Icon name="expand_more" size={16} className={showFullText ? "rotate-180" : ""} />
                </button>
              </div>
            </section>
          )}

          {/* Chapters */}
          <section className="px-4 lg:px-0 mt-5 lg:mt-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <h3 className="font-serif text-headline-sm lg:text-headline-md font-bold">Мундариҷа</h3>
                <span className="text-label-sm text-on-surface-variant">{book.chapters.length} боб</span>
              </div>
              {user && book.total_duration > 0 && (
                <span className="flex items-center gap-1 text-secondary text-label-sm">
                  <Icon name="sync" size={16} /> Пешрафт: {bookPercent}%
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {chapters.map((chapter) => {
                const isPlaying = player.chapter?.id === chapter.id;
                const position = isPlaying ? player.position : positions[chapter.id] || 0;
                const done = isFinished(chapter);
                const started = position > 0 && !done;

                return (
                  <div
                    key={chapter.id}
                    className={`p-3.5 rounded-xl flex items-center gap-3 relative overflow-hidden ${isPlaying || started ? "bg-surface-container-high shadow-md" : "bg-surface-container"}`}
                  >
                    {(isPlaying || started) && <div className="absolute left-0 inset-y-0 w-1 bg-primary" />}

                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-secondary/15 text-secondary" : isPlaying ? "bg-primary-container text-on-primary-container" : "bg-surface-container-highest text-on-surface-variant text-label-md font-bold"}`}
                    >
                      {done ? (
                        <Icon name="check_circle" size={22} />
                      ) : isPlaying ? (
                        <Icon name="graphic_eq" size={20} />
                      ) : (
                        String(chapter.order).padStart(2, "0")
                      )}
                    </div>

                    <Link to={`/read/${chapter.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-label-sm">
                        {done && <span className="text-secondary">Анҷом ёфт</span>}
                        {isPlaying && <span className="text-primary">Дар ҳоли пахш</span>}
                        {started && !isPlaying && <span className="text-primary">{percent(position, chapter.duration_seconds)}%</span>}
                        {!chapter.audio_file && <span className="text-outline">Танҳо матн</span>}
                        {chapter.duration_seconds > 0 && <span className="text-on-surface-variant">{formatClock(chapter.duration_seconds)}</span>}
                      </div>
                      <h4 className="font-serif text-body-md truncate mt-0.5">{chapter.title}</h4>
                      {(isPlaying || started) && chapter.duration_seconds > 0 && (
                        <div className="w-full bg-surface-container-lowest h-1.5 rounded-full mt-2 overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${percent(position, chapter.duration_seconds)}%` }} />
                        </div>
                      )}
                    </Link>

                    {chapter.audio_file && (
                      <button
                        onClick={() => (isPlaying ? player.toggle() : listen(chapter))}
                        className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-primary active:scale-90 shrink-0"
                        aria-label={isPlaying && player.playing ? "Таваққуф" : "Пахш"}
                      >
                        <Icon name={isPlaying && player.playing ? "pause" : done ? "replay" : "play_arrow"} filled size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {book.chapters.length > SHOWN_CHAPTERS && (
              <button
                onClick={() => setShowAllChapters(!showAllChapters)}
                className="w-full mt-3 py-2.5 rounded-xl bg-surface-container-low text-primary text-label-md flex items-center justify-center gap-1"
              >
                {showAllChapters ? "Камтар нишон додан" : `Дидани тамоми ${book.chapters.length} боб`}
                <Icon name="keyboard_arrow_down" size={18} className={showAllChapters ? "rotate-180" : ""} />
              </button>
            )}
          </section>

          {/* Reviews */}
          <section className="px-4 lg:px-0 mt-7 lg:mt-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-headline-sm lg:text-headline-md font-bold">Тақризҳо ва баҳо</h3>
                <p className="text-label-sm text-on-surface-variant">Андешаи шунавандагони Шунав</p>
              </div>
              {!myReview && (
                <button
                  onClick={() => (user ? setModal("review") : navigate("/login"))}
                  className="px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container text-label-sm flex items-center gap-1 active:scale-95"
                >
                  <Icon name="rate_review" size={16} /> Навиштан
                </button>
              )}
            </div>

            {reviews?.length > 0 && (
              <div className="p-4 rounded-xl bg-surface-container flex items-center gap-4">
                <div className="flex flex-col items-center pr-3">
                  <span className="font-serif text-display-hero-mobile text-primary leading-none">{book.average_rating.toFixed(1)}</span>
                  <div className="mt-1">
                    <Stars value={book.average_rating} size={16} />
                  </div>
                  <span className="text-label-sm text-on-surface-variant mt-1">{reviews.length} баҳо</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  {starCounts.map(({ stars, share }) => (
                    <div key={stars} className="flex items-center gap-2 text-label-sm text-on-surface-variant">
                      <span className="w-2">{stars}</span>
                      <div className="flex-1 h-2 rounded-full bg-surface-container-lowest overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${share}%` }} />
                      </div>
                      <span className="w-8 text-right">{share}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {reviews?.length === 0 && <p className="text-body-sm text-on-surface-variant">Ҳоло тақриз нест. Аввалин шуда нависед!</p>}
              {reviews?.map((review) => (
                <div key={review.id} className="p-3.5 rounded-xl bg-surface-container">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary-fixed-dim flex items-center justify-center font-bold">
                        {review.user.name[0]}
                      </div>
                      <div>
                        <h5 className="text-label-md font-semibold">{review.user.name}</h5>
                        <span className="text-label-sm text-on-surface-variant">{timeAgo(review.created_at)}</span>
                      </div>
                    </div>
                    <Stars value={review.rating} />
                  </div>
                  {review.text && <p className="text-body-sm text-on-surface-variant mt-2">{review.text}</p>}
                  {review.user_id === user?.id && (
                    <button
                      onClick={async () => {
                        await api.delete(`/reviews/${review.id}`);
                        reloadReviews();
                      }}
                      className="mt-2 text-label-sm text-outline hover:text-error"
                    >
                      Нест кардан
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Copyright */}
          <footer className="px-4 lg:px-0 mt-8 pt-4 flex flex-col items-center lg:items-start text-center">
            {book.source_url && (
              <a
                href={book.source_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-on-surface-variant text-label-sm hover:underline"
              >
                <Icon name="policy" size={16} /> Манбаи матн
              </a>
            )}
            <button
              onClick={() => setModal("report")}
              className="mt-2 text-on-surface-variant/70 hover:text-error text-label-sm underline underline-offset-4 decoration-outline-variant"
            >
              Шикоят аз ҳуқуқи муаллиф
            </button>
          </footer>
        </div>
      </div>

      {modal === "review" && (
        <ReviewModal
          bookId={book.id}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reloadReviews();
          }}
        />
      )}
      {modal === "report" && <ReportModal bookId={book.id} onClose={() => setModal(null)} />}
    </Page>
  );
}

// Inner page frame: back button header + content + mini player
function Page({ children, onShare }) {
  return (
    <>
      <Header
        title="Китоб"
        actions={
          onShare && (
            <button
              onClick={onShare}
              className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
              aria-label="Мубодила"
            >
              <Icon name="share" size={20} />
            </button>
          )
        }
      />
      <main className="pt-16 md:pt-[72px] min-h-screen max-w-3xl lg:max-w-7xl mx-auto">{children}</main>
      <Footer />
      <MiniPlayer />
    </>
  );
}

function Stat({ icon, value, label, filled, color = "text-primary" }) {
  return (
    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-container">
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon name={icon} filled={filled} size={18} />
        <span className="text-label-lg font-bold text-on-surface">{value}</span>
      </div>
      <span className="text-label-sm text-on-surface-variant mt-0.5">{label}</span>
    </div>
  );
}

function ReviewModal({ bookId, onClose, onSaved }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    try {
      await api.post(`/books/${bookId}/reviews`, { rating, text: text || null });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Тақриз навиштан" onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <Stars value={rating} size={30} onChange={setRating} />
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          placeholder="Фикри шумо дар бораи китоб..."
          className="w-full p-3 rounded-xl bg-surface-container text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary"
        />
        {error && <p className="text-error text-body-sm">{error}</p>}
        <button className="h-12 bg-primary text-on-primary rounded-xl text-label-lg">Фиристодан</button>
      </form>
    </Modal>
  );
}

function ReportModal({ bookId, onClose }) {
  const [form, setForm] = useState({ email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send(event) {
    event.preventDefault();
    try {
      await api.post(`/books/${bookId}/report`, form);
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
  }

  const input = "w-full p-3 rounded-xl bg-surface-container text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary";

  return (
    <Modal title="Шикоят аз ҳуқуқ" onClose={onClose}>
      {sent ? (
        <div className="text-center py-4">
          <Icon name="check_circle" filled size={40} className="text-secondary" />
          <p className="mt-2">Ташаккур! Мо шикояти шуморо дида мебароем.</p>
        </div>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-3">
          <p className="text-body-sm text-on-surface-variant">Агар ин китоб ҳуқуқи шумо ё каси дигарро вайрон кунад, ба мо нависед.</p>
          <input
            type="email"
            required
            placeholder="Email-и шумо"
            className={input}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <textarea
            required
            minLength={5}
            rows={4}
            placeholder="Шарҳ"
            className={input}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          {error && <p className="text-error text-body-sm">{error}</p>}
          <button className="h-12 bg-primary text-on-primary rounded-xl text-label-lg">Фиристодан</button>
        </form>
      )}
    </Modal>
  );
}
