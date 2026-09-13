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
import { formatMessageDate, getOnlineStatus } from "../utils/formatDate";
import {
  getChatBackground,
  subscribeToBgChange,
} from "../utils/chatBackgrounds";
import MessageContextMenu from "./MessageContextMenu";
import MessageReactions from "./MessageReactions";
import SearchBar from "./SearchBar";
import UserAvatar from "./UserAvatar";
import ForwardModal from "./ForwardModal";
import PollMessage from "./PollMessage";
import CreatePollModal from "./CreatePollModal";
import ChatHeader from "./ChatHeader";
import Icon from "./Icon";

export default function DMWindow({
  chatId,
  other,
  onBack,
  pendingRequest,
  onOpenProfile,
  familyId,
}) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [otherProfile, setOtherProfile] = useState(null);
  const [menu, setMenu] = useState(null);
  const [editing, setEditing] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchIdx, setSearchIdx] = useState(0);
  const [request, setRequest] = useState(pendingRequest || null);
  const [chatBg, setChatBg] = useState(() => getChatBackground());
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const longPressTimer = useRef(null);
  const scrollToIdRef = useRef(null);

  useEffect(() => {
    return subscribeToBgChange(() => {
      setChatBg(getChatBackground());
    });
  }, []);

  useEffect(() => {
    if (!other?.uid) return;
    const unsub = onSnapshot(doc(db, "users", other.uid), (snap) => {
      if (snap.exists()) setOtherProfile(snap.data());
    });
    return unsub;
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
          el?.classList.add("highlight-pulse");
          setTimeout(() => el?.classList.remove("highlight-pulse"), 1500);
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
    const isFirstMessage = isPending && iAmRequester && messages.length === 0;

    await addDoc(collection(db, "dms", chatId, "messages"), {
      text: msg,
      uid: user.uid,
      name: profile.displayName,
      avatar: profile.avatar || "🐱",
      createdAt: Date.now(),
      edited: false,
      reactions: {},
      ...replyData,
    });

    await setDoc(
      doc(db, "dms", chatId),
      {
        lastMessage: msg,
        lastMessageAt: Date.now(),
        lastSenderUid: user.uid,
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

  const createPoll = async (question, options) => {
    if (!canWrite) return;
    const votes = {};
    options.forEach((opt) => (votes[opt] = []));

    await addDoc(collection(db, "dms", chatId, "messages"), {
      type: "poll",
      question,
      options,
      votes,
      uid: user.uid,
      name: profile.displayName,
      avatar: profile.avatar || "🐱",
      createdAt: Date.now(),
    });

    await setDoc(
      doc(db, "dms", chatId),
      {
        lastMessage: question,
        lastMessageAt: Date.now(),
        lastSenderUid: user.uid,
      },
      { merge: true }
    );

    if (other?.uid) {
      await sendNotification({
        toUid: other.uid,
        type: "dm",
        title: `${profile.displayName} создал(а) опрос`,
        body: question,
      });
    }
  };

  const toggleReaction = async (messageId, emoji) => {
    const msgRef = doc(db, "dms", chatId, "messages", messageId);
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const reactions = msg.reactions || {};
    const users = reactions[emoji] || [];
    const iReacted = users.includes(user.uid);
    const newUsers = iReacted
      ? users.filter((u) => u !== user.uid)
      : [...users, user.uid];
    await updateDoc(msgRef, { [`reactions.${emoji}`]: newUsers });
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

  const forwardMessage = async (message, target) => {
    const payload = {
      text: message.text,
      uid: user.uid,
      name: profile.displayName,
      avatar: profile.avatar || "🐱",
      createdAt: Date.now(),
      edited: false,
      reactions: {},
      forwardedFrom: message.name,
    };
    if (target.type === "family" && familyId) {
      await addDoc(collection(db, "families", familyId, "messages"), payload);
    } else if (target.type === "dm") {
      await addDoc(collection(db, "dms", target.chatId, "messages"), payload);
      await updateDoc(doc(db, "dms", target.chatId), {
        lastMessage: `↪ ${message.text.slice(0, 40)}`,
        lastMessageAt: Date.now(),
        lastSenderUid: user.uid,
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

  const jumpToMessage = (id) => {
    const el = document.getElementById(`msg-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList.add("highlight-pulse");
    setTimeout(() => el?.classList.remove("highlight-pulse"), 1500);
  };

  const onlineStatus = getOnlineStatus(otherProfile);
  const subtitle = onlineStatus.online
    ? "в сети"
    : onlineStatus.text || `@${otherProfile?.nick || "..."}`;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex flex-col h-[calc(100vh-140px)] overflow-hidden relative">
      {!searchOpen ? (
        <ChatHeader
          user={otherProfile}
          title={otherProfile?.displayName || "..."}
          subtitle={subtitle}
          subtitleClass={onlineStatus.online ? "text-green-500" : ""}
          onBack={onBack}
          rightExtra={
            canWrite ? (
              <button
                onClick={() => setShowCreatePoll(true)}
                className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-300 transition"
                title="Опрос"
              >
                <Icon name="bar-chart" size={20} />
              </button>
            ) : null
          }
          onSearch={() => setSearchOpen(true)}
        />
      ) : (
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

      {/* Плашка запроса — если я получатель */}
      {isPending && iAmReceiver && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-b dark:border-slate-700">
          <div className="text-sm dark:text-white mb-2 flex items-center gap-2">
            <Icon name="clock" size={16} className="text-yellow-500" />
            <span>
              <b>{request.fromName}</b> (@{request.fromNick}) хочет с тобой
              общаться
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={acceptRequest}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 text-sm font-medium transition flex items-center justify-center gap-1.5"
            >
              <Icon name="check" size={16} />
              Принять
            </button>
            <button
              onClick={rejectRequest}
              className="flex-1 bg-gray-200 dark:bg-slate-700 dark:text-white rounded-lg py-2 text-sm transition flex items-center justify-center gap-1.5"
            >
              <Icon name="trash-2" size={16} />
              Удалить
            </button>
          </div>
        </div>
      )}

      {/* Плашка — если я инициатор */}
      {isPending && iAmRequester && messages.length > 0 && (
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 border-b dark:border-slate-700 text-xs text-center dark:text-indigo-300 flex items-center justify-center gap-2">
          <Icon name="clock" size={14} />
          Ожидает принятия. Собеседник ещё не ответил.
        </div>
      )}

      {/* Сообщения */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        style={{ background: chatBg || undefined }}
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            {isPending && iAmRequester
              ? "Напиши первое сообщение — оно уйдёт как запрос"
              : "Начни переписку"}
          </div>
        )}
        {messages.map((m) => {
          const mine = m.uid === user.uid;
          const highlighted = search.trim() ? highlight(m.text || "") : m.text;
          const reactions = m.reactions || {};
          const isPoll = m.type === "poll";

          return (
            <div
              key={m.id}
              id={`msg-${m.id}`}
              className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
            >
              <UserAvatar avatar={m.avatar} size="sm" className="mt-1" />
              <div
                className={`max-w-[75%] flex flex-col ${
                  mine ? "items-end" : ""
                }`}
              >
                <div
                  onContextMenu={(e) => handleContextMenu(e, m)}
                  onTouchStart={(e) => handleTouchStart(e, m)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  className={`rounded-2xl px-3 py-2 cursor-pointer select-none ${
                    mine
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-bl-md"
                  }`}
                >
                  {m.forwardedFrom && (
                    <div
                      className={`text-[10px] mb-1 flex items-center gap-1 ${
                        mine ? "text-white/70" : "text-gray-500"
                      }`}
                    >
                      <Icon name="forward" size={10} />
                      <span>
                        Переслано от <b>{m.forwardedFrom}</b>
                      </span>
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
                        className={`text-[10px] font-medium flex items-center gap-1 ${
                          mine
                            ? "text-white/90"
                            : "text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        <Icon name="reply" size={10} />
                        <span>{m.replyTo.name}</span>
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
                      chatPath={{ collection: "dms", id: chatId }}
                      mine={mine}
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {highlighted}
                    </div>
                  )}

                  <div
                    className={`text-[10px] mt-1 flex items-center gap-1.5 ${
                      mine ? "text-white/70 justify-end" : "text-gray-400"
                    }`}
                  >
                    {m.edited && <span>изменено</span>}
                    <span>{formatMessageDate(m.createdAt)}</span>
                    {mine && (
                      <Icon
                        name="check-check"
                        size={12}
                        className="text-white/90"
                      />
                    )}
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

      {/* Плашка ответа */}
      {replyTo && (
        <div className="border-t dark:border-slate-700 p-2 bg-indigo-50 dark:bg-indigo-900/20 flex items-start gap-2">
          <Icon
            name="reply"
            size={18}
            className="text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0"
          />
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
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      )}

      {/* Панель ввода */}
      {canWrite ? (
        <form
          onSubmit={send}
          className="border-t dark:border-slate-700 px-2 py-2 flex items-end gap-1 bg-white dark:bg-slate-900"
        >
          <button
            type="button"
            className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400 transition flex-shrink-0"
            title="Прикрепить"
          >
            <Icon name="paperclip" size={22} />
          </button>

          <div className="flex-1 flex items-end bg-gray-100 dark:bg-slate-800 rounded-3xl px-3 py-1.5">
            <input
              ref={inputRef}
              className="flex-1 bg-transparent dark:text-white text-sm focus:outline-none py-1.5"
              placeholder={
                isPending && iAmRequester
                  ? "Первое сообщение..."
                  : "Сообщение..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition flex-shrink-0"
              title="Смайл"
            >
              <Icon name="smile" size={20} />
            </button>
          </div>

          {text.trim() ? (
            <button
              type="submit"
              className="w-10 h-10 rounded-full bg-primary hover:bg-indigo-600 text-white flex items-center justify-center transition flex-shrink-0"
              title="Отправить"
            >
              <Icon name="send" size={20} />
            </button>
          ) : (
            <button
              type="button"
              className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400 transition flex-shrink-0"
              title="Голосовое"
            >
              <Icon name="mic" size={22} />
            </button>
          )}
        </form>
      ) : (
        <div className="border-t dark:border-slate-700 p-3 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900">
          {iAmReceiver
            ? "Прими запрос, чтобы отвечать"
            : "Ожидай принятия запроса"}
        </div>
      )}

      <MessageContextMenu
        position={menu ? { x: menu.x, y: menu.y } : null}
        onClose={() => setMenu(null)}
        canEdit={menu?.message.uid === user.uid && menu?.message.type !== "poll"}
        canDelete={true}
        reactions={
          menu?.message.reactions
            ? Object.entries(menu.message.reactions)
                .filter(([, users]) => users.includes(user.uid))
                .map(([emoji]) => emoji)
            : []
        }
        onReact={(emoji) => toggleReaction(menu.message.id, emoji)}
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
            <h3 className="font-bold text-lg dark:text-white mb-3 flex items-center gap-2">
              <Icon name="pencil" size={18} />
              Редактировать
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