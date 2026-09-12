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
import SearchBar from "./SearchBar";
import UserAvatar from "./UserAvatar";

export default function Chat({ familyId, members = [], onOpenProfile }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [avatars, setAvatars] = useState({});
  const [family, setFamily] = useState(null);
  const [menu, setMenu] = useState(null);
  const [editing, setEditing] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchIdx, setSearchIdx] = useState(0);
  const endRef = useRef(null);
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
                colorTheme: u.colorTheme || "#6366f1",
                symbol: u.symbol || "",
                bio: u.bio || "",
                nick: u.nick,
                uid: u.uid,
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
    setText("");
    await addDoc(collection(db, "families", familyId, "messages"), {
      text: msg,
      uid: user.uid,
      name: profile.displayName,
      createdAt: Date.now(),
      edited: false,
    });

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
              title: `${profile.displayName} написал(а) в чат семьи`,
              body: msg.length > 60 ? msg.slice(0, 60) + "..." : msg,
            })
          )
      );
    }
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
    <div className="flex flex-col h-[70vh] bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden relative">
      {!searchOpen && (
        <div className="flex items-center justify-between p-2 border-b dark:border-slate-700">
          <div className="text-sm font-medium dark:text-white px-2">
            👨‍👩‍👧 Семейный чат
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-lg transition"
            title="Поиск"
          >
            🔍
          </button>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            Пока нет сообщений
          </div>
        )}
        {messages.map((m) => {
          const mine = m.uid === user.uid;
          const info = avatars[m.uid] || { avatar: "🐱", name: m.name };
          const canEdit = mine;
          const canDelete = isAdmin || mine;
          const highlighted = search.trim() ? highlight(m.text) : m.text;

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
                  className={`rounded-2xl px-3 py-2 cursor-pointer select-none ${
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

      <MessageContextMenu
        position={menu ? { x: menu.x, y: menu.y } : null}
        onClose={() => setMenu(null)}
        canEdit={menu?.message.uid === user.uid}
        canDelete={isAdmin || menu?.message.uid === user.uid}
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