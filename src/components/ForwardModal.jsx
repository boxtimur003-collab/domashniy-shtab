import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function ForwardModal({ message, onClose, onForward }) {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "dms"),
      where("members", "array-contains", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setChats(list);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const handleForward = async (target) => {
    await onForward(message, target);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 animate-fade-in-overlay"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
          <h3 className="font-bold text-lg dark:text-white">
            🔄 Переслать
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Превью сообщения */}
        <div className="p-3 bg-gray-50 dark:bg-slate-700/50 border-b dark:border-slate-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Сообщение:
          </div>
          <div className="text-sm dark:text-white line-clamp-3 break-words">
            {message.text}
          </div>
        </div>

        {/* Список чатов */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs text-gray-400 px-2 mb-1">
            Переслать в:
          </div>

          {/* Семейный чат */}
          <button
            onClick={() => handleForward({ type: "family" })}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl flex-shrink-0">
              👨‍👩‍👧
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium dark:text-white truncate">
                Семейный чат
              </div>
              <div className="text-xs text-gray-400 truncate">
                Общий чат для всей семьи
              </div>
            </div>
          </button>

          {/* Личные чаты */}
          {loading && (
            <div className="text-center text-gray-400 text-sm py-4">
              Загрузка...
            </div>
          )}

          {!loading && chats.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-4">
              Нет личных чатов
            </div>
          )}

          {chats.map((c) => {
            const otherUid = c.members.find((m) => m !== user.uid);
            const customName = profile?.chatNames?.[c.id];
            const displayName = customName || "Чат";

            return (
              <button
                key={c.id}
                onClick={() =>
                  handleForward({
                    type: "dm",
                    chatId: c.id,
                    otherUid,
                  })
                }
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition text-left"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xl flex-shrink-0">
                  💬
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium dark:text-white truncate">
                    {displayName}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    Личный чат
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg py-2 text-sm transition"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}