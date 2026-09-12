import { useEffect, useRef } from "react";

export default function SearchBar({
  value,
  onChange,
  onClose,
  currentIndex,
  totalResults,
  onPrev,
  onNext,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="flex items-center gap-2 p-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
      <span className="text-gray-400 text-sm px-2">🔍</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Поиск по сообщениям..."
        className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
      />

      {value && (
        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {totalResults > 0 ? `${currentIndex + 1} из ${totalResults}` : "0"}
        </div>
      )}

      {value && totalResults > 0 && (
        <>
          <button
            onClick={onPrev}
            className="w-7 h-7 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition"
            title="Предыдущее"
          >
            ↑
          </button>
          <button
            onClick={onNext}
            className="w-7 h-7 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition"
            title="Следующее"
          >
            ↓
          </button>
        </>
      )}

      <button
        onClick={onClose}
        className="w-7 h-7 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center text-gray-500 transition"
        title="Закрыть"
      >
        ✕
      </button>
    </div>
  );
}