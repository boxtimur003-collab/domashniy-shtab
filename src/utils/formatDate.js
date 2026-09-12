export function formatMessageDate(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const time = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return time;
  if (isYesterday) return `Вчера, ${time}`;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}, ${time}`;
}

export function formatFullDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Онлайн-статус пользователя
// Возвращает { online: bool, text: string }
export function getOnlineStatus(user) {
  if (!user?.lastSeen) return { online: false, text: "" };

  const diff = Date.now() - user.lastSeen;
  const online = diff < 60 * 1000; // меньше минуты — онлайн

  if (online) return { online: true, text: "в сети" };

  const min = Math.floor(diff / 60000);
  if (min < 60) return { online: false, text: `был(а) ${min} мин назад` };

  const hr = Math.floor(min / 60);
  if (hr < 24) return { online: false, text: `был(а) ${hr} ч назад` };

  const days = Math.floor(hr / 24);
  if (days < 7) return { online: false, text: `был(а) ${days} дн назад` };

  return { online: false, text: "давно" };
}