import { Link } from "react-router-dom";
import { formatClock, percent } from "../format.js";
import { usePlayer } from "../player.jsx";
import Cover from "./Cover.jsx";
import Icon from "./Icon.jsx";

// The player bar. Phones: a small card above the bottom menu. Wide screens: a full bar at the bottom.
export default function MiniPlayer() {
  const player = usePlayer();
  if (!player.chapter) return null;

  const progress = percent(player.position, player.duration);

  function seekFromClick(event) {
    const box = event.currentTarget.getBoundingClientRect();
    player.seek(((event.clientX - box.left) / box.width) * player.duration);
  }

  return (
    <aside className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 px-3 pb-2 md:p-0 pb-safe">
      <div className="max-w-lg md:max-w-none mx-auto bg-surface-container-high/90 md:bg-surface-container-low/95 backdrop-blur-2xl rounded-xl md:rounded-none md:border-t md:border-white/5 p-2.5 md:px-8 md:py-3 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_12px_rgba(224,165,38,0.12)]">
        <div className="max-w-7xl mx-auto flex items-center gap-3 md:gap-6">
          {/* book */}
          <Link to="/player" className="flex items-center gap-3 flex-1 md:flex-none md:w-72 min-w-0">
            <Cover book={player.book} showTitle={false} className="w-10 h-10 md:w-12 md:h-14 rounded-lg shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-label-md md:text-label-lg truncate">{player.book.title}</span>
                <Icon name="expand_less" size={14} className="text-secondary" />
              </div>
              <span className="text-label-sm text-on-surface-variant truncate">{player.chapter.title}</span>
              <div className="md:hidden w-full bg-surface-container-highest rounded-full h-1 mt-1 overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </Link>

          {/* controls + seek bar (wide screens) */}
          <div className="hidden md:flex flex-1 flex-col items-center gap-1.5">
            <div className="flex items-center gap-4">
              <button onClick={player.previous} className="text-on-surface-variant hover:text-on-surface" aria-label="Боби қаблӣ">
                <Icon name="skip_previous" size={24} />
              </button>
              <button onClick={() => player.skip(-10)} className="text-on-surface-variant hover:text-on-surface" aria-label="10 сония ба қафо">
                <Icon name="replay_10" size={24} />
              </button>
              <button onClick={player.toggle} className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_0_12px_rgba(224,165,38,0.4)] hover:brightness-110" aria-label="Пахш ё таваққуф">
                <Icon name={player.playing ? "pause" : "play_arrow"} filled size={26} />
              </button>
              <button onClick={() => player.skip(10)} className="text-on-surface-variant hover:text-on-surface" aria-label="10 сония ба пеш">
                <Icon name="forward_10" size={24} />
              </button>
              <button onClick={player.next} disabled={!player.hasNext} className="text-on-surface-variant hover:text-on-surface disabled:opacity-30" aria-label="Боби навбатӣ">
                <Icon name="skip_next" size={24} />
              </button>
            </div>
            <div className="w-full max-w-xl flex items-center gap-3 text-label-sm text-on-surface-variant">
              <span className="w-10 text-right">{formatClock(player.position)}</span>
              <div onClick={seekFromClick} className="flex-1 h-1.5 bg-surface-container-highest rounded-full cursor-pointer group">
                <div className="h-full bg-primary rounded-full relative" style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-primary opacity-0 group-hover:opacity-100" />
                </div>
              </div>
              <span className="w-10">{formatClock(player.duration)}</span>
            </div>
          </div>

          {/* right side (wide screens) */}
          <div className="hidden md:flex w-72 justify-end items-center gap-2">
            <span className="text-label-sm text-primary px-2 py-1 rounded-full bg-primary/10">{player.speed}×</span>
            <Link to="/player" className="h-9 px-3 rounded-full bg-surface-container-high hover:bg-surface-bright flex items-center gap-1.5 text-label-md">
              <Icon name="open_in_full" size={16} /> Плеер
            </Link>
          </div>

          {/* phones: two buttons */}
          <button onClick={() => player.skip(10)} className="md:hidden w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-on-surface" aria-label="10 сония ба пеш">
            <Icon name="forward_10" size={22} />
          </button>
          <button onClick={player.toggle} className="md:hidden w-11 h-11 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_0_12px_rgba(224,165,38,0.4)]" aria-label="Пахш ё таваққуф">
            <Icon name={player.playing ? "pause" : "play_arrow"} filled size={24} />
          </button>
        </div>
      </div>
    </aside>
  );
}
