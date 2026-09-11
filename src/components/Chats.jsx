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
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { sendNotification } from "../context/NotificationsContext";
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
  const [rename, setRename] = useState(null); // { chatId, current }
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

  // Входящие заявки
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

      await sendNotification({
        toUid: target.uid,
        type: "dm_request",
        title: `${profile.displayName} хочет с тобой общаться`,
        body: `Ник для ответа: @${profile.nick}. Прими или отклони в личных чатах`,
      });

      setSearchOk(`Запрос отправлен @${target.nick}`);
      setSearchNick("");
    } catch (e) {
      setSearchErr(e.message);
    }
    setBusy(false);
  };

  const acceptDm = async (req) => {
    await addDoc(collection(db, "dms"), {
      id: req.chatId,
      members: [user.uid, req.fromUid],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      lastMessage: "",
    });
    await updateDoc(doc(db, "dm_requests", req.id), { status: "accepted" });
    await sendNotification({
      toUid: req.fromUid,
      type: "dm_request",
      title: `${profile.displayName} принял(а) запрос на переписку`,
      body: "Теперь вы можете общаться в личных сообщениях",
    });
  };

  const rejectDm = async (req) => {
    await updateDoc(doc(db, "dm_requests", req.id), { status: "rejected" });
  };

  const togglePin = async (chatId) => {
    const pinned = profile?.pinnedChats || [];
    const newPinned = pinned.includes(chatId)
      ? pinned.filter((id) => id !== chatId)
      : [...pinned, chatId];
    await updateDoc(doc(db, "users", user.uid), { pinnedChats: newPinned });
  };

  const getMemberInfo = (uid) =>
    members.find((m) => m.uid === uid);

  // Если открыт семейный чат
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

  // Если открыт личный чат
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
        />
      </div>
    );
  }

  // Главный список чатов (как в Telegram)
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Верхнее меню */}
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

      {/* Список чатов */}
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

        {/* Входящие заявки — сверху */}
        {incoming.length > 0 && (
          <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-2 px-1">
              📨 Заявки на переписку ({incoming.length})
            </div>
            <div className="space-y-2">
              {incoming.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-lg">
                      {r.fromAvatar}
                    </div>
                    <div>
                      <div className="text-sm font-medium dark:text-white">
                        {r.fromName}
                      </div>
                      <div className="text-xs text-gray-400">
                        @{r.fromNick}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        acceptDm(r);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition"
                    >
                      ✓
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rejectDm(r);
                      }}
                      className="bg-gray-200 dark:bg-slate-600 px-3 py-1 rounded text-xs transition"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Личные чаты */}
        {myChats.map((c) => {
          const otherUid = c.members.find((m) => m !== user.uid);
          const isPinned = profile?.pinnedChats?.includes(c.id);
          const otherInfo = getMemberInfo(otherUid);
          // Локальное имя чата
          const customName = profile?.chatNames?.[c.id];
          const displayName =
            customName || otherInfo?.displayName || "Чат";
          const displayAvatar = otherInfo?.avatar || "💬";

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

              {/* Кнопки действий */}
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

        {/* Пусто */}
        {myChats.length === 0 && incoming.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-12">
            <div className="text-4xl mb-2">💬</div>
            <div>Пока нет личных чатов</div>
            <div className="text-xs mt-1">
              Нажми «➕ Новый чат», чтобы начать переписку
            </div>
          </div>
        )}
      </div>

      {/* Модалка "Новый чат" */}
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
              Введи ник собеседника
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
                {busy ? "..." : "Отправить запрос"}
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

      {/* Модалка переименования */}
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