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
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { sendNotification } from "../context/NotificationsContext";

export default function Chat({ familyId }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [avatars, setAvatars] = useState({});
  const endRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, "families", familyId, "messages"),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);

      const uids = [...new Set(msgs.map((m) => m.uid))];
      const missing = uids.filter((uid) => !avatars[uid]);
      if (missing.length > 0) {
        const newAvatars = { ...avatars };
        await Promise.all(
          missing.map(async (uid) => {
            const uSnap = await getDoc(doc(db, "users", uid));
            if (uSnap.exists()) {
              const u = uSnap.data();
              newAvatars[uid] = {
                avatar: u.avatar || "🐱",
                name: u.displayName || u.nick,
              };
            }
          })
        );
        setAvatars(newAvatars);
      }

      setTimeout(
        () => endRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    });
    return unsub;
  }, [familyId]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const msg = text.trim();
    setText("");
    await addDoc(collection(db, "families", familyId, "messages"), {
      text: msg,
      uid: user.uid,
      name: profile.displayName,
      createdAt: Date.now(),
    });

    // уведомления всем членам семьи (кроме себя)
    const famSnap = await getDoc(doc(db, "families", familyId));
    if (famSnap.exists()) {
      const members = famSnap.data().members || [];
      await Promise.all(
        members
          .filter((uid) => uid !== user.uid)
          .map((uid) =>
            sendNotification({
              toUid: uid,
              type: "message",
              title: `${profile.displayName} написал(а) в чат семьи`,
              body: msg.length > 60 ? msg.slice(0, 60) + "..." : msg,
            })
          )
      );
    }
  };

  return (
    <div className="flex flex-col h-[70vh] bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            Пока нет сообщений
          </div>
        )}
        {messages.map((m) => {
          const mine = m.uid === user.uid;
          const info = avatars[m.uid] || { avatar: "🐱", name: m.name };
          return (
            <div
              key={m.id}
              className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-base flex-shrink-0 mt-1">
                {info.avatar}
              </div>
              <div
                className={`max-w-[75%] ${
                  mine ? "items-end" : ""
                } flex flex-col`}
              >
                {!mine && (
                  <div className="text-xs font-medium text-gray-400 mb-0.5 ml-2">
                    {info.name}
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3 py-2 ${
                    mine
                      ? "bg-primary text-white"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {m.text}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
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
    </div>
  );
}