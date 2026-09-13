import { useEffect } from "react";
import Icon from "./Icon";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export default function MessageContextMenu({
  position,
  onClose,
  onEdit,
  onDelete,
  onReply,
  onForward,
  onReact,
  onPin,
  isPinned,
  canEdit,
  canDelete,
  reactions = [],
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!position) return null;

  const menuWidth = 240;
  const menuHeight = 340;
  const left = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const top = Math.min(position.y, window.innerHeight - menuHeight - 10);

  const hasActions = onEdit || onDelete || onReply || onForward || onPin;

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />

      <div
        className="fixed z-[61] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border dark:border-slate-600 py-1 w-56 animate-fade-in overflow-hidden"
        style={{ left, top }}
      >
        {/* Реакции — эмодзи, оставляем (это контент) */}
        {onReact && (
          <div className="flex gap-1 px-2 py-2 border-b dark:border-slate-700">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  onClose();
                }}
                className={`w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-lg transition ${
                  reactions.includes(emoji)
                    ? "bg-indigo-100 dark:bg-indigo-900"
                    : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Ответить */}
        {onReply && (
          <button
            onClick={() => {
              onReply();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm dark:text-white flex items-center gap-2 transition"
          >
            <Icon name="reply" size={16} />
            Ответить
          </button>
        )}

        {/* Переслать */}
        {onForward && (
          <button
            onClick={() => {
              onForward();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm dark:text-white flex items-center gap-2 transition"
          >
            <Icon name="forward" size={16} />
            Переслать
          </button>
        )}

        {/* Закрепить */}
        {onPin && (
          <button
            onClick={() => {
              onPin();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm dark:text-white flex items-center gap-2 transition"
          >
            <Icon name="pin" size={16} />
            {isPinned ? "Открепить" : "Закрепить"}
          </button>
        )}

        {/* Редактировать */}
        {canEdit && onEdit && (
          <button
            onClick={() => {
              onEdit();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm dark:text-white flex items-center gap-2 transition"
          >
            <Icon name="pencil" size={16} />
            Редактировать
          </button>
        )}

        {/* Удалить */}
        {canDelete && onDelete && (
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-500 flex items-center gap-2 transition border-t dark:border-slate-700"
          >
            <Icon name="trash-2" size={16} />
            Удалить
          </button>
        )}

        {!hasActions && !onReact && (
          <div className="px-4 py-2 text-sm text-gray-400 text-center">
            Нет действий
          </div>
        )}
      </div>
    </>
  );
}