// "8 соат 45 дақ", "12 дақ"
export function formatDuration(seconds) {
  const total = Math.round(seconds || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours && minutes) return `${hours} соат ${minutes} дақ`;
  if (hours) return `${hours} соат`;
  if (minutes) return `${minutes} дақ`;
  return `${total} сония`;
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
  if (days < 1) return "имрӯз";
  if (days < 7) return `${days} рӯз пеш`;
  if (days < 30) return `${Math.floor(days / 7)} ҳафта пеш`;
  return new Date(date).toLocaleDateString("ru-RU");
}

export function percent(part, whole) {
  if (!whole) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}
