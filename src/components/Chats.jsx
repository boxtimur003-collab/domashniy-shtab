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

export const makeChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");

export default function Chats({ familyId }) {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState("family");
  const [myChats, setMyChats] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [openDM, setOpenDM] = useState(null);
  const [showNewDM, setShowNewDM] = useState(false);
  const [searchNick, setSearchNick] = useState("");
  const [searchErr, setSearchErr] = useState("");
  const [searchOk, setSearchOk] = useState("");
  const [busy, setBusy] = useState(false);

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
        body: "Прими или отклони запрос в личных чатах",
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

  if (openDM) {
    return (
      <DMWindow
        chatId={openDM.chatId}
        other={openDM.other}
        onBack={() => setOpenDM(null)}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex border-b dark:border-slate-700">
        <button
          onClick={() => setTab("family")}
          className={`flex-1 py-3 text-sm transition ${
            tab === "family"
              ? "border-b-2 border-primary text-primary font-medium"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          👨‍👩‍👧 Семья
        </button>
        <button
          onClick={() => setTab("dm")}
          className={`flex-1 py-3 text-sm relative transition ${
            tab === "dm"
              ? "border-b-2 border-primary text-primary font-medium"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          💬 Личные
          {incoming.length > 0 && (
            <span className="absolute top-2 right-6 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {incoming.length}
            </span>
          )}
        </button>
      </div>

      {tab === "family" && <Chat familyId={familyId} />}

      {tab === "dm" && (
        <div className="p-3 space-y-3">
          <button
            onClick={() => setShowNewDM(!showNewDM)}
            className="w-full bg-primary hover:bg-indigo-600 text-white rounded-lg py-2 text-sm transition"
          >
            ✉️ Написать по нику
          </button>

          {showNewDM && (
            <div className="space-y-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <input
                className="w-full border dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="Ник"
                value={searchNick}
                onChange={(e) =>
                  setSearchNick(e.target.value.replace(/\s/g, ""))
                }
              />
              {searchErr && (
                <div className="text-red-500 text-xs">{searchErr}</div>
              )}
              {searchOk && (
                <div className="text-green-600 dark:text-green-400 text-xs">
                  {searchOk}
                </div>
              )}
              <button
                onClick={sendDmRequest}
                disabled={busy}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-2 text-sm disabled:opacity-50 transition"
              >
                {busy ? "..." : "Отправить запрос"}
              </button>
            </div>
          )}

          {incoming.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 font-medium">
                Входящие заявки
              </div>
              {incoming.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg"
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
                      onClick={() => acceptDm(r)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => rejectDm(r)}
                      className="bg-gray-200 dark:bg-slate-600 px-3 py-1 rounded text-xs transition"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {myChats.length === 0 && incoming.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
              Пока нет личных чатов
            </div>
          )}

          {myChats.map((c) => {
            const otherUid = c.members.find((m) => m !== user.uid);
            const isPinned = profile?.pinnedChats?.includes(c.id);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition"
                onClick={() =>
                  setOpenDM({ chatId: c.id, other: { uid: otherUid } })
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xl">
                    💬
                  </div>
                  <div>
                    <div className="text-sm font-medium dark:text-white">
                      {isPinned && "📌 "}Чат
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-[200px]">
                      {c.lastMessage || "Нет сообщений"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(c.id);
                  }}
                  className="text-lg px-2 hover:scale-125 transition"
                  title={isPinned ? "Открепить" : "Закрепить"}
                >
                  {isPinned ? "📌" : "📍"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}