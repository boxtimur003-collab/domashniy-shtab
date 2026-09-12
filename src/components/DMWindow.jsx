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
  setDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { sendNotification } from "../context/NotificationsContext";
import { formatMessageDate } from "../utils/formatDate";
import MessageContextMenu from "./MessageContextMenu";
import SearchBar from "./SearchBar";
import UserAvatar from "./UserAvatar";

export default function DMWindow({
  chatId,
  other,
  onBack,
  pendingRequest,
  onOpenProfile,
}) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [otherProfile, setOtherProfile] = useState(null);
  const [menu, setMenu] = useState(null);
  const [editing, setEditing] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchIdx, setSearchIdx] = useState(0);
  const [request, setRequest] = useState(pendingRequest || null);
  const endRef = useRef(null);
  const longPressTimer = useRef(null);
  const scrollToIdRef = useRef(null);

  useEffect(() => {
    if (!other?.uid) return;
    getDoc(doc(db, "users", other.uid)).then((snap) => {
      if (snap.exists()) setOtherProfile(snap.data());
    });
  }, [other?.uid]);

  useEffect(() => {
    if (!chatId) return;
    getDocs(
      query(
        collection(db, "dm_requests"),
        where("chatId", "==", chatId),
        where("status", "==", "pending")
      )
    ).then((snap) => {
      if (!snap.empty) {
        setRequest({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    });
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "dms", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(300)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTimeout(() => {
        if (scrollToIdRef.current) {
          const el = document.getElementById(`msg-${scrollToIdRef.current}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          scrollToIdRef.current = null;
        } else {
          endRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }, 80);
    });
    return unsub;
  }, [chatId]);

  const iAmRequester = request?.fromUid === user.uid;
  const iAmReceiver = request?.toUid === user.uid;
  const isPending = !!request;
  const canWrite = !isPending || (iAmRequester && messages.length === 0);

  const searchResults = search.trim()
    ? messages.filter((m) =>
        m.text?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const goToResult = (idx) => {
    if (searchResults.length === 0) return;
    const clamped = (idx + searchResults.length) % searchResults.length;
    setSearchIdx(clamped);
    const msgId = searchResults[clamped].id;
    const el = document.getElementById(`msg-${msgId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !canWrite) return;
    const msg = text.trim();
    setText("");
    const isFirstMessage = isPending && iAmRequester && messages.length === 0;

    await addDoc(collection(db, "dms", chatId, "messages"), {
      text: msg,
      uid: user.uid,
      name: profile.displayName,
      avatar: profile.avatar || "🐱",
      createdAt: Date.now(),
      edited: false,
    });

    await setDoc(
      doc(db, "dms", chatId),
      {
        lastMessage: msg,
        lastMessageAt: Date.now(),
      },
      { merge: true }
    );

    if (isFirstMessage && request) {
      await updateDoc(doc(db, "dm_requests", request.id), {
        firstMessage: msg,
      });
      await sendNotification({
        toUid: request.toUid,
        type: "dm_request",
        title: `${profile.displayName} хочет с тобой общаться`,
        body: msg.length > 60 ? msg.slice(0, 60) + "..." : msg,
      });
    } else if (!isPending && other?.uid) {
      await sendNotification({
        toUid: other.uid,
        type: "dm",
        title: `${profile.displayName} прислал(а) сообщение`,
        body: msg.length > 60 ? msg.slice(0, 60) + "..." : msg,
      });
    }
  };

  const acceptRequest = async () => {
    if (!request) return;
    await updateDoc(doc(db, "dm_requests", request.id), {
      status: "accepted",
    });
    await sendNotification({
      toUid: request.fromUid,
      type: "dm_request",
      title: `${profile.displayName} принял(а) запрос`,
      body: "Теперь вы можете общаться",
    });
    setRequest(null);
  };

  const rejectRequest = async () => {
    if (!request) return;
    const msgSnap = await getDocs(collection(db, "dms", chatId, "messages"));
    await Promise.all(msgSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, "dm_requests", request.id));
    await deleteDoc(doc(db, "dms", chatId));
    setRequest(null);
    onBack();
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

  const openMenu = (x, y, message) => setMenu({ x, y, message });

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

  const highlight = (text) => {
    if (!search.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${search})`, "gi"));
    return parts.map((p, i) =>
      p.toLowerCase() === search.toLowerCase() ? (
        <mark
          key={i}
          className="bg-yellow-200 dark:bg-yellow-600 dark:text-white rounded px-0.5"
        >
          {p}
        </mark>
      ) : (
        p
      )
    );
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
        <UserAvatar
          user={otherProfile}
          size="md"
          onClick={
            onOpenProfile ? (u) => onOpenProfile(u) : undefined
          }
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium leading-tight dark:text-white truncate">
            {otherProfile?.displayName || "..."}
          </div>
          <div className="text-xs text-gray-400 truncate">
            @{otherProfile?.nick || "..."}
          </div>
        </div>
        <button
          onClick={() => {
            setSearchOpen(!searchOpen);
            setSearch("");
          }}
          className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-lg transition"
          title="Поиск"
        >
          🔍
        </button>
      </div>

      {searchOpen && (
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setSearchIdx(0);
          }}
          onClose={() => {
            setSearchOpen(false);
            setSearch("");
          }}
          currentIndex={searchIdx}
          totalResults={searchResults.length}
          onPrev={() => goToResult(searchIdx - 1)}
          onNext={() => goToResult(searchIdx + 1)}
        />
      )}

      {isPending && iAmReceiver && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-b dark:border-slate-700">
          <div className="text-sm dark:text-white mb-2">
            ⏳ <b>{request.fromName}</b> (@{request.fromNick}) хочет с тобой
            общаться
          </div>
          <div className="flex gap-2">
            <button
              onClick={acceptRequest}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 text-sm font-medium transition"
            >
              ✅ Принять
            </button>
            <button
              onClick={rejectRequest}
              className="flex-1 bg-gray-200 dark:bg-slate-700 dark:text-white rounded-lg py-2 text-sm transition"
            >
              🗑️ Удалить
            </button>
          </div>
        </div>
      )}

      {isPending && iAmRequester && messages.length > 0 && (
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 border-b dark:border-slate-700 text-xs text-center dark:text-indigo-300">
          ⏳ Ожидает принятия. Собеседник ещё не ответил.
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            {isPending && iAmRequester
              ? "Напиши первое сообщение — оно уйдёт как запрос"
              : "Начни переписку"}
          </div>
        )}
        {messages.map((m) => {
          const mine = m.uid === user.uid;
          const highlighted = search.trim()
            ? highlight(m.text || "")
            : m.text;
          return (
            <div
              key={m.id}
              id={`msg-${m.id}`}
              className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
            >
              <UserAvatar
                avatar={m.avatar}
                size="sm"
                className="mt-1"
              />
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
                  {highlighted}
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

      <form
        onSubmit={send}
        className="border-t dark:border-slate-700 p-3 flex gap-2"
      >
        {canWrite ? (
          <>
            <input
              className="flex-1 border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder={
                isPending && iAmRequester
                  ? "Первое сообщение..."
                  : "Сообщение..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="bg-primary hover:bg-indigo-600 text-white rounded-lg px-4 text-sm transition">
              Отправить
            </button>
          </>
        ) : (
          <div className="flex-1 text-center text-sm text-gray-500 dark:text-gray-400 py-2">
            {iAmReceiver
              ? "Прими запрос, чтобы отвечать"
              : "Ожидай принятия запроса"}
          </div>
        )}
      </form>

      <MessageContextMenu
        position={menu ? { x: menu.x, y: menu.y } : null}
        onClose={() => setMenu(null)}
        canEdit={menu?.message.uid === user.uid}
        canDelete={true}
        onEdit={() =>
          setEditing({ id: menu.message.id, text: menu.message.text })
        }
        onDelete={() => removeMessage(menu.message)}
      />

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-fade-in-overlay">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-md shadow-2xl animate-slide-up">
            <h3 className="font-bold text-lg dark:text-white mb-3">
              ✏️ Редактировать
            </h3>
            <textarea
              value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              rows={3}
              autoFocus
              className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-none"
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