import { useState } from "react";
import {
  CHAT_BACKGROUNDS,
  getChatBackground,
  setChatBackground,
  notifyBgChange,
} from "../utils/chatBackgrounds";
import Icon from "./Icon";

export default function ChatBackgroundPicker({ onClose }) {
  const [selected, setSelected] = useState(() => {
    const current = getChatBackground();
    return (
      CHAT_BACKGROUNDS.find((b) => b.css === current) ||
      CHAT_BACKGROUNDS[0]
    );
  });

  const save = () => {
    setChatBackground(selected);
    notifyBgChange();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 animate-fade-in-overlay"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg dark:text-white">🖼️ Обои чата</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Превью */}
        <div
          className="h-28 rounded-xl mb-4 flex items-center justify-center text-xs text-gray-500 border dark:border-slate-700"
          style={{ background: selected.css || undefined }}
        >
          {!selected.css && "По умолчанию"}
        </div>

        {/* Пресеты */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {CHAT_BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              onClick={() => setSelected(bg)}
              className={`aspect-video rounded-lg border-2 transition overflow-hidden ${
                selected.id === bg.id
                  ? "border-primary scale-105"
                  : "border-transparent hover:scale-105"
              }`}
              style={{
                background: bg.css || undefined,
                border: bg.css ? undefined : "1px solid #e5e7eb",
              }}
              title={bg.label}
            />
          ))}
        </div>

        <div className="text-xs text-gray-400 text-center mb-4">
          {selected.label}
        </div>

        <div className="flex gap-2">
          <button
            onClick={save}
            className="flex-1 bg-primary hover:bg-indigo-600 text-white rounded-lg py-2.5 font-medium transition"
          >
            💾 Применить
          </button>
          <button
            onClick={onClose}
            className="px-4 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg py-2.5 text-sm transition"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}