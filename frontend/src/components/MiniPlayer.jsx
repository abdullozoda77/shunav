import { Link } from "react-router-dom";
import { percent } from "../format.js";
import { usePlayer } from "../player.jsx";
import Icon from "./Icon.jsx";

// The small player above the bottom menu. Tap it to open the full player.
export default function MiniPlayer() {
  const player = usePlayer();
  if (!player.chapter) return null;

  return (
    <aside className="fixed bottom-16 inset-x-0 z-40 px-3 pb-2 pb-safe">
      <div className="max-w-lg mx-auto bg-surface-container-high/90 backdrop-blur-2xl rounded-xl p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_12px_rgba(224,165,38,0.12)] flex items-center gap-3">
        <Link to="/player" className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-end justify-center gap-0.5 pb-3 shrink-0">
            {[0, 0.2, 0.4].map((delay, i) => (
              <span
                key={delay}
                className={`w-0.5 rounded-full ${i === 1 ? "bg-primary" : "bg-secondary"} ${player.playing ? "animate-eq" : "h-1"}`}
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-label-md truncate">{player.book.title}</span>
              <Icon name="expand_less" size={14} className="text-secondary" />
            </div>
            <span className="text-label-sm text-on-surface-variant truncate">{player.chapter.title}</span>
            <div className="w-full bg-surface-container-highest rounded-full h-1 mt-1 overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${percent(player.position, player.duration)}%` }} />
            </div>
          </div>
        </Link>
        <button onClick={() => player.skip(15)} className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-on-surface" aria-label="15 сония ба пеш">
          <Icon name="forward_10" size={22} />
        </button>
        <button onClick={player.toggle} className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_0_12px_rgba(224,165,38,0.4)]" aria-label="Пахш ё таваққуф">
          <Icon name={player.playing ? "pause" : "play_arrow"} filled size={24} />
        </button>
      </div>
    </aside>
  );
}
