import Icon from "./Icon";

const TABS = [
  { id: "home", label: "Главная", icon: "home" },
  { id: "chats", label: "Чаты", icon: "message-circle" },
  { id: "map", label: "Карта", icon: "map" },
  { id: "settings", label: "Настройки", icon: "settings" },
];

export default function BottomNav({ tab, setTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t dark:border-slate-700">
      <div className="max-w-4xl mx-auto flex">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition ${
                active
                  ? "text-primary"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <Icon name={t.icon} size={24} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}