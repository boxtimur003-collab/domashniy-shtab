import { useState } from "react";
import {
  useAuth,
  AVATARS,
  COLOR_THEMES,
  GRADIENTS,
  SYMBOLS,
} from "../context/AuthContext";
import UserAvatar from "./UserAvatar";
import Icon from "./Icon";

export default function EditProfileModal({ onClose }) {
  const { profile, updateProfile, updateAvatar, reloadProfile } = useAuth();

  const [name, setName] = useState(profile?.displayName || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatar, setAvatar] = useState(profile?.avatar || "🐱");
  const [color, setColor] = useState(profile?.colorTheme || "#6366f1");
  const [symbol, setSymbol] = useState(profile?.symbol || "");
  const [tab, setTab] = useState("main");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (avatar !== profile?.avatar) {
        await updateAvatar(avatar);
      }
      await updateProfile({
        displayName: name.trim() || profile?.nick,
        bio: bio.trim(),
        colorTheme: color,
        symbol,
      });
      await reloadProfile();
      onClose();
    } catch (e) {
      console.error(e);
    }
    setBusy(false);
  };

  const preview = {
    avatar,
    colorTheme: color,
    symbol,
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 animate-fade-in-overlay">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
          <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
            <Icon name="user" size={20} />
            Настроить профиль
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Превью */}
        <div className="p-4 flex flex-col items-center bg-gray-50 dark:bg-slate-700/50">
          <UserAvatar user={preview} size="2xl" />
          <div className="mt-2 font-semibold dark:text-white">
            {name || profile?.nick}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            @{profile?.nick}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === "main" && (
            <>
              <div>
                <label className="text-sm font-medium dark:text-white block mb-1">
                  Имя
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  placeholder="Как тебя звать"
                />
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white block mb-1">
                  О себе
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={200}
                  className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-none"
                  placeholder="Расскажи что-нибудь о себе..."
                />
                <div className="text-xs text-gray-400 text-right mt-1">
                  {bio.length}/200
                </div>
              </div>
            </>
          )}

          {tab === "avatar" && (
            <div className="grid grid-cols-8 gap-1">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setAvatar(emoji)}
                  className={`text-2xl p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800 transition ${
                    avatar === emoji ? "bg-indigo-200 dark:bg-indigo-700" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {tab === "color" && (
            <>
              <div>
                <div className="text-sm font-medium dark:text-white mb-2">
                  Цвета
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_THEMES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`aspect-square rounded-full transition ${
                        color === c
                          ? "ring-4 ring-offset-2 ring-primary dark:ring-offset-slate-800 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium dark:text-white mb-2 mt-4">
                  Градиенты
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {GRADIENTS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setColor(g.css)}
                      className={`aspect-square rounded-full transition ${
                        color === g.css
                          ? "ring-4 ring-offset-2 ring-primary dark:ring-offset-slate-800 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ background: g.css }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "symbol" && (
            <div className="grid grid-cols-8 gap-1">
              <button
                onClick={() => setSymbol("")}
                className={`text-2xl p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800 transition ${
                  symbol === "" ? "bg-indigo-200 dark:bg-indigo-700" : ""
                }`}
                title="Без символа"
              >
                <Icon name="x" size={20} />
              </button>
              {SYMBOLS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSymbol(s)}
                  className={`text-2xl p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800 transition ${
                    symbol === s ? "bg-indigo-200 dark:bg-indigo-700" : ""
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Вкладки */}
        <div className="flex border-t dark:border-slate-700">
          {[
            { id: "main", label: "Имя/Био", icon: "user" },
            { id: "avatar", label: "Аватар", icon: "smile" },
            { id: "color", label: "Цвет", icon: "palette" },
            { id: "symbol", label: "Символ", icon: "star" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs flex flex-col items-center gap-0.5 transition ${
                tab === t.id
                  ? "text-primary dark:text-indigo-400 font-medium"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <Icon name={t.icon} size={18} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Кнопки */}
        <div className="p-3 border-t dark:border-slate-700 flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 bg-primary hover:bg-indigo-600 text-white rounded-lg py-2.5 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Icon name="check" size={18} />
            {busy ? "..." : "Сохранить"}
          </button>
          <button
            onClick={onClose}
            className="px-4 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg py-2.5 transition"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}