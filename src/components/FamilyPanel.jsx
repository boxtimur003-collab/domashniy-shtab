import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { sendNotification } from "../context/NotificationsContext";
import UserAvatar from "./UserAvatar";

export default function FamilyPanel({ family, members, onOpenProfile }) {
  const { user, reloadProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const isAdmin = family.adminUid === user.uid;

  useEffect(() => {
    const q = query(
      collection(db, "join_requests"),
      where("familyId", "==", family.id),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [family.id]);

  const accept = async (req) => {
    await updateDoc(doc(db, "users", req.fromUid), { familyId: family.id });
    await updateDoc(doc(db, "families", family.id), {
      members: arrayUnion(req.fromUid),
    });
    await updateDoc(doc(db, "join_requests", req.id), { status: "accepted" });

    await sendNotification({
      toUid: req.fromUid,
      type: "member_joined",
      title: `Тебя приняли в семью «${family.name}»!`,
      body: "Добро пожаловать!",
    });

    reloadProfile();
  };

  const reject = async (req) => {
    await updateDoc(doc(db, "join_requests", req.id), { status: "rejected" });
  };

  const leaveFamily = async () => {
    await updateDoc(doc(db, "users", user.uid), { familyId: null });
    await updateDoc(doc(db, "families", family.id), {
      members: arrayRemove(user.uid),
    });
    reloadProfile();
  };

  const removeMember = async (member) => {
    await updateDoc(doc(db, "users", member.uid), { familyId: null });
    await updateDoc(doc(db, "families", family.id), {
      members: arrayRemove(member.uid),
    });
    setConfirmRemove(null);
  };

  const adminUser = members.find((m) => m.uid === family.adminUid);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold mb-3 dark:text-white">
          Участники ({members.length})
        </h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.uid}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <UserAvatar user={m} size="md" onClick={onOpenProfile} />
                <div>
                  <div className="font-medium leading-tight dark:text-white">
                    {m.displayName}
                  </div>
                  <div className="text-xs text-gray-400">@{m.nick}</div>
                </div>
                {m.uid === family.adminUid && (
                  <span className="text-xs bg-accent text-white px-2 py-0.5 rounded ml-1">
                    админ
                  </span>
                )}
              </div>
              {isAdmin && m.uid !== user.uid && (
                <button
                  onClick={() => setConfirmRemove(m)}
                  className="text-red-400 hover:text-red-600 text-sm transition"
                >
                  Удалить
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3 dark:text-white">
            Заявки на вступление ({requests.length})
          </h2>
          {requests.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Пока нет заявок
            </p>
          )}
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded-lg"
              >
                <div>
                  <div className="font-medium dark:text-white">
                    {r.fromName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    @{r.fromNick}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => accept(r)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition"
                  >
                    Принять
                  </button>
                  <button
                    onClick={() => reject(r)}
                    className="bg-gray-200 dark:bg-slate-600 px-3 py-1 rounded text-sm transition"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm text-sm text-gray-500 dark:text-gray-400 space-y-1">
        <div>
          ID семьи:{" "}
          <code className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-xs dark:text-white">
            {family.id}
          </code>
        </div>
        <div>
          Ник админа: <b className="dark:text-white">@{adminUser?.nick}</b>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
          {!confirmLeave ? (
            <button
              onClick={() => setConfirmLeave(true)}
              className="w-full text-red-500 hover:text-red-700 py-2 text-sm transition"
            >
              Покинуть семью
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-center dark:text-white">
                Точно покинуть семью «{family.name}»?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={leaveFamily}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm transition"
                >
                  Да, покинуть
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="flex-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg py-2 text-sm transition"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 animate-slide-up">
            <h3 className="font-semibold text-lg dark:text-white">
              Удалить участника?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <b>{confirmRemove.displayName}</b> (@{confirmRemove.nick}) будет
              исключён из семьи.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => removeMember(confirmRemove)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm transition"
              >
                Удалить
              </button>
              <button
                onClick={() => setConfirmRemove(null)}
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