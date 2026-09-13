import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme, THEMES } from "../context/ThemeContext";
import { getOnlineStatus } from "../utils/formatDate";
import {
  getChatBackground,
  CHAT_BACKGROUNDS,
  subscribeToBgChange,
} from "../utils/chatBackgrounds";
import UserAvatar from "../components/UserAvatar";
import Icon from "../components/Icon";
import ChatBackgroundPicker from "../components/ChatBackgroundPicker";
import EditProfileModal from "../components/EditProfileModal";

export default function Settings() {
  const { profile, logout } = useAuth();
  const { theme, changeTheme } = useTheme();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [chatBg, setChatBg] = useState(() => getChatBackground());

  useEffect(() => {
    return subscribeToBgChange(() => {
      setChatBg(getChatBackground());
    });
  }, []);

  const currentBgInfo = CHAT_BACKGROUNDS.find((b) => b.css === chatBg);
  const onlineStatus = getOnlineStatus(profile);

  return (
    <div className="space-y-3">
      {/* Профиль + кнопка Настроить */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <UserAvatar user={profile} size="2xl" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold dark:text-white truncate text-lg">
              {profile?.displayName}
            </div>
            <div className="text-sm text-gray-400 truncate">
              @{profile?.nick}
            </div>
            {onlineStatus.online && (
              <div className="text-xs text-green-500 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                в сети
              </div>
            )}
          </div>
        </div>

        {profile?.bio && (
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words">
            {profile.bio}
          </div>
        )}

        {/* Кнопка Настроить профиль */}
        <button
          onClick={() => setShowEditProfile(true)}
          className="mt-4 w-full bg-primary hover:bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <Icon name="pencil" size={18} />
          Настроить профиль
        </button>
      </div>

      {/* Тема */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="palette" size={18} className="text-gray-500" />
          <h3 className="font-semibold dark:text-white">Тема</h3>
        </div>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => changeTheme(t)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${
                theme === t
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              {t === "dark" ? "Тёмная" : "Светлая"}
            </button>
          ))}
        </div>
      </div>

      {/* Обои чата */}
      <button
        onClick={() => setShowBgPicker(true)}
        className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700/50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex-shrink-0 border dark:border-slate-600"
            style={{
              background: chatBg || undefined,
              backgroundImage: chatBg
                ? undefined
                : "linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%)",
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold dark:text-white">Обои чата</div>
            <div className="text-xs text-gray-400 truncate">
              {currentBgInfo?.label || "По умолчанию"}
            </div>
          </div>
          <Icon name="chevron-right" size={20} className="text-gray-400" />
        </div>
      </button>

      {/* Уведомления */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="bell" size={18} className="text-gray-500" />
          <h3 className="font-semibold dark:text-white">Уведомления</h3>
        </div>
        <p className="text-xs text-gray-400">
          Настройка уведомлений появится позже
        </p>
      </div>

      {/* Выход */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
        {!confirmLogout ? (
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center gap-3 text-red-500 hover:text-red-600 py-2 transition font-medium"
          >
            <Icon name="log-out" size={20} />
            Выйти из аккаунта
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm dark:text-white text-center">
              Точно выйти из аккаунта?
            </p>
            <div className="flex gap-2">
              <button
                onClick={logout}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium transition"
              >
                Да, выйти
              </button>
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg py-2.5 text-sm transition"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {showBgPicker && (
        <ChatBackgroundPicker onClose={() => setShowBgPicker(false)} />
      )}

      {showEditProfile && (
        <EditProfileModal onClose={() => setShowEditProfile(false)} />
      )}
    </div>
  );
}