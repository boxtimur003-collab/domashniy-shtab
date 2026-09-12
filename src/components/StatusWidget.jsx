import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth, AVATARS } from "../context/AuthContext";

const PRESETS = [
  { label: "Дома", emoji: "🏠" },
  { label: "На работе", emoji: "💼" },
  { label: "В школе", emoji: "🎓" },
  { label: "В пути", emoji: "🚗" },
  { label: "На тренировке", emoji: "🏋️" },
  { label: "Сплю", emoji: "😴" },
  { label: "Гуляю", emoji: "🌳" },
];

export default function StatusWidget() {
  const { user, profile, reloadProfile, updateAvatar } = useAuth();
  const [custom, setCustom] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const setStatus = async (label, emoji) => {
    await updateDoc(doc(db, "users", user.uid), {
      status: label,
      statusEmoji: emoji,
    });
    reloadProfile();
  };

  const color = profile?.colorTheme || "#6366f1";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setShowAvatarPicker(!showAvatarPicker)}
          className="relative flex-shrink-0 hover:scale-105 transition"
        >
          <div
            className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-900 flex items-center justify-center text-3xl"
            style={{ border: `2px solid ${color}` }}
          >
            {profile?.avatar || "🐱"}
          </div>
          {profile?.symbol && (
            <div
              className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full px-1 text-base leading-none shadow-sm"
              style={{ border: `1.5px solid ${color}` }}
            >
              {profile.symbol}
            </div>
          )}
        </button>
        <div>
          <h2 className="font-semibold dark:text-white">
            Привет, {profile?.displayName}!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Сейчас: <b>{profile?.statusEmoji} {profile?.status}</b>
          </p>
        </div>
      </div>

      {showAvatarPicker && (
        <div className="grid grid-cols-8 gap-1 p-2 mb-3 bg-gray-50 dark:bg-slate-700 rounded-lg max-h-40 overflow-y-auto">
          {AVATARS.map((emoji) => (
            <button
              key={emoji}
              onClick={async () => {
                await updateAvatar(emoji);
                setShowAvatarPicker(false);
              }}
              className={`text-2xl p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800 transition ${
                profile?.avatar === emoji
                  ? "bg-indigo-200 dark:bg-indigo-700"
                  : ""
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <h3 className="font-medium text-sm mb-2 dark:text-white">Мой статус</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setStatus(p.label, p.emoji)}
            className={`px-3 py-2 rounded-lg text-sm border transition ${
              profile?.status === p.label
                ? "bg-primary text-white border-primary"
                : "bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 dark:text-white dark:border-slate-600"
            }`}
          >
            {p.emoji} {p.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
          placeholder="Свой статус..."
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <button
          onClick={() => {
            if (custom.trim()) {
              setStatus(custom.trim(), "📌");
              setCustom("");
            }
          }}
          className="bg-primary hover:bg-indigo-600 text-white rounded-lg px-4 text-sm transition"
        >
          ОК
        </button>
      </div>
    </div>
  );
}