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
import MessageReactions from "./MessageReactions";
import SearchBar from "./SearchBar";
import UserAvatar from "./UserAvatar";
import ForwardModal from "./ForwardModal";
import PollMessage from "./PollMessage";
import CreatePollModal from "./CreatePollModal";

export default function Chat({ familyId, members = [], onOpenProfile }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [avatars, setAvatars] = useState({});
  const [family, setFamily] = useState(null);
  const [menu, setMenu] = useState(null);
  const [editing, setEditing] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchIdx, setSearchIdx] = useState(0);
  const [pinned, setPinned] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const longPressTimer = useRef(null);
  const scrollToIdRef = useRef(null);

  useEffect(() => {
    if (!familyId) return;
    getDoc(doc(db, "families", familyId)).then((snap) => {
      if (snap.exists()) setFamily({ id: snap.id, ...snap.data() });
    });
  }, [familyId]);

  const isAdmin = family?.adminUid === user.uid;

  useEffect(() => {
    const q = query(
      collection(db, "families", familyId, "messages"),
      orderBy("createdAt", "asc"),
      limit(300)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setPinned(msgs.find((m) => m.pinned));

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
                uid: u.uid,
                avatar: u.avatar || "🐱",
                name: u.displayName || u.nick,
                colorTheme: u.colorTheme || "#6366f1",
                symbol: u.symbol || "",
                nick: u.nick,
                lastSeen: u.lastSeen || null,
              };
            }
          })
        );
        setAvatars(newAvatars);
      }

      setTimeout(() => {
        if (scrollToIdRef.current) {
          const el = document.getElementById(`msg-${scrollToIdRef.current}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.classList.add("highlight-pulse");
          setTimeout(() => el?.classList.remove("highlight-pulse"), 1500);
          scrollToIdRef.current = null;
        } else {
          endRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }, 80);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

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
    if (!text.trim()) return;
    const msg = text.trim();
    const replyData = replyTo
      ? {
          replyTo: {
            id: replyTo.id,
            text: replyTo.text,
            name: replyTo.name,
            uid: replyTo.uid,
          },
        }
      : {};
    setText("");
    setReplyTo(null);

    await addDoc(collection(db, "families", familyId, "messages"), {
      text: msg,
      uid: user.uid,
      name: profile.displayName,
      createdAt: Date.now(),
      edited: false,
      reactions: {},
      ...replyData,
    });

    const mentions = msg.match(/@([a-zA-Z0-9_]+)/g) || [];
    const mentionedNicks = mentions.map((m) => m.slice(1).toLowerCase());

    const famSnap = await getDoc(doc(db, "families", familyId));
    if (famSnap.exists()) {
      const memberUids = famSnap.data().members || [];
      const usersSnap = await Promise.all(
        memberUids.map((uid) => getDoc(doc(db, "users", uid)))
      );
      await Promise.all(
        usersSnap.map(async (uSnap) => {
          if (!uSnap.exists()) return;
          const u = uSnap.data();
          if (u.uid === user.uid) return;

          const isMentioned = mentionedNicks.includes(u.nick);
          if (isMentioned) {
            await sendNotification({
              toUid: u.uid,
              type: "mention",
              title: `${profile.displayName} упомянул(а) тебя`,
              body: msg.length > 60 ? msg.slice(0, 60) + "..." : msg,
            });
          } else if (u.uid !== replyTo?.uid) {
            await sendNotification({
              toUid: u.uid,
              type: "message",
              title: `${profile.displayName} написал(а) в чат семьи`,
              body: msg.length > 60 ? msg.slice(0, 60) + "..." : msg,
            });
          }
        })
      );
    }
  };

  // Создание опроса
  const createPoll = async (question, options) => {
    const votes = {};
    options.forEach((opt) => (votes[opt] = []));

    await addDoc(collection(db, "families", familyId, "messages"), {
      type: "poll",
      question,
      options,
      votes,
      uid: user.uid,
      name: profile.displayName,
      createdAt: Date.now(),
    });

    // Уведомления
    const famSnap = await getDoc(doc(db, "families", familyId));
    if (famSnap.exists()) {
      const memberUids = famSnap.data().members || [];
      await Promise.all(
        memberUids
          .filter((uid) => uid !== user.uid)
          .map((uid) =>
            sendNotification({
              toUid: uid,
              type: "message",
              title: `📊 ${profile.displayName} создал(а) опрос`,
              body: question,
            })
          )
      );
    }
  };

  const toggleReaction = async (messageId, emoji) => {
    const msgRef = doc(db, "families", familyId, "messages", messageId);
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const reactions = msg.reactions || {};
    const users = reactions[emoji] || [];
    const iReacted = users.includes(user.uid);
    const newUsers = iReacted
      ? users.filter((u) => u !== user.uid)
      : [...users, user.uid];

    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: newUsers,
    });
  };

  const togglePinMessage = async (m) => {
    await Promise.all(
      messages
        .filter((msg) => msg.pinned && msg.id !== m.id)
        .map((msg) =>
          updateDoc(doc(db, "families", familyId, "messages", msg.id), {
            pinned: false,
          })
        )
    );
    await updateDoc(doc(db, "families", familyId, "messages", m.id), {
      pinned: !m.pinned,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const newText = editing.text.trim();
    if (!newText) return;
    await updateDoc(doc(db, "families", familyId, "messages", editing.id), {
      text: newText,
      edited: true,
      editedAt: Date.now(),
    });
    setEditing(null);
  };

  const removeMessage = async (m) => {
    await deleteDoc(doc(db, "families", familyId, "messages", m.id));
  };

  const forwardMessage = async (message, target) => {
    const payload = {
      text: message.text,
      uid: user.uid,
      name: profile.displayName,
      createdAt: Date.now(),
      edited: false,
      reactions: {},
      forwardedFrom: message.name,
    };

    if (target.type === "family") {
      await addDoc(collection(db, "families", familyId, "messages"), payload);
    } else {
      await addDoc(collection(db, "dms", target.chatId, "messages"), {
        ...payload,
        avatar: profile.avatar || "🐱",
      });
      await updateDoc(doc(db, "dms", target.chatId), {
        lastMessage: `🔄 ${message.text.slice(0, 40)}`,
        lastMessageAt: Date.now(),
      });
    }
  };

  const startReply = (m) => {
    setReplyTo(m);
    setTimeout(() => inputRef.current?.focus(), 100);
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

  const renderText = (text) => {
    if (!text) return text;
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const nick = part.slice(1).toLowerCase();
        const member = Object.values(avatars).find((u) => u.nick === nick);
        if (member) {
          return (
            <span
              key={i}
              className="text-indigo-400 dark:text-indigo-300 font-medium cursor-pointer hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenProfile) onOpenProfile(member);
              }}
            >
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  const jumpToMessage = (id) => {
    const el = document.getElementById(`msg-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList.add("highlight-pulse");
    setTimeout(() => el?.classList.remove("highlight-pulse"), 1500);
  };

  return (
    <div className="flex flex-col h-[70vh] bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden relative">
      {!searchOpen && (
        <div className="flex items-center justify-between p-2 border-b dark:border-slate-700">
          <div className="text-sm font-medium dark:text-white px-2">
            👨‍👩‍👧 Семейный чат
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowCreatePoll(true)}
              className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-lg transition"
              title="Создать опрос"
            >
              📊
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-lg transition"
              title="Поиск"
            >
              🔍
            </button>
          </div>
        </div>
      )}

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

      {pinned && !searchOpen && (
        <div
          onClick={() => jumpToMessage(pinned.id)}
          className="mx-2 mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border-l-4 border-indigo-500 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
        >
          <div className="text-xs text-indigo-600 dark:text-indigo-300 font-medium mb-0.5">
            📌 Закреплённое
          </div>
          <div className="text-sm dark:text-white truncate">
            {pinned.type === "poll" ? `📊 ${pinned.question}` : pinned.text}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            Пока нет сообщений
          </div>
        )}
        {messages.map((m) => {
          const mine = m.uid === user.uid;
          const info = avatars[m.uid] || { avatar: "🐱", name: m.name };
          const canEdit = mine && m.type !== "poll";
          const canDelete = isAdmin || mine;
          const highlighted = search.trim() ? highlight(m.text) : null;
          const reactions = m.reactions || {};
          const isPoll = m.type === "poll";

          return (
            <div
              key={m.id}
              id={`msg-${m.id}`}
              className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
            >
              <UserAvatar
                user={info}
                size="sm"
                className="mt-1"
                showOnline
                onClick={
                  onOpenProfile && !mine
                    ? (u) => onOpenProfile(u)
                    : undefined
                }
              />
              <div
                className={`max-w-[75%] flex flex-col ${
                  mine ? "items-end" : ""
                }`}
              >
                {!mine && (
                  <div className="text-xs font-medium text-gray-400 mb-0.5 ml-2">
                    {info.name}
                  </div>
                )}
                <div
                  onContextMenu={(e) => handleContextMenu(e, m)}
                  onTouchStart={(e) => handleTouchStart(e, m)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  className={`rounded-2xl px-3 py-2 cursor-pointer select-none relative ${
                    mine
                      ? "bg-primary text-white"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white"
                  }`}
                >
                  {m.pinned && (
                    <div className="absolute -top-1 -left-1 text-xs">📌</div>
                  )}

                  {m.forwardedFrom && (
                    <div
                      className={`text-[10px] mb-1 flex items-center gap-1 ${
                        mine ? "text-white/70" : "text-gray-500"
                      }`}
                    >
                      🔄 Переслано от <b>{m.forwardedFrom}</b>
                    </div>
                  )}

                  {m.replyTo && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        jumpToMessage(m.replyTo.id);
                      }}
                      className={`border-l-2 pl-2 mb-1 cursor-pointer hover:opacity-80 transition ${
                        mine
                          ? "border-white/50 bg-white/10"
                          : "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30"
                      } rounded-r px-2 py-1`}
                    >
                      <div
                        className={`text-[10px] font-medium ${
                          mine
                            ? "text-white/90"
                            : "text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        {m.replyTo.name}
                      </div>
                      <div
                        className={`text-xs truncate ${
                          mine
                            ? "text-white/80"
                            : "text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {m.replyTo.text}
                      </div>
                    </div>
                  )}

                  {isPoll ? (
                    <PollMessage
                      poll={m}
                      chatPath={{ collection: "families", id: familyId }}
                      mine={mine}
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {highlighted || renderText(m.text)}
                    </div>
                  )}

                  <div
                    className={`text-[10px] mt-1 flex items-center gap-1.5 ${
                      mine ? "text-white/70 justify-end" : "text-gray-400"
                    }`}
                  >
                    {m.edited && <span>изменено</span>}
                    <span>{formatMessageDate(m.createdAt)}</span>
                  </div>
                </div>

                {!isPoll && (
                  <MessageReactions
                    reactions={reactions}
                    myUid={user.uid}
                    onToggle={(emoji) => toggleReaction(m.id, emoji)}
                  />
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {replyTo && (
        <div className="border-t dark:border-slate-700 p-2 bg-indigo-50 dark:bg-indigo-900/20 flex items-start gap-2">
          <div className="text-xl">💬</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Ответ на: {replyTo.name}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {replyTo.text}
            </div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl"
          >
            ✕
          </button>
        </div>
      )}

      <form
        onSubmit={send}
        className="border-t dark:border-slate-700 p-3 flex gap-2"
      >
        <input
          ref={inputRef}
          className="flex-1 border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
          placeholder="Сообщение... (@ник для упоминания)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="bg-primary hover:bg-indigo-600 text-white rounded-lg px-4 text-sm transition">
          Отправить
        </button>
      </form>

      <MessageContextMenu
        position={menu ? { x: menu.x, y: menu.y } : null}
        onClose={() => setMenu(null)}
        canEdit={menu?.message.uid === user.uid && menu?.message.type !== "poll"}
        canDelete={isAdmin || menu?.message.uid === user.uid}
        isPinned={menu?.message.pinned}
        reactions={
          menu?.message.reactions
            ? Object.entries(menu.message.reactions)
                .filter(([, users]) => users.includes(user.uid))
                .map(([emoji]) => emoji)
            : []
        }
        onReact={(emoji) => toggleReaction(menu.message.id, emoji)}
        onPin={() => togglePinMessage(menu.message)}
        onReply={() => startReply(menu.message)}
        onForward={() => setForwardMsg(menu.message)}
        onEdit={() =>
          setEditing({ id: menu.message.id, text: menu.message.text })
        }
        onDelete={() => removeMessage(menu.message)}
      />

      {showCreatePoll && (
        <CreatePollModal
          onClose={() => setShowCreatePoll(false)}
          onCreate={createPoll}
        />
      )}

      {forwardMsg && (
        <ForwardModal
          message={forwardMsg}
          onClose={() => setForwardMsg(null)}
          onForward={forwardMessage}
        />
      )}

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