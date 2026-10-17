import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import Cover from "../components/Cover.jsx";
import GirihBackground from "../components/GirihBackground.jsx";
import Header from "../components/Header.jsx";
import Icon from "../components/Icon.jsx";
import Modal from "../components/Modal.jsx";
import { formatClock, percent } from "../format.js";
import { SPEEDS, usePlayer } from "../player.jsx";

const SLEEP_OPTIONS = [0, 5, 15, 30, 45, 60];
const WAVE_BARS = 32;

export default function Player() {
  const player = usePlayer();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null); // "chapters" | "sleep" | null
  const [notice, setNotice] = useState("");

  // fixed random heights for the decorative waveform
  const wave = useMemo(() => Array.from({ length: WAVE_BARS }, (_, i) => 25 + ((i * 37) % 75)), []);

  if (!player.chapter) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Icon name="headphones" size={48} className="text-primary" />
        <p className="font-serif text-headline-sm">Ҳоло ягон китоб пахш намешавад</p>
        <Link to="/" className="h-12 px-6 rounded-xl bg-primary text-on-primary text-label-lg flex items-center">
          Интихоби китоб
        </Link>
      </main>
    );
  }

  const { book, chapter, position, duration } = player;
  const progress = percent(position, duration);
  const playedBars = Math.round((progress / 100) * WAVE_BARS);

  function nextSpeed() {
    const index = SPEEDS.indexOf(player.speed);
    player.setSpeed(SPEEDS[(index + 1) % SPEEDS.length]);
  }

  // click on the bar = jump there
  function seekFromClick(event) {
    const box = event.currentTarget.getBoundingClientRect();
    player.seek(((event.clientX - box.left) / box.width) * duration);
  }

  async function addBookmark() {
    if (!user) return navigate("/login");
    await api.post("/me/bookmarks", { chapter_id: chapter.id, position_seconds: Math.floor(position) });
    setNotice(`Хатчӯб дар ${formatClock(position)} сабт шуд`);
    setTimeout(() => setNotice(""), 4000);
  }

  return (
    <main className="relative min-h-screen overflow-hidden pt-safe pb-safe select-none">
      {/* Background: blurred cover + star pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <Cover book={book} showTitle={false} frame={false} className="absolute -inset-10 blur-3xl opacity-25 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface via-surface/90 to-surface-container-lowest" />
        <GirihBackground className="opacity-[0.035]" />
      </div>

      {/* wide screens get the normal site header; phones get the player's own top bar */}
      <div className="hidden md:block">
        <Header />
      </div>

      <div className="relative z-10 w-full max-w-md md:max-w-6xl mx-auto px-5 md:px-8 pb-8 md:pt-28 md:pb-16 md:grid md:grid-cols-2 md:gap-16 md:items-center md:min-h-screen">
        {/* Top bar (phones) */}
        <div className="md:hidden flex items-center justify-between py-3 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low/60 hover:text-primary active:scale-90"
            aria-label="Пӯшидан"
          >
            <Icon name="keyboard_arrow_down" size={24} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-label-sm text-outline uppercase tracking-wider">Овозхон</span>
            <span className="font-serif text-label-md">Шунав Player</span>
          </div>
          <button
            onClick={() => setSheet("sleep")}
            className="h-9 px-2.5 rounded-full flex items-center gap-1.5 bg-surface-container-low/70 hover:text-primary active:scale-95"
            aria-label="Вақтсанҷи хоб"
          >
            <Icon name="bedtime" size={18} className="text-secondary" />
            <span className="text-label-sm text-secondary">{player.sleepMinutes ? `${player.sleepMinutes} дақ` : "Хоб"}</span>
          </button>
        </div>

        {/* Cover (left column on wide screens) */}
        <Link to={`/books/${book.id}`} className="flex flex-col items-center my-4 md:my-0">
          <Cover
            book={book}
            className="w-64 md:w-full aspect-[3/4] max-w-[280px] md:max-w-[420px] rounded-xl md:rounded-2xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.85),0_0_35px_rgba(224,165,38,0.18)]"
          />
          {book.narrator && (
            <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low/70">
              <span className={`w-2 h-2 rounded-full bg-secondary ${player.playing ? "animate-pulse" : ""}`} />
              <span className="text-label-sm text-on-surface-variant">{book.narrator.name}</span>
            </div>
          )}
        </Link>

        {/* Right column on wide screens */}
        <div className="flex flex-col">
          {/* Titles */}
          <div className="flex flex-col mt-3 md:mt-0 text-center md:text-left px-2 md:px-0">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1 text-label-sm md:text-label-md">
              <span className="text-primary uppercase font-semibold">«{book.title}»</span>
              <span className="text-outline-variant">•</span>
              <span className="text-on-surface-variant">{book.author.name}</span>
            </div>
            <h2 className="font-serif text-headline-lg-mobile md:text-[40px] md:leading-[48px] font-semibold truncate md:whitespace-normal">{chapter.title}</h2>
            <p className="hidden md:block text-body-md text-on-surface-variant mt-3 line-clamp-3">{book.description}</p>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div onClick={seekFromClick} className="relative w-full h-2 bg-surface-container-highest rounded-full cursor-pointer group">
              <div className="h-full bg-primary-container rounded-full relative" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_10px_#fabc3e] group-hover:scale-125 transition-transform" />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-label-sm tracking-wider">
              <span className="text-primary">{formatClock(position)}</span>
              <span className="text-on-surface-variant">{formatClock(duration)}</span>
              <span className="text-outline">-{formatClock(duration - position)}</span>
            </div>
            <div className="flex items-end justify-between h-7 px-1 mt-2.5 gap-[2px] opacity-75">
              {wave.map((height, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full ${i < playedBars ? "bg-secondary" : i === playedBars ? "bg-primary shadow-[0_0_8px_#fabc3e]" : "bg-surface-container-highest"}`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between md:justify-center md:gap-6 mt-6 px-3 md:px-0">
            <ControlButton icon="skip_previous" label="Боби қаблӣ" onClick={player.previous} />
            <ControlButton icon="replay_10" label="10 сония ба қафо" onClick={() => player.skip(-10)} big />
            <div className="relative flex items-center justify-center">
              {player.playing && <div className="absolute -inset-2 rounded-full bg-secondary-container/25 blur-md animate-ping pointer-events-none" />}
              <button
                onClick={player.toggle}
                className="relative w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-[0_0_24px_rgba(224,165,38,0.5)] active:scale-95 hover:brightness-110"
                aria-label="Пахш / Таваққуф"
              >
                <Icon name={player.playing ? "pause" : "play_arrow"} filled size={36} />
              </button>
            </div>
            <ControlButton icon="forward_10" label="10 сония ба пеш" onClick={() => player.skip(10)} big />
            <ControlButton icon="skip_next" label="Боби навбатӣ" onClick={player.next} disabled={!player.hasNext} />
          </div>

          {/* Extra buttons */}
          <div className="grid grid-cols-4 gap-2 mt-7 bg-surface-container-low/70 backdrop-blur-md p-2 rounded-xl">
            <ToolButton icon="speed" label={`${player.speed}×`} onClick={nextSpeed} active />
            <ToolButton icon="snooze" label={player.sleepMinutes ? `${player.sleepMinutes} дақ` : "Хоб"} onClick={() => setSheet("sleep")} />
            <ToolButton icon="bookmark_add" label="Хатчӯб" onClick={addBookmark} />
            <ToolButton icon="format_list_bulleted" label={`Боб (${book.chapters.length})`} onClick={() => setSheet("chapters")} />
          </div>

          <Link
            to={`/read/${chapter.id}`}
            className="mt-4 w-full h-12 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-between px-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary">
                <Icon name="menu_book" size={18} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-label-md">Гузариш ба хониш (Матн)</span>
                <span className="text-label-sm text-on-surface-variant">Аудио давом мекунад</span>
              </div>
            </div>
            <Icon name="chevron_right" size={20} className="text-primary" />
          </Link>

          {notice && (
            <div className="mt-3 w-full bg-secondary-container/20 rounded-xl p-3 flex items-center gap-2">
              <Icon name="check_circle" filled size={20} className="text-secondary" />
              <span className="text-body-sm">{notice}</span>
            </div>
          )}
        </div>
      </div>

      {sheet === "chapters" && (
        <Modal title="Мундариҷа" onClose={() => setSheet(null)}>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {book.chapters.map((item) => (
              <button
                key={item.id}
                disabled={!item.audio_file}
                onClick={() => {
                  player.playChapter(book, item, 0);
                  setSheet(null);
                }}
                className={`w-full p-3 rounded-xl flex items-center gap-3 text-left disabled:opacity-40 ${item.id === chapter.id ? "bg-primary/15 text-primary" : "bg-surface-container hover:bg-surface-container-highest"}`}
              >
                <span className="w-7 text-label-md font-bold">{String(item.order).padStart(2, "0")}</span>
                <span className="flex-1 font-serif truncate">{item.title}</span>
                <span className="text-label-sm text-on-surface-variant">{item.audio_file ? formatClock(item.duration_seconds) : "матн"}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {sheet === "sleep" && (
        <Modal title="Вақтсанҷи хоб" onClose={() => setSheet(null)}>
          <div className="grid grid-cols-3 gap-2">
            {SLEEP_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                onClick={() => {
                  player.setSleep(minutes);
                  setSheet(null);
                }}
                className={`h-12 rounded-xl text-label-lg ${player.sleepMinutes === minutes ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-highest"}`}
              >
                {minutes ? `${minutes} дақ` : "Хомӯш"}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </main>
  );
}

function ControlButton({ icon, label, onClick, big, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`w-12 h-12 flex items-center justify-center rounded-full active:scale-90 disabled:opacity-30 ${big ? "hover:text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
    >
      <Icon name={icon} size={big ? 30 : 26} />
    </button>
  );
}

function ToolButton({ icon, label, onClick, active }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center py-2 px-1 rounded-lg hover:bg-surface-container active:scale-95">
      <Icon name={icon} size={20} className={active ? "text-primary" : "text-on-surface-variant"} />
      <span className={`text-label-sm mt-0.5 ${active ? "text-primary" : "text-on-surface-variant"}`}>{label}</span>
    </button>
  );
}
