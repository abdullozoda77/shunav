import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import Cover from "../components/Cover.jsx";
import Icon from "../components/Icon.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import Spinner from "../components/Spinner.jsx";
import { formatClock, percent } from "../format.js";
import { useApi } from "../hooks.js";
import { usePlayer } from "../player.jsx";
import { useT } from "../i18n.jsx";

// labels are translated where shown
const TABS = [
  { key: "continue", label: "Идома" },
  { key: "favorites", label: "Дилхоҳ" },
  { key: "bookmarks", label: "Хатчӯбҳо" },
];

export default function Library() {
  const t = useT();
  const { user } = useAuth();
  const [tab, setTab] = useState("continue");

  if (!user) return <LoginFirst />;

  return (
    <div className="px-4 md:px-8 pt-3 md:pt-8 pb-8 flex flex-col gap-4 md:gap-6">
      <h1 className="font-serif text-headline-lg-mobile md:text-[36px] md:leading-[44px]">{t("Китобхонаи ман")}</h1>
      <div className="flex bg-surface-container-high rounded-xl p-1 md:max-w-md">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex-1 h-10 rounded-lg text-label-md ${tab === item.key ? "bg-primary text-on-primary font-bold" : "text-on-surface-variant"}`}
          >
            {t(item.label)}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {tab === "continue" && <ContinueTab />}
        {tab === "bookmarks" && <BookmarksTab />}
      </div>
      {tab === "favorites" && <FavoritesTab />}
    </div>
  );
}

function ContinueTab() {
  const t = useT();
  const player = usePlayer();
  const { data, loading } = useApi("/me/continue");
  if (loading) return <Spinner />;
  if (!data?.length) return <Empty icon="headphones" text={t("Шумо ҳоло ягон китоб гӯш накардаед.")} />;

  return data.map(({ book, chapter, position_seconds }) => (
    <div key={book.id} className="group flex items-center gap-3 p-3 rounded-xl bg-surface-container">
      <Link to={`/books/${book.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Cover book={book} showTitle={false} className="w-12 h-16 rounded-lg shrink-0" />
        <div className="min-w-0">
          <h4 className="font-serif text-label-lg truncate">{book.title}</h4>
          <p className="text-label-sm text-on-surface-variant truncate">{chapter.title}</p>
        </div>
      </Link>
      <ProgressRing value={percent(position_seconds, chapter.duration_seconds)} />
      <button
        onClick={() => player.playById(book.id, chapter.id, position_seconds)}
        className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center"
        aria-label={t("Идома додан")}
      >
        <Icon name="play_arrow" filled size={20} />
      </button>
    </div>
  ));
}

function FavoritesTab() {
  const t = useT();
  const { data, loading } = useApi("/me/favorites");
  if (loading) return <Spinner />;
  if (!data?.length) return <Empty icon="favorite" text={t("Китобҳои дилхоҳро бо ♥ илова кунед.")} />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
      {data.map(({ book }) => (
        <Link key={book.id} to={`/books/${book.id}`} className="group flex flex-col gap-2">
          <Cover book={book} className="w-full aspect-[3/4] rounded-xl shadow-md" />
          <h4 className="font-serif text-label-lg truncate">{book.title}</h4>
        </Link>
      ))}
    </div>
  );
}

function BookmarksTab() {
  const t = useT();
  const player = usePlayer();
  const { data, loading, reload } = useApi("/me/bookmarks");
  if (loading) return <Spinner />;
  if (!data?.length) return <Empty icon="bookmark" text={t("Дар плеер «Хатчӯб»-ро пахш кунед, то ҷойро нигоҳ доред.")} />;

  async function remove(id) {
    await api.delete(`/me/bookmarks/${id}`);
    reload();
  }

  return data.map((bookmark) => (
    <div key={bookmark.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container">
      <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <Icon name="bookmark" filled size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-label-lg truncate">{bookmark.chapter.title}</p>
        <p className="text-label-sm text-on-surface-variant truncate">
          {bookmark.chapter.book_title} • {formatClock(bookmark.position_seconds)}
        </p>
        {bookmark.note && <p className="text-body-sm text-tertiary truncate">{bookmark.note}</p>}
      </div>
      <button
        onClick={() => player.playById(bookmark.chapter.book_id, bookmark.chapter_id, bookmark.position_seconds)}
        className="w-9 h-9 rounded-full bg-surface-container-highest text-primary flex items-center justify-center"
        aria-label={t("Пахш")}
      >
        <Icon name="play_arrow" filled size={18} />
      </button>
      <button
        onClick={() => remove(bookmark.id)}
        className="w-9 h-9 rounded-full text-outline hover:text-error flex items-center justify-center"
        aria-label={t("Нест кардан")}
      >
        <Icon name="delete" size={18} />
      </button>
    </div>
  ));
}

function Empty({ icon, text }) {
  return (
    <div className="md:col-span-2 text-center py-16 text-on-surface-variant">
      <Icon name={icon} size={40} />
      <p className="mt-2">{text}</p>
    </div>
  );
}

export function LoginFirst() {
  const t = useT();
  return (
    <div className="px-6 py-20 flex flex-col items-center text-center gap-4">
      <Icon name="lock" size={40} className="text-primary" />
      <p className="font-serif text-headline-sm">{t("Аввал ворид шавед")}</p>
      <p className="text-body-sm text-on-surface-variant">{t("Пешрафт, дилхоҳҳо ва хатчӯбҳо дар ҳисоби шумо нигоҳ дошта мешаванд.")}</p>
      <Link to="/login" className="h-12 px-6 rounded-xl bg-primary text-on-primary text-label-lg flex items-center">
        {t("Ворид шудан")}
      </Link>
    </div>
  );
}
