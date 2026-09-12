import { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  setDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "./UserAvatar";

// Локальная функция — НЕ экспортируем (чтобы не конфликтовать с Chats.jsx)
const makeChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");

export default function ProfileModal({ user, onClose }) {
  const { profile: me } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!user) return null;

  const isMe = user.uid === me?.uid;

  const handleWrite = async () => {
    if (busy) return;
    setBusy(true);
    setErr("");

    try {
      const chatId = makeChatId(me.uid, user.uid);

      // Проверяем, есть ли уже запрос/чат
      const existingReq = await getDocs(
        query(
          collection(db, "dm_requests"),
          where("chatId", "==", chatId),
          where("status", "in", ["pending", "accepted"])
        )
      );

      if (existingReq.empty) {
        // Создаём dm-чат
        await setDoc(doc(db, "dms", chatId), {
          id: chatId,
          members: [me.uid, user.uid],
          createdAt: Date.now(),
          lastMessageAt: Date.now(),
          lastMessage: "",
        });

        // Создаём запрос
        await addDoc(collection(db, "dm_requests"), {
          fromUid: me.uid,
          fromNick: me.nick,
          fromName: me.displayName,
          fromAvatar: me.avatar || "🐱",
          toUid: user.uid,
          toNick: user.nick,
          chatId,
          status: "pending",
          createdAt: Date.now(),
        });
      }

      // Открываем DM-окно
      onClose?.();
      // Даём React время закрыть модалку, потом переключаем таб
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("open-dm", {
            detail: { chatId, otherUid: user.uid },
          })
        );
      }, 100);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 animate-fade-in-overlay"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-24 relative"
          style={{
            background: user.colorTheme || "#6366f1",
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 -mt-12">
          <div className="flex justify-center mb-3">
            <div className="rounded-full bg-white dark:bg-slate-800 p-1">
              <UserAvatar user={user} size="2xl" />
            </div>
          </div>

          <div className="text-center mb-4">
            <div className="text-xl font-bold dark:text-white">
              {user.displayName || "Без имени"}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              @{user.nick}
            </div>
          </div>

          {user.bio && (
            <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 mb-4">
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                О себе
              </div>
              <div className="text-sm dark:text-white whitespace-pre-wrap break-words">
                {user.bio}
              </div>
            </div>
          )}

          {!user.bio && !isMe && (
            <div className="text-center text-sm text-gray-400 dark:text-gray-500 mb-4">
              Пользователь пока не рассказал о себе
            </div>
          )}

          {err && (
            <div className="text-red-500 text-xs text-center mb-2">{err}</div>
          )}

          {!isMe && (
            <button
              onClick={handleWrite}
              disabled={busy}
              className="w-full bg-primary hover:bg-indigo-600 text-white rounded-xl py-3 font-medium transition disabled:opacity-50"
            >
              {busy ? "..." : "💬 Написать"}
            </button>
          )}

          {isMe && (
            <div className="text-center text-xs text-gray-400">
              Это твой профиль
            </div>
          )}
        </div>
      </div>
    </div>
  );
}