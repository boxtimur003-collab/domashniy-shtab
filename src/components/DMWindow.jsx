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
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { sendNotification } from "../context/NotificationsContext";

export default function DMWindow({ chatId, other, onBack }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [otherProfile, setOtherProfile] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!other?.uid) return;
    getDoc(doc(db, "users", other.uid)).then((snap) => {
      if (snap.exists()) setOtherProfile(snap.data());
    });
  }, [other?.uid]);

  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "dms", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTimeout(
        () => endRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex flex-col h-[70vh] overflow-hidden">
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
                className={`max-w-[75%] rounded-2xl px-3 py-2 ${
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