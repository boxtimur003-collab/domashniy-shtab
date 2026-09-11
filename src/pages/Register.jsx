import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, AVATARS } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [nick, setNick] = useState("");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [avatar, setAvatar] = useState("🐱");
  const [showPicker, setShowPicker] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await register(nick, pass, name, avatar);
      nav("/family-setup");
    } catch (e) {
      setErr(
        e.code === "auth/email-already-in-use"
          ? "Такой ник уже занят"
          : e.code === "auth/weak-password"
          ? "Пароль слишком короткий (мин. 6 символов)"
          : "Ошибка: " + e.message
      );
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-xl p-8 w-full max-w-md space-y-4 animate-slide-up"
      >
        <div className="text-center">
          <div className="text-5xl mb-2">🏠</div>
          <h1 className="text-2xl font-bold dark:text-white">Домашний штаб</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Регистрация
          </p>
        </div>

        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-800 flex items-center justify-center text-4xl transition border-2 border-indigo-200 dark:border-indigo-700 hover:scale-105"
          >
            {avatar}
          </button>
          <span className="text-xs text-gray-400 mt-1">
            Нажми, чтобы сменить
          </span>
        </div>

        {showPicker && (
          <div className="grid grid-cols-8 gap-1 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg max-h-40 overflow-y-auto">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setAvatar(emoji);
                  setShowPicker(false);
                }}
                className={`text-2xl p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800 transition ${
                  avatar === emoji ? "bg-indigo-200 dark:bg-indigo-700" : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <input
          className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
          placeholder="Ник (латиница, без пробелов)"
          value={nick}
          onChange={(e) => setNick(e.target.value.replace(/\s/g, ""))}
          required
        />
        <input
          className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
          placeholder="Как тебя звать (Имя)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="password"
          className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
          placeholder="Пароль (мин. 6 символов)"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          required
        />

        {err && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded-lg">
            {err}
          </div>
        )}

        <button
          disabled={busy}
          className="w-full bg-primary hover:bg-indigo-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 transition shadow-md hover:shadow-lg"
        >
          {busy ? "Создаём..." : "Зарегистрироваться"}
        </button>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Уже есть аккаунт?{" "}
          <Link
            to="/login"
            className="text-primary hover:underline font-medium"
          >
            Войти
          </Link>
        </p>
      </form>
    </div>
  );
}