export default function MessageReactions({ reactions = {}, myUid, onToggle }) {
  const entries = Object.entries(reactions).filter(
    ([, users]) => users && users.length > 0
  );

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, users]) => {
        const iReacted = users.includes(myUid);
        return (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(emoji);
            }}
            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition ${
              iReacted
                ? "bg-indigo-100 dark:bg-indigo-900 border border-indigo-300 dark:border-indigo-700"
                : "bg-gray-100 dark:bg-slate-700 border border-transparent hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            <span>{emoji}</span>
            <span className="dark:text-white">{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}