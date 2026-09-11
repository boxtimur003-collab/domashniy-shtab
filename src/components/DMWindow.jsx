import { useEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  limit,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { sendNotification } from "../context/NotificationsContext";
import { formatMessageDate } from "../utils/formatDate";
import MessageContextMenu from "./MessageContextMenu";

export default function DMWindow({ chatId, other, onBack }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [otherProfile, setOtherProfile] = useState(null);
  const [menu, setMenu] = useState(null);
  const [editing, setEditing] = useState(null);
  const endRef = useRef(null);
  const longPressTimer = useRef(null);

  // Загрузка профиля собеседника
  useEffect(() => {
    if (!other?.uid) return;
    getDoc(doc(db, "users", other.uid)).then((snap) => {
      if (snap.exists()) setOtherProfile(snap.data());
    });
  }, [other?.uid]);

  // Подписка на сообщения
  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "dms", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(300)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTimeout(
        () => endRef.current?.scrollIntoView({ behavior: "smooth" }),
        80
      );
    });
    return unsub;
  }, [chatId]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const msg = text.trim();
    setText("");
    await addDoc(collection(db, "dms", chatId, "messages"), {
      text: msg,
      uid: user.uid,
      name: profile.displayName,
      avatar: profile.avatar || "🐱",
      createdAt: Date.now(),
      edited: false,
    });
    await updateDoc(doc(db, "dms", chatId), {
      lastMessage: msg,
      lastMessageAt: Date.now(),
    });
    if (other?.uid) {
      await sendNotification({
        toUid: other.uid,
        type: "dm",
        title: `${profile.displayName} прислал(а) сообщение`,
        body: msg.length > 60 ? msg.slice(0, 60) + "..." : msg,
      });
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const newText = editing.text.trim();
    if (!newText) return;
    await updateDoc(doc(db, "dms", chatId, "messages", editing.id), {
      text: newText,
      edited: true,
      editedAt: Date.now(),
    });
    setEditing(null);
  };

  const removeMessage = async (m) => {
    await deleteDoc(doc(db, "dms", chatId, "messages", m.id));
  };

  const openMenu = (x, y, message) => {
    setMenu({ x, y, message });
  };

  const handleContextMenu = (e, m) => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY, m);
  };

  const handleTouchStart = (e, m) => {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      openMenu(touch.clientX, touch.clientY, m);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex flex-col h-[70vh] overflow-hidden relative">
      {/* Хедер */}
      <div className="flex items-center gap-3 p-3 border-b dark:border-slate-700">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl transition"
        >
          ←
        </button>
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xl">
          {otherProfile?.avatar || "🐱"}
        </div>
        <div>
          <div className="font-medium leading-tight dark:text-white">
            {otherProfile?.displayName || "..."}
          </div>
          <div className="text-xs text-gray-400">
            @{otherProfile?.nick || "..."}
          </div>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            Начни переписку первым
          </div>
        )}
        {messages.map((m) => {
          const mine = m.uid === user.uid;
          return (
            <div
              key={m.id}
              className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-base flex-shrink-0 mt-1">
                {m.avatar || "🐱"}
              </div>

              <div
                onContextMenu={(e) => handleContextMenu(e, m)}
                onTouchStart={(e) => handleTouchStart(e, m)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                className={`max-w-[75%] rounded-2xl px-3 py-2 cursor-pointer select-none ${
                  mine
                    ? "bg-primary text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap break-words">
                  {m.text}
                </div>
                <div
                  className={`text-[10px] mt-1 flex items-center gap-1.5 ${
                    mine ? "text-white/70 justify-end" : "text-gray-400"
                  }`}
                >
                  {m.edited && <span>изменено</span>}
                  <span>{formatMessageDate(m.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Ввод */}
      <form
        onSubmit={send}
        className="border-t dark:border-slate-700 p-3 flex gap-2"
      >
        <input
          className="flex-1 border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
          placeholder="Сообщение..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="bg-primary hover:bg-indigo-600 text-white rounded-lg px-4 text-sm transition">
          Отправить
        </button>
      </form>

      {/* Контекстное меню */}
      <MessageContextMenu
        position={menu ? { x: menu.x, y: menu.y } : null}
        onClose={() => setMenu(null)}
        canEdit={menu?.message.uid === user.uid}
        canDelete={true}
        onEdit={() => setEditing({ id: menu.message.id, text: menu.message.text })}
        onDelete={() => removeMessage(menu.message)}
      />

      {/* Модалка редактирования */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-fade-in-overlay">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-md shadow-2xl animate-slide-up">
            <h3 className="font-bold text-lg dark:text-white mb-3">
              ✏️ Редактировать сообщение
            </h3>
            <textarea
              value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              rows={3}
              className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-none"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={saveEdit}
                className="flex-1 bg-primary hover:bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium transition"
              >
                Сохранить
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg py-2 text-sm transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}