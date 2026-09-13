import { useEffect, useRef, useState } from "react";
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
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import DMWindow from "./DMWindow";
import Chat from "./Chat";
import RenameChatModal from "./RenameChatModal";
import ChatContextMenu from "./ChatContextMenu";
import UserAvatar from "./UserAvatar";
import Icon from "./Icon";
import { formatMessageDate } from "../utils/formatDate";

export const makeChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");

export default function Chats({ familyId, members = [], onOpenProfile }) {
  const { user, profile } = useAuth();
  const [myChats, setMyChats] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [openDM, setOpenDM] = useState(null);
  const [openFamily, setOpenFamily] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [rename, setRename] = useState(null);
  const [chatMenu, setChatMenu] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchNick, setSearchNick] = useState("");
  const [searchErr, setSearchErr] = useState("");
  const [searchOk, setSearchOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("all");
  const longPressTimer = useRef(null);

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
        lastSenderUid: null,
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

  const deleteChat = async (chat) => {
    try {
      const msgSnap = await getDocs(collection(db, "dms", chat.id, "messages"));
      await Promise.all(msgSnap.docs.map((d) => deleteDoc(d.ref)));

      const reqSnap = await getDocs(
        query(collection(db, "dm_requests"), where("chatId", "==", chat.id))
      );
      await Promise.all(reqSnap.docs.map((d) => deleteDoc(d.ref)));

      await deleteDoc(doc(db, "dms", chat.id));

      setConfirmDelete(null);
    } catch (e) {
      console.error(e);
      alert("Ошибка удаления: " + e.message);
    }
  };

  const getMemberInfo = (uid) => members.find((m) => m.uid === uid);

  const openChatMenu = (x, y, chat) => {
    setChatMenu({ x, y, chat });
  };

  const handleChatContextMenu = (e, chat) => {
    e.preventDefault();
    openChatMenu(e.clientX, e.clientY, chat);
  };

  const handleChatTouchStart = (e, chat) => {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      openChatMenu(touch.clientX, touch.clientY, chat);
    }, 500);
  };

  const handleChatTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const getPreview = (chat) => {
    const msg = chat.lastMessage || "";
    if (!msg) return "Нет сообщений";
    return msg.length > 80 ? msg.slice(0, 80) + "..." : msg;
  };

  const isLastMine = (chat) => chat.lastSenderUid === user.uid;

  // ============ СЕМЕЙНЫЙ ЧАТ ============
  if (openFamily) {
    return (
      <Chat
        familyId={familyId}
        members={members}
        onOpenProfile={onOpenProfile}
        onBack={() => setOpenFamily(false)}
      />
    );
  }

  // ============ ЛИЧНЫЙ ЧАТ ============
  if (openDM) {
    return (
      <DMWindow
        chatId={openDM.chatId}
        other={openDM.other}
        onBack={() => setOpenDM(null)}
        pendingRequest={openDM.pendingRequest}
        onOpenProfile={onOpenProfile}
        familyId={familyId}
      />
    );
  }

  // ============ ГЛАВНЫЙ СПИСОК ============
  return (
    <div className="relative">
      {/* Горизонтальные табы */}
      <div className="flex gap-2 pb-3 overflow-x-auto scrollbar-none">
        {[
          { id: "all", label: "Все" },
          { id: "unread", label: "Непрочитанные" },
          { id: "family", label: "Семья" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
              tab === t.id
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Список чатов */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Семейный чат */}
        {(tab === "all" || tab === "family") && (
          <button
            onClick={() => setOpenFamily(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition text-left border-b dark:border-slate-700/60"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Icon name="users" size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold dark:text-white truncate">
                  Семейный чат
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                Общий чат для всей семьи
              </div>
            </div>
          </button>
        )}

        {/* Личные чаты */}
        {myChats.map((c) => {
          const otherUid = c.members.find((m) => m !== user.uid);
          const isPinned = profile?.pinnedChats?.includes(c.id);
          const otherInfo = getMemberInfo(otherUid);
          const customName = profile?.chatNames?.[c.id];
          const displayName = customName || otherInfo?.displayName || "Чат";
          const isPending = incoming.some((r) => r.chatId === c.id);
          const lastMine = isLastMine(c);

          return (
            <div
              key={c.id}
              onContextMenu={(e) => handleChatContextMenu(e, c)}
              onTouchStart={(e) => handleChatTouchStart(e, c)}
              onTouchEnd={handleChatTouchEnd}
              onTouchMove={handleChatTouchEnd}
              onClick={() =>
                setOpenDM({
                  chatId: c.id,
                  other: { uid: otherUid, name: otherInfo?.displayName },
                })
              }
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer select-none border-b dark:border-slate-700/60 last:border-0"
            >
              <UserAvatar
                user={
                  otherInfo || {
                    avatar: "💬",
                    uid: otherUid,
                  }
                }
                size="lg"
                showOnline
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <div className="font-semibold dark:text-white truncate flex items-center gap-1">
                    {isPinned && (
                      <Icon
                        name="pin"
                        size={12}
                        className="text-primary flex-shrink-0"
                      />
                    )}
                    <span className="truncate">{displayName}</span>
                    {isPending && (
                      <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                        запрос
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                    {lastMine && (
                      <Icon
                        name="check-check"
                        size={14}
                        className="text-primary"
                      />
                    )}
                    <span>
                      {c.lastMessageAt
                        ? formatMessageDate(c.lastMessageAt)
                        : ""}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {getPreview(c)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Пусто */}
        {myChats.length === 0 && tab !== "family" && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-12 px-4">
            <div className="flex justify-center mb-3">
              <Icon name="message-circle" size={48} />
            </div>
            <div className="font-medium">Пока нет личных чатов</div>
            <div className="text-xs mt-1">
              Нажми «карандаш» внизу справа, чтобы начать переписку
            </div>
          </div>
        )}
      </div>

      {/* Плавающая кнопка */}
      <button
        onClick={() => setShowNewDM(true)}
        className="fixed bottom-24 right-6 z-30 w-14 h-14 rounded-full bg-primary hover:bg-indigo-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition"
        title="Новый чат"
      >
        <Icon name="pencil" size={22} />
      </button>

      {/* Меню чата */}
      {chatMenu && (
        <ChatContextMenu
          position={{ x: chatMenu.x, y: chatMenu.y }}
          chat={chatMenu.chat}
          isPinned={profile?.pinnedChats?.includes(chatMenu.chat.id)}
          onClose={() => setChatMenu(null)}
          onPin={() => togglePin(chatMenu.chat.id)}
          onRename={() => {
            const customName = profile?.chatNames?.[chatMenu.chat.id];
            setRename({ chatId: chatMenu.chat.id, current: customName || "" });
          }}
          onDelete={() => setConfirmDelete(chatMenu.chat)}
        />
      )}

      {/* Удаление */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 animate-fade-in-overlay">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-slide-up">
            <h3 className="font-bold text-lg dark:text-white mb-2 flex items-center gap-2">
              <Icon name="trash-2" size={18} className="text-red-500" />
              Удалить чат?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Все сообщения в этом чате будут удалены у обоих участников. Это
              действие нельзя отменить.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteChat(confirmDelete)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium transition"
              >
                Удалить
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg py-2 text-sm transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

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
              <h3 className="font-bold text-lg dark:text-white">Новый чат</h3>
              <button
                onClick={() => setShowNewDM(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 mb-3 flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <Icon name="user" size={18} className="text-primary" />
              </div>
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
                className={`px-2 py-1 rounded text-xs transition flex items-center gap-1 ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-white dark:bg-slate-700 text-primary hover:bg-indigo-100 dark:hover:bg-slate-600"
                }`}
              >
                {copied ? (
                  <>
                    <Icon name="check" size={12} />
                    <span>Скопировано</span>
                  </>
                ) : (
                  <span>Копировать</span>
                )}
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