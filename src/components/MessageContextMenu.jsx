import { useEffect } from "react";

export default function MessageContextMenu({
  position,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}) {
  // Закрытие по Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!position) return null;

  // Корректируем позицию, чтобы меню не вылезало за экран
  const menuWidth = 200;
  const menuHeight = 110;

  const left = Math.min(
    position.x,
    window.innerWidth - menuWidth - 10
  );
  const top = Math.min(
    position.y,
    window.innerHeight - menuHeight - 10
  );

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />

      <div
        className="fixed z-[61] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border dark:border-slate-600 py-1 w-48 animate-fade-in"
        style={{ left, top }}
      >
        {canEdit && (
          <button
            onClick={() => {
              onEdit();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm dark:text-white flex items-center gap-2 transition"
          >
            ✏️ Редактировать
          </button>
        )}

        {canDelete && (
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-500 flex items-center gap-2 transition"
          >
            🗑️ Удалить
          </button>
        )}

        {!canEdit && !canDelete && (
          <div className="px-4 py-2 text-sm text-gray-400 text-center">
            Нет действий
          </div>
        )}
      </div>
    </>
  );
}