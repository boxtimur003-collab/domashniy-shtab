import { useState } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function RenameChatModal({ chatId, current, onClose, onSave }) {
  const { user, reloadProfile } = useAuth();
  const [name, setName] = useState(current || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const chatNames = snap.data()?.chatNames || {};
      const newNames = { ...chatNames };
      if (name.trim()) {
        newNames[chatId] = name.trim();
      } else {
        delete newNames[chatId]; // пусто = сброс
      }
      await updateDoc(doc(db, "users", user.uid), {
        chatNames: newNames,
      });
      await reloadProfile();
      onSave?.();
      onClose();
    } catch (e) {
      console.error(e);
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-fade-in-overlay">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-md shadow-2xl animate-slide-up">
        <h3 className="font-bold text-lg dark:text-white mb-1">
          ✏️ Переименовать чат
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Название видно только тебе (локально)
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя чата"
          autoFocus
          maxLength={30}
          className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
        />

        {current && (
          <button
            onClick={() => setName("")}
            className="text-xs text-red-500 hover:underline mt-2"
          >
            Сбросить на стандартное
          </button>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 bg-primary hover:bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 transition"
          >
            {busy ? "..." : "Сохранить"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg py-2 text-sm transition"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}