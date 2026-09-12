import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "./UserAvatar";
import EditProfileModal from "./EditProfileModal";

export default function SideMenu({
  open,
  onClose,
  tab,
  setTab,
  family,
  onOpenProfile,
}) {
  const { profile, logout } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const menuItems = [
    { id: "home", label: "Статусы", icon: "🏠", desc: "Кто где сейчас" },
    { id: "chats", label: "Чаты", icon: "💬", desc: "Семья и личные" },
    { id: "map", label: "Карта", icon: "🗺️", desc: "Где члены семьи" },
    { id: "family", label: "Семья", icon: "👨‍👩‍👧", desc: "Участники и заявки" },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 animate-fade-in-overlay"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-slate-800 z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Шапка — карточка профиля */}
        <div className="p-5 border-b dark:border-slate-700 bg-gradient-to-br from-indigo-500 to-purple-600">
          <div className="flex items-center gap-3">
            <UserAvatar
              user={profile}
              size="xl"
              className="border-4 border-white/40 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white truncate">
                {profile?.displayName || "Гость"}
              </div>
              <div className="text-xs text-white/80 truncate">
                @{profile?.nick}
              </div>
            </div>
          </div>

          {/* Кнопки под профилем */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                onClose();
                if (onOpenProfile) onOpenProfile(profile);
              }}
              className="flex-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded-lg py-1.5 transition"
            >
              👤 Профиль
            </button>
            <button
              onClick={() => {
                setEditOpen(true);
              }}
              className="flex-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded-lg py-1.5 transition"
            >
              ⚙️ Настроить
            </button>
          </div>

          {family && (
            <div className="mt-3 text-xs text-white/90 truncate">
              🏠 {family.name}
            </div>
          )}
        </div>

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

      {editOpen && (
        <EditProfileModal onClose={() => setEditOpen(false)} />
      )}
    </>
  );
}