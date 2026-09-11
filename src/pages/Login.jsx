import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [nick, setNick] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(nick, pass);
      nav("/");
    } catch (e) {
      setErr("Неверный ник или пароль");
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
            Вход
          </p>
        </div>

        <input
          className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
          placeholder="Ник"
          value={nick}
          onChange={(e) => setNick(e.target.value.replace(/\s/g, ""))}
          required
        />
        <input
          type="password"
          className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
          placeholder="Пароль"
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
          {busy ? "Входим..." : "Войти"}
        </button>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Нет аккаунта?{" "}
          <Link
            to="/register"
            className="text-primary hover:underline font-medium"
          >
            Регистрация
          </Link>
        </p>
      </form>
    </div>
  );
}