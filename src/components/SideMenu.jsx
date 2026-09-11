import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function SideMenu({ open, onClose, tab, setTab, family }) {
  const { profile, logout } = useAuth();

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Блокировка скролла body при открытом меню
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const menuItems = [
    { id: "home", label: "Статусы", icon: "🏠", desc: "Кто где сейчас" },
    { id: "chats", label: "Чаты", icon: "💬", desc: "Семья и личные" },
    { id: "family", label: "Семья", icon: "👨‍👩‍👧", desc: "Участники и заявки" },
  ];

  return (
    <>
      {/* Оверлей */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 animate-fade-in-overlay"
          onClick={onClose}
        />
      )}

      {/* Меню */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-slate-800 z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Шапка с профилем */}
        <div className="p-5 border-b dark:border-slate-700 bg-gradient-to-br from-indigo-500 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-3xl shadow-md">
              {profile?.avatar || "🐱"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white truncate">
                {profile?.displayName || "Гость"}
              </div>
              <div className="text-xs text-white/80 truncate">
                @{profile?.nick}
              </div>
            </div>
          </div>
          {family && (
            <div className="mt-3 text-xs text-white/90 truncate">
              🏠 {family.name}
            </div>
          )}
        </div>

        {/* Меню */}
        <nav className="flex-1 overflow-y-auto p-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1 text-left transition ${
                tab === item.id
                  ? "bg-indigo-50 dark:bg-indigo-900/30"
                  : "hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
            >
              <div className="text-2xl w-8 text-center">{item.icon}</div>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-medium ${
                    tab === item.id
                      ? "text-primary dark:text-indigo-300"
                      : "dark:text-white"
                  }`}
                >
                  {item.label}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {item.desc}
                </div>
              </div>
            </button>
          ))}
        </nav>

        {/* Низ — выход */}
        <div className="p-3 border-t dark:border-slate-700">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition"
          >
            <div className="text-2xl w-8 text-center">🚪</div>
            <div className="font-medium">Выйти</div>
          </button>
        </div>
      </aside>
    </>
  );
}