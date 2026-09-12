import { useEffect } from "react";

export default function ChatContextMenu({
  position,
  chat,
  isPinned,
  onClose,
  onPin,
  onRename,
  onDelete,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!position || !chat) return null;

  const menuWidth = 220;
  const menuHeight = 150;
  const left = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const top = Math.min(position.y, window.innerHeight - menuHeight - 10);

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />

      <div
        className="fixed z-[61] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border dark:border-slate-600 py-1 w-52 animate-fade-in overflow-hidden"
        style={{ left, top }}
      >
        <button
          onClick={() => {
            onPin();
            onClose();
          }}
          className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm dark:text-white flex items-center gap-2 transition"
        >
          {isPinned ? "📍 Открепить" : "📌 Закрепить"}
        </button>

        <button
          onClick={() => {
            onRename();
            onClose();
          }}
          className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm dark:text-white flex items-center gap-2 transition"
        >
          ✏️ Переименовать
        </button>

        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-500 flex items-center gap-2 transition border-t dark:border-slate-700"
        >
          🗑️ Удалить чат
        </button>
      </div>
    </>
  );
}