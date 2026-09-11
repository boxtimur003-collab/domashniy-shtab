import { useState } from "react";
import { useTheme, BACKGROUNDS, THEMES } from "../context/ThemeContext";

export default function ThemeSwitcher() {
  const { theme, bg, setBg, changeTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const backgrounds = BACKGROUNDS[theme];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 right-3 z-40 w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-xl hover:scale-110 transition"
        title="Настройки вида"
      >
        {theme === "dark" ? "🌙" : "☀️"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in">
          <div className="absolute inset-0" onClick={() => setOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md animate-slide-up shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg dark:text-white">
                🎨 Внешний вид
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="mb-5">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Тема
              </div>
              <div className="flex gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => changeTheme(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      theme === t
                        ? "bg-primary text-white"
                        : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t === "light" ? "☀️ Светлая" : "🌙 Тёмная"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Фон
              </div>
              <div className="grid grid-cols-3 gap-2">
                {backgrounds.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBg(b.id)}
                    className={`aspect-video rounded-lg border-2 transition overflow-hidden ${
                      bg === b.id
                        ? "border-primary scale-105"
                        : "border-transparent"
                    }`}
                    style={{ background: b.css }}
                    title={b.label}
                  />
                ))}
              </div>
              <div className="text-xs text-gray-400 mt-1 text-center">
                {backgrounds.find((b) => b.id === bg)?.label || "Обычный"}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}