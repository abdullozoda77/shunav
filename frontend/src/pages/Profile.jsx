import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import Icon from "../components/Icon.jsx";
import LanguageSwitch from "../components/LanguageSwitch.jsx";
import ThemeSwitch from "../components/ThemeSwitch.jsx";
import { formatDuration } from "../format.js";
import { useApi } from "../hooks.js";
import { LoginFirst } from "./Library.jsx";
import { useT } from "../i18n.jsx";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { data: stats } = useApi(user ? "/me/stats" : null);

  if (!user) return <LoginFirst />;

  const items = [
    { icon: "schedule", label: t("Гӯш карда шуд"), value: stats ? formatDuration(stats.listened_seconds) : "…", color: "text-primary" },
    { icon: "auto_stories", label: t("Китобҳои оғозшуда"), value: stats?.books_started ?? "…", color: "text-secondary" },
    { icon: "task_alt", label: t("Анҷомёфта"), value: stats?.books_finished ?? "…", color: "text-primary" },
    { icon: "favorite", label: t("Дилхоҳ"), value: stats?.favorites ?? "…", color: "text-error" },
    { icon: "bookmark", label: t("Хатчӯбҳо"), value: stats?.bookmarks ?? "…", color: "text-secondary" },
    { icon: "rate_review", label: t("Тақризҳо"), value: stats?.reviews ?? "…", color: "text-primary" },
  ];

  return (
    <div className="px-4 md:px-8 pt-3 md:pt-8 pb-8 flex flex-col gap-5 md:gap-8 max-w-5xl">
      <section className="flex items-center gap-4 md:gap-6 p-4 md:p-8 rounded-2xl bg-surface-container-high">
        <div className="w-16 h-16 md:w-24 md:h-24 md:text-[40px] rounded-full bg-primary text-on-primary flex items-center justify-center font-serif text-headline-md font-bold">{user.name[0]}</div>
        <div className="min-w-0">
          <h1 className="font-serif text-headline-md truncate">{user.name}</h1>
          <p className="text-body-sm text-on-surface-variant truncate">@{user.username} • {user.email}</p>
          {user.is_admin && <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-label-sm">{t("Админ")}</span>}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-headline-sm mb-3">{t("Омори ман")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
          {items.map((item) => (
            <div key={item.label} className="p-3 md:p-5 rounded-xl bg-surface-container flex flex-col gap-1">
              <Icon name={item.icon} size={20} className={item.color} />
              <span className="text-label-lg font-bold">{item.value}</span>
              <span className="text-label-sm text-on-surface-variant">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-headline-sm mb-3">{t("Танзимот")}</h2>
        <div className="grid md:grid-cols-2 gap-2 md:gap-4">
          <div className="p-4 md:p-5 rounded-xl bg-surface-container flex flex-col gap-3">
            <span className="flex items-center gap-2 text-label-md text-on-surface-variant">
              <Icon name="translate" size={20} className="text-secondary" /> {t("Забони сомона")}
            </span>
            <LanguageSwitch full />
            <span className="text-label-sm text-tertiary">{t("Китобҳо бо забони тоҷикӣ мебошанд")}</span>
          </div>
          <div className="p-4 md:p-5 rounded-xl bg-surface-container flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-label-md text-on-surface-variant">
              <Icon name="contrast" size={20} className="text-secondary" /> {t("Мавзӯ")}
            </span>
            <ThemeSwitch />
          </div>
        </div>
      </section>

      {user.is_admin && (
        <a href="/api/docs" target="_blank" rel="noreferrer" className="h-12 rounded-xl bg-surface-container-high flex items-center justify-between px-4">
          <span className="flex items-center gap-3"><Icon name="admin_panel_settings" className="text-secondary" /> {t("Идоракунӣ (API docs)")}</span>
          <Icon name="open_in_new" size={18} />
        </a>
      )}

      <button
        onClick={() => {
          logout();
          navigate("/welcome");
        }}
        className="h-12 md:w-60 rounded-xl bg-surface-container text-error flex items-center justify-center gap-2"
      >
        <Icon name="logout" size={20} /> {t("Баромадан")}
      </button>
    </div>
  );
}
