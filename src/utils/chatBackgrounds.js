// Пресеты обоев чата — применяются ко всем чатам
// Хранятся в localStorage

export const CHAT_BACKGROUNDS = [
  { id: "default", label: "По умолчанию", css: null },
  {
    id: "sunset",
    label: "Закат",
    css: "linear-gradient(135deg, #FFE5D9 0%, #FFD6BA 50%, #FCE1CB 100%)",
  },
  {
    id: "mint",
    label: "Мята",
    css: "linear-gradient(135deg, #E0F7F4 0%, #C7F0EA 50%, #B0E9E1 100%)",
  },
  {
    id: "lavender",
    label: "Лаванда",
    css: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 50%, #C4B5FD 100%)",
  },
  {
    id: "peach",
    label: "Персик",
    css: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%)",
  },
  {
    id: "sky",
    label: "Небо",
    css: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 50%, #93C5FD 100%)",
  },
  {
    id: "forest",
    label: "Лес",
    css: "linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 50%, #6EE7B7 100%)",
  },
  {
    id: "rose",
    label: "Роза",
    css: "linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 50%, #F9A8D4 100%)",
  },
  {
    id: "midnight",
    label: "Полночь",
    css: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
  },
  {
    id: "wine",
    label: "Вино",
    css: "linear-gradient(135deg, #4c1d24 0%, #7f1d1d 100%)",
  },
  {
    id: "ocean",
    label: "Океан",
    css: "linear-gradient(135deg, #0c4a6e 0%, #0e7490 100%)",
  },
  {
    id: "purple",
    label: "Пурпур",
    css: "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)",
  },
  {
    id: "wood",
    label: "Дерево",
    css: "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
  },
];

// Получить текущие обои
export function getChatBackground() {
  try {
    const raw = localStorage.getItem("shtab_chat_bg");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.css || null;
  } catch (e) {
    return null;
  }
}

// Установить обои
export function setChatBackground(bg) {
  if (!bg || bg.id === "default") {
    localStorage.removeItem("shtab_chat_bg");
  } else {
    localStorage.setItem("shtab_chat_bg", JSON.stringify(bg));
  }
}

// Подписка на изменения (для обновления во всех компонентах)
const listeners = new Set();

export function subscribeToBgChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function notifyBgChange() {
  listeners.forEach((cb) => cb());
}