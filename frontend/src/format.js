import { getCurrentLanguage, translate } from "./translations.js";

// "8 соат 45 дақ", "12 дақ" (in the site's language: "8 ч 45 мин", "8 h 45 min")
export function formatDuration(seconds) {
  const total = Math.round(seconds || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const [h, m, s] = [translate("соат"), translate("дақ"), translate("сония")];
  if (hours && minutes) return `${hours} ${h} ${minutes} ${m}`;
  if (hours) return `${hours} ${h}`;
  if (minutes) return `${minutes} ${m}`;
  return `${total} ${s}`;
}

// 14:32 or 1:02:05
export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${secs}`;
  return `${minutes}:${secs}`;
}

// "2 рӯз пеш"
export function timeAgo(date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days < 1) return translate("имрӯз");
  if (days < 7) return translate("{n} рӯз пеш", { n: days });
  if (days < 30) return translate("{n} ҳафта пеш", { n: Math.floor(days / 7) });
  return new Date(date).toLocaleDateString(getCurrentLanguage() === "en" ? "en-GB" : "ru-RU");
}

export function percent(part, whole) {
  if (!whole) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}
