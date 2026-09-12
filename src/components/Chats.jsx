import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  getDocs,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import DMWindow from "./DMWindow";
import Chat from "./Chat";
import RenameChatModal from "./RenameChatModal";
import { formatMessageDate } from "../utils/formatDate";

export const makeChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");

export default function Chats({ familyId, members = [] }) {
  const { user, profile } = useAuth();
  const [myChats, setMyChats] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [openDM, setOpenDM] = useState(null);
  const [openFamily, setOpenFamily] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [rename, setRename] = useState(null);
  const [searchNick, setSearchNick] = useState("");
  const [searchErr, setSearchErr] = useState("");
  const [searchOk, setSearchOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Подписка на мои личные чаты
  useEffect(() => {
    const q = query(
      collection(db, "dms"),
      where("members", "array-contains", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      chats.sort((a, b) => {
        const aPin = profile?.pinnedChats?.includes(a.id) ? 1 : 0;
        const bPin = profile?.pinnedChats?.includes(b.id) ? 1 : 0;
        if (aPin !== bPin) return bPin - aPin;
        return (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
      });
      setMyChats(chats);
    });
    return unsub;
  }, [user.uid, profile?.pinnedChats]);

  // Входящие запросы (где я получатель)
  useEffect(() => {
    const q = query(
      collection(db, "dm_requests"),
      where("toUid", "==", user.uid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => {
      setIncoming(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user.uid]);

  // Слушаем событие open-dm от ProfileModal
  useEffect(() => {
    const handler = (e) => {
      const { chatId, otherUid } = e.detail;
      setOpenDM({ chatId, other: { uid: otherUid } });
    };
    window.addEventListener("open-dm", handler);
    return () => window.removeEventListener("open-dm", handler);
  }, []);

  const copyMyNick = async () => {
    try {
      await navigator.clipboard.writeText(profile.nick);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.log(e);
    }
  };

  const sendDmRequest = async () => {
    const nick = searchNick.toLowerCase().trim();
    if (!nick) return;
    setSearchErr("");
    setSearchOk("");
    setBusy(true);
    try {
      if (nick === profile.nick) {
        setSearchErr("Это твой ник");
        setBusy(false);
        return;
      }
      const uSnap = await getDocs(
        query(collection(db, "users"), where("nick", "==", nick))
      );
      if (uSnap.empty) {
        setSearchErr("Ник не найден");
        setBusy(false);
        return;
      }
      const target = uSnap.docs[0].data();
      const chatId = makeChatId(user.uid, target.uid);

      const existing = await getDocs(
        query(
          collection(db, "dm_requests"),
          where("chatId", "==", chatId),
          where("status", "in", ["pending", "accepted"])
        )
      );
      if (!existing.empty) {
        setSearchErr("Запрос уже отправлен или чат существует");
        setBusy(false);
        return;
      }

      await setDoc(doc(db, "dms", chatId), {
        id: chatId,
        members: [user.uid, target.uid],
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        lastMessage: "",
      });

      await addDoc(collection(db, "dm_requests"), {
        fromUid: user.uid,
        fromNick: profile.nick,
        fromName: profile.displayName,
        fromAvatar: profile.avatar || "🐱",
        toUid: target.uid,
        toNick: target.nick,
        chatId,
        status: "pending",
        createdAt: Date.now(),
      });

      setSearchOk(`Открыли чат с @${target.nick}. Напиши первое сообщение.`);
      setSearchNick("");
      setShowNewDM(false);
      setOpenDM({
        chatId,
        other: { uid: target.uid },
        pendingRequest: true,
      });
    } catch (e) {
      setSearchErr(e.message);
    }
    setBusy(false);
  };

  const togglePin = async (chatId) => {
    const pinned = profile?.pinnedChats || [];
    const newPinned = pinned.includes(chatId)
      ? pinned.filter((id) => id !== chatId)
      : [...pinned, chatId];
    await updateDoc(doc(db, "users", user.uid), { pinnedChats: newPinned });
  };

  const getMemberInfo = (uid) => members.find((m) => m.uid === uid);

  if (openFamily) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setOpenFamily(false)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition"
        >
          ← Все чаты
        </button>
        <Chat familyId={familyId} members={members} />
      </div>
    );
  }

  if (openDM) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setOpenDM(null)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition"
        >
          ← Все чаты
        </button>
        <DMWindow
          chatId={openDM.chatId}
          other={openDM.other}
          onBack={() => setOpenDM(null)}
          pendingRequest={openDM.pendingRequest}
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b dark:border-slate-700">
        <button
          onClick={() => setShowNewDM(true)}
          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium transition"
        >
          ➕ Новый чат
        </button>
        <button
          onClick={copyMyNick}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
            copied
              ? "bg-green-500 text-white"
              : "bg-gray-100 dark:bg-slate-700 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600"
          }`}
          title="Скопировать мой ник"
        >
          {copied ? "✓" : "📇"} @{profile.nick}
        </button>
      </div>

      <div className="divide-y dark:divide-slate-700">
        {/* Семейный чат */}
        <button
          onClick={() => setOpenFamily(true)}
          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition text-left"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
            👨‍👩‍👧
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold dark:text-white truncate">
              Семейный чат
            </div>
            <div className="text-xs text-gray-400 truncate">
              Общий чат для всей семьи
            </div>
          </div>
        </button>

        {/* Личные чаты */}
        {myChats.map((c) => {
          const otherUid = c.members.find((m) => m !== user.uid);
          const isPinned = profile?.pinnedChats?.includes(c.id);
          const otherInfo = getMemberInfo(otherUid);
          const customName = profile?.chatNames?.[c.id];
          const displayName = customName || otherInfo?.displayName || "Чат";
          const displayAvatar = otherInfo?.avatar || "💬";
          const isPending = incoming.some((r) => r.chatId === c.id);

          return (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer group"
              onClick={() =>
                setOpenDM({
                  chatId: c.id,
                  other: { uid: otherUid, name: otherInfo?.displayName },
                })
              }
            >
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-2xl flex-shrink-0">
                {displayAvatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold dark:text-white truncate flex items-center gap-1">
                  {isPinned && <span>📌</span>}
                  <span className="truncate">{displayName}</span>
                  {isPending && (
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                      ⏳
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {c.lastMessage || "Нет сообщений"}
                  {c.lastMessageAt && (
                    <span className="ml-1">
                      · {formatMessageDate(c.lastMessageAt)}
                    </span>
                  )}
                </div>
              </div>

              <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => togglePin(c.id)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center text-sm transition"
                  title={isPinned ? "Открепить" : "Закрепить"}
                >
                  {isPinned ? "📌" : "📍"}
                </button>
                <button
                  onClick={() =>
                    setRename({ chatId: c.id, current: customName || "" })
                  }
                  className="w-8 h-8 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center text-sm transition"
                  title="Переименовать"
                >
                  ✏️
                </button>
              </div>
            </div>
          );
        })}

        {myChats.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-12">
            <div className="text-4xl mb-2">💬</div>
            <div>Пока нет личных чатов</div>
            <div className="text-xs mt-1">
              Нажми «➕ Новый чат», чтобы начать переписку
            </div>
          </div>
        )}
      </div>

      {/* Модалка «Новый чат» */}
      {showNewDM && (
        <div
          className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-fade-in-overlay"
          onClick={() => setShowNewDM(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-md shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg dark:text-white">
                ➕ Новый чат
              </h3>
              <button
                onClick={() => setShowNewDM(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 mb-3 flex items-center gap-2">
              <div className="text-xl">📇</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Твой ник
                </div>
                <div className="font-mono font-medium dark:text-white text-sm truncate">
                  @{profile.nick}
                </div>
              </div>
              <button
                onClick={copyMyNick}
                className={`px-2 py-1 rounded text-xs transition ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-white dark:bg-slate-700 text-primary hover:bg-indigo-100 dark:hover:bg-slate-600"
                }`}
              >
                {copied ? "✓" : "Копировать"}
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Введи ник собеседника. Ему уйдёт запрос, а ты сможешь написать
              первое сообщение.
            </div>
            <input
              className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="Ник собеседника"
              value={searchNick}
              onChange={(e) =>
                setSearchNick(e.target.value.replace(/\s/g, ""))
              }
            />

            {searchErr && (
              <div className="text-red-500 text-xs mt-2">{searchErr}</div>
            )}
            {searchOk && (
              <div className="text-green-600 dark:text-green-400 text-xs mt-2">
                {searchOk}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={sendDmRequest}
                disabled={busy || !searchNick.trim()}
                className="flex-1 bg-primary hover:bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 transition"
              >
                {busy ? "..." : "Открыть чат"}
              </button>
              <button
                onClick={() => setShowNewDM(false)}
                className="px-4 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg py-2 text-sm transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {rename && (
        <RenameChatModal
          chatId={rename.chatId}
          current={rename.current}
          onClose={() => setRename(null)}
        />
      )}
    </div>
  );
}