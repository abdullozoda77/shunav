import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import Avatar from "../components/Avatar.jsx";
import BooksBackground from "../components/BooksBackground.jsx";
import Cover from "../components/Cover.jsx";
import Icon from "../components/Icon.jsx";
import LanguageSwitch from "../components/LanguageSwitch.jsx";
import ThemeSwitch from "../components/ThemeSwitch.jsx";
import { formatDuration, percent } from "../format.js";
import { useApi } from "../hooks.js";
import { useLanguage, useT } from "../i18n.jsx";
import { usePlayer } from "../player.jsx";
import { useTheme } from "../theme.jsx";
import { LoginFirst } from "./Library.jsx";

// Listener levels by listening time (hours). The last one has no next level.
const LEVELS = [
  { name: "Шунавандаи нав", hours: 0, icon: "headphones" },
  { name: "Дӯстдори китоб", hours: 1, icon: "auto_stories" },
  { name: "Хонандаи доно", hours: 5, icon: "school" },
  { name: "Устоди сухан", hours: 20, icon: "military_tech" },
];

const DATE_LOCALES = { tg: "tg-TJ", ru: "ru-RU", en: "en-GB" };

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { data: stats } = useApi(user ? "/me/stats" : null);
  const { data: continueList } = useApi(user ? "/me/continue" : null);
  const { data: favorites } = useApi(user ? "/me/favorites" : null);

  if (!user) return <LoginFirst />;

  // level: the highest one reached, and how far it is to the next
  const listened = stats?.listened_seconds || 0;
  const levelIndex = LEVELS.findLastIndex((level) => listened >= level.hours * 3600);
  const level = LEVELS[levelIndex];
  const nextLevel = LEVELS[levelIndex + 1];
  const levelProgress = nextLevel
    ? percent(listened - level.hours * 3600, (nextLevel.hours - level.hours) * 3600)
    : 100;

  let memberSince = "";
  try {
    memberSince = new Date(user.created_at).toLocaleDateString(DATE_LOCALES[language], { month: "long", year: "numeric" });
  } catch {
    memberSince = new Date(user.created_at).getFullYear();
  }

  const smallStats = [
    { icon: "play_lesson", label: t("Китобҳои оғозшуда"), value: stats?.books_started, color: "text-secondary", tile: "bg-secondary/15" },
    { icon: "favorite", label: t("Дилхоҳ"), value: stats?.favorites, color: "text-error", tile: "bg-error/10" },
    { icon: "bookmark", label: t("Хатчӯбҳо"), value: stats?.bookmarks, color: "text-secondary", tile: "bg-secondary/15" },
    { icon: "rate_review", label: t("Тақризҳо"), value: stats?.reviews, color: "text-primary", tile: "bg-primary/15" },
  ];

  return (
    <div className="px-4 md:px-8 pt-3 md:pt-8 pb-8 flex flex-col gap-6 md:gap-8">
      {/* banner: profile photo, name, and listener level */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-container-low border border-line/5 p-5 md:p-10 shadow-xl">
        <BooksBackground className="opacity-[0.10]" style={{ maskImage: "linear-gradient(to left, black 25%, transparent 75%)" }} />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_10%_0%,rgb(var(--c-primary)/0.16),transparent_45%),radial-gradient(circle_at_95%_100%,rgb(var(--c-secondary)/0.10),transparent_45%)]" />

        <div className="relative grid gap-6 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_300px] md:items-center md:gap-8">
          <ProfilePhoto />

          <div className="min-w-0 flex flex-col gap-2">
            <span className="flex items-center gap-2 text-label-sm uppercase tracking-[0.2em] text-primary">
              <span className="w-6 h-px bg-primary" /> {t("Профил")}
            </span>
            <h1 className="font-serif text-headline-lg-mobile md:text-[40px] md:leading-[48px] font-semibold truncate">{user.name}</h1>
            <p className="text-body-sm text-on-surface-variant truncate">
              @{user.username} · {user.email}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-label-sm text-on-surface-variant">
                <Icon name="calendar_month" size={14} className="text-secondary" /> {t("Аъзо аз {date}", { date: memberSince })}
              </span>
              {user.is_admin && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 text-label-sm text-secondary">
                  <Icon name="shield_person" size={14} /> {t("Админ")}
                </span>
              )}
            </div>
          </div>

          {/* listener level */}
          <div className="md:col-span-2 lg:col-span-1 rounded-2xl bg-surface-container-lowest/70 border border-line/10 p-4 md:p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Icon name={level.icon} size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-label-sm uppercase tracking-wider text-on-surface-variant">{t("Сатҳи шунаванда")}</p>
                <p className="font-serif text-headline-sm text-primary truncate">{t(level.name)}</p>
              </div>
              <span className="ml-auto text-label-sm text-outline">
                {levelIndex + 1} / {LEVELS.length}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${levelProgress}%` }} />
            </div>
            <p className="text-label-sm text-on-surface-variant">
              {nextLevel
                ? t("То «{level}»: {time}", { level: t(nextLevel.name), time: formatDuration(nextLevel.hours * 3600 - listened) })
                : t("Сатҳи олӣ")}
            </p>
          </div>
        </div>
      </section>

      {/* numbers */}
      <section className="flex flex-col gap-3 md:gap-4">
        <SectionTitle icon="insights" title={t("Омори ман")} />
        <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
          <div className="relative overflow-hidden p-5 md:p-6 rounded-2xl bg-gradient-to-br from-surface-container-high to-surface-container flex flex-col gap-4">
            {/* moving equalizer bars in the corner (index.css .eq-bars) */}
            <span className="eq-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <Icon name="headphones" size={22} />
              </div>
              <span className="text-label-md text-on-surface-variant">{t("Вақти гӯшкардашуда")}</span>
            </div>
            <p className="relative font-serif text-[40px] leading-none md:text-[48px] text-on-surface">{stats ? formatDuration(listened) : "…"}</p>
            <div className="relative flex flex-col gap-1.5">
              <div className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${percent(stats?.books_finished || 0, stats?.books_started || 0)}%` }} />
              </div>
              <span className="text-label-sm text-on-surface-variant">
                {t("{a} аз {b} китоб анҷом ёфт", { a: stats?.books_finished ?? 0, b: stats?.books_started ?? 0 })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {smallStats.map((item) => (
              <div key={item.label} className="p-4 md:p-5 rounded-2xl bg-surface-container flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-xl ${item.tile} ${item.color} flex items-center justify-center`}>
                  <Icon name={item.icon} size={20} />
                </div>
                <div>
                  <p className="font-serif text-headline-md leading-none">{item.value ?? "…"}</p>
                  <p className="text-label-sm text-on-surface-variant mt-1.5">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        {/* left: what is being listened to, favourite books */}
        <div className="flex flex-col gap-6 md:gap-8 min-w-0">
          <section className="flex flex-col gap-3 md:gap-4">
            <SectionTitle icon="play_circle" title={t("Идома додан")} link="/library" linkText={t("Китобхона")} />
            {continueList?.length ? (
              <div className="flex flex-col gap-2.5">
                {continueList.slice(0, 3).map((item) => (
                  <ContinueRow key={item.book.id} {...item} />
                ))}
              </div>
            ) : (
              <Empty icon="headphones" text={t("Шумо ҳоло ягон китоб гӯш накардаед.")} link="/" linkText={t("Интихоби китоб")} />
            )}
          </section>

          <section className="flex flex-col gap-3 md:gap-4">
            <SectionTitle icon="favorite" title={t("Китобҳои дилхоҳ")} link="/library" linkText={t("Ҳама")} />
            {favorites?.length ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
                {favorites.slice(0, 6).map(({ book }) => (
                  <Link key={book.id} to={`/books/${book.id}`} className="group flex flex-col gap-2 min-w-0">
                    <Cover book={book} className="w-full aspect-[3/4] rounded-xl" />
                    <span className="font-serif text-label-md truncate group-hover:text-primary">{book.title}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty icon="favorite" text={t("Китобҳои дилхоҳро бо ♥ илова кунед.")} />
            )}
          </section>
        </div>

        {/* right: settings and the account */}
        <aside className="flex flex-col gap-6 md:gap-8">
          <section className="flex flex-col gap-3 md:gap-4">
            <SectionTitle icon="tune" title={t("Танзимот")} />
            <div className="rounded-2xl bg-surface-container divide-y divide-line/10">
              <SettingRow icon="translate" title={t("Забони сомона")} hint={t("Китобҳо бо забони тоҷикӣ мебошанд")}>
                <LanguageSwitch />
              </SettingRow>
              <SettingRow icon={theme === "dark" ? "dark_mode" : "light_mode"} title={t("Мавзӯ")} hint={theme === "dark" ? t("Торик") : t("Равшан")}>
                <ThemeSwitch />
              </SettingRow>
            </div>
          </section>

          <section className="flex flex-col gap-3 md:gap-4">
            <SectionTitle icon="manage_accounts" title={t("Ҳисоб")} />
            <div className="rounded-2xl bg-surface-container divide-y divide-line/10 overflow-hidden">
              <AccountLink to="/library" icon="local_library" label={t("Китобхонаи ман")} />
              {user.is_admin && <AccountLink href="/api/docs" icon="admin_panel_settings" label={t("Идоракунӣ (API docs)")} />}
              <button
                onClick={() => {
                  logout();
                  navigate("/welcome");
                }}
                className="w-full flex items-center gap-3 p-4 text-error hover:bg-error/10"
              >
                <span className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                  <Icon name="logout" size={20} />
                </span>
                <span className="text-label-lg">{t("Баромадан")}</span>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

// Round profile photo (or the first letter). Click it or the camera to choose a new photo; the bin removes it.
function ProfilePhoto() {
  const { user, setUser } = useAuth();
  const t = useT();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action) {
    setBusy(true);
    setError("");
    try {
      setUser(await action());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // the same file can be chosen again
    if (!file) return;
    if (file.size > PHOTO_MAX_BYTES) return setError(t("Сурат бояд то 5 МБ бошад"));
    run(() => api.upload("/me/avatar", file));
  }

  const ring = "border-4 border-surface-container-low";

  return (
    <div className="flex flex-col items-center gap-2 w-fit">
      <div className="relative">
        <button onClick={() => input.current.click()} disabled={busy} className="group relative block rounded-full" aria-label={t("Иваз кардани сурат")}>
          <Avatar
            user={user}
            className="w-28 h-28 md:w-36 md:h-36 text-[48px] md:text-[60px] ring-2 ring-primary/60 ring-offset-4 ring-offset-surface-container-low shadow-[0_16px_36px_-14px_rgb(var(--c-primary)/0.6)]"
          />
          <span className={`absolute inset-0 rounded-full bg-black/45 text-white flex items-center justify-center transition-opacity ${busy ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
            {busy ? <span className="w-7 h-7 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Icon name="photo_camera" size={30} />}
          </span>
        </button>
        <button
          onClick={() => input.current.click()}
          disabled={busy}
          className={`absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:brightness-110 ${ring}`}
          aria-label={t("Иваз кардани сурат")}
          title={t("Иваз кардани сурат")}
        >
          <Icon name="photo_camera" size={18} />
        </button>
        {user.avatar && (
          <button
            onClick={() => run(() => api.delete("/me/avatar"))}
            disabled={busy}
            className={`absolute bottom-0 left-0 w-9 h-9 rounded-full bg-surface-container-high text-error flex items-center justify-center hover:bg-error/15 ${ring}`}
            aria-label={t("Нест кардани сурат")}
            title={t("Нест кардани сурат")}
          >
            <Icon name="delete" size={16} />
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choose} />
      {error && <p className="text-label-sm text-error max-w-[11rem] text-center">{error}</p>}
    </div>
  );
}

function SectionTitle({ icon, title, link, linkText }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-serif text-headline-sm md:text-headline-md">
        <Icon name={icon} size={22} className="text-primary" /> {title}
      </h2>
      {link && (
        <Link to={link} className="text-label-md text-primary hover:opacity-75 transition-opacity flex items-center">
          {linkText} <Icon name="chevron_right" size={16} />
        </Link>
      )}
    </div>
  );
}

function ContinueRow({ book, chapter, position_seconds }) {
  const player = usePlayer();
  const t = useT();
  const done = percent(position_seconds, chapter.duration_seconds);

  return (
    <div className="flex items-center gap-3 md:gap-4 p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high">
      <Link to={`/books/${book.id}`} className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        <Cover book={book} showTitle={false} className="w-12 h-16 rounded-lg shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-label-lg truncate">{book.title}</p>
          <p className="text-label-sm text-on-surface-variant truncate">{chapter.title}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${done}%` }} />
            </div>
            <span className="text-label-sm text-on-surface-variant">{done}%</span>
          </div>
        </div>
      </Link>
      <button
        onClick={() => player.playById(book.id, chapter.id, position_seconds)}
        className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 hover:brightness-110"
        aria-label={t("Идома додан")}
      >
        <Icon name="play_arrow" filled size={22} />
      </button>
    </div>
  );
}

function SettingRow({ icon, title, hint, children }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
        <Icon name={icon} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label-lg">{title}</p>
        <p className="text-label-sm text-on-surface-variant truncate">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function AccountLink({ to, href, icon, label }) {
  const inside = (
    <>
      <span className="w-10 h-10 rounded-xl bg-surface-container-highest text-on-surface-variant group-hover:text-primary flex items-center justify-center">
        <Icon name={icon} size={20} />
      </span>
      <span className="flex-1 text-label-lg">{label}</span>
      <Icon name={href ? "open_in_new" : "chevron_right"} size={18} className="text-outline" />
    </>
  );
  const className = "group w-full flex items-center gap-3 p-4 hover:bg-surface-container-high";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {inside}
    </a>
  ) : (
    <Link to={to} className={className}>
      {inside}
    </Link>
  );
}

function Empty({ icon, text, link, linkText }) {
  return (
    <div className="p-6 rounded-2xl border border-dashed border-line/15 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
      <Icon name={icon} size={28} className="text-outline" />
      <p className="flex-1 text-body-sm text-on-surface-variant">{text}</p>
      {link && (
        <Link to={link} className="h-10 px-4 rounded-xl bg-primary text-on-primary text-label-md font-bold flex items-center">
          {linkText}
        </Link>
      )}
    </div>
  );
}
