import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { sendNotification } from "../context/NotificationsContext";
import ThemeSwitcher from "../components/ThemeSwitcher";

export default function FamilySetup() {
  const { user, profile, reloadProfile, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("create");
  const [familyName, setFamilyName] = useState("");
  const [searchNick, setSearchNick] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const createFamily = async () => {
    if (!familyName.trim()) return;
    setBusy(true);
    setErr("");
    setInfo("");
    try {
      const famRef = await addDoc(collection(db, "families"), {
        name: familyName.trim(),
        adminUid: user.uid,
        members: [user.uid],
        createdAt: Date.now(),
      });
      await updateDoc(doc(db, "users", user.uid), {
        familyId: famRef.id,
        role: "admin",
      });
      await reloadProfile();
      nav("/");
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const sendRequest = async () => {
    if (!searchNick.trim()) return;
    setBusy(true);
    setErr("");
    setInfo("");
    try {
      const q = query(
        collection(db, "users"),
        where("nick", "==", searchNick.toLowerCase().trim())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setErr("Пользователь с таким ником не найден");
        setBusy(false);
        return;
      }
      const target = snap.docs[0].data();
      if (!target.familyId) {
        setErr("У этого пользователя ещё нет семьи");
        setBusy(false);
        return;
      }
      const existing = await getDocs(
        query(
          collection(db, "join_requests"),
          where("fromUid", "==", user.uid),
          where("familyId", "==", target.familyId),
          where("status", "==", "pending")
        )
      );
      if (!existing.empty) {
        setInfo("Заявка уже отправлена, жди ответа");
        setBusy(false);
        return;
      }
      await addDoc(collection(db, "join_requests"), {
        fromUid: user.uid,
        fromNick: profile.nick,
        fromName: profile.displayName,
        familyId: target.familyId,
        toAdminUid: target.uid,
        status: "pending",
        createdAt: Date.now(),
      });

      await sendNotification({
        toUid: target.uid,
        type: "join_request",
        title: `${profile.displayName} хочет вступить в семью`,
        body: `Ник: @${profile.nick}. Открой вкладку Семья, чтобы принять.`,
      });

      setInfo("Заявка отправлена! Жди, пока админ её примет.");
      setSearchNick("");
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ThemeSwitcher />
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-xl p-8 w-full max-w-md space-y-4 animate-slide-up">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold dark:text-white">Семья</h1>
          <button
            onClick={logout}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition"
          >
            Выйти
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-2 rounded-lg transition ${
              tab === "create"
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-slate-700 dark:text-white"
            }`}
          >
            Создать
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 py-2 rounded-lg transition ${
              tab === "join"
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-slate-700 dark:text-white"
            }`}
          >
            Вступить
          </button>
        </div>

        {tab === "create" && (
          <>
            <input
              className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="Название семьи (напр. Ивановы)"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
            <button
              onClick={createFamily}
              disabled={busy}
              className="w-full bg-primary hover:bg-indigo-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 transition"
            >
              {busy ? "..." : "Создать семью"}
            </button>
          </>
        )}

        {tab === "join" && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Введи ник админа семьи, чтобы отправить заявку на вступление.
            </p>
            <input
              className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="Ник админа"
              value={searchNick}
              onChange={(e) =>
                setSearchNick(e.target.value.replace(/\s/g, ""))
              }
            />
            <button
              onClick={sendRequest}
              disabled={busy}
              className="w-full bg-primary hover:bg-indigo-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 transition"
            >
              {busy ? "..." : "Отправить заявку"}
            </button>
          </>
        )}

        {err && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded-lg">
            {err}
          </div>
        )}
        {info && (
          <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/30 p-2 rounded-lg">
            {info}
          </div>
        )}
      </div>
    </div>
  );
}