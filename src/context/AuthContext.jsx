import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const nickToEmail = (nick) =>
  `${nick.toLowerCase().trim()}@domashniy-shtab.local`;

export const AVATARS = [
  "🐱", "🐶", "🦊", "🐼", "🐨", "🦁", "🐯", "🐸",
  "🐵", "🦄", "🐝", "🦋", "🌟", "⭐", "🌈", "🌙",
  "🍀", "🌻", "🌹", "🍕", "🍔", "🍎", "⚽", "🎮",
  "🎸", "🎨", "🚀", "👑", "💎", "🔥", "❄️", "🎯",
];

export const COLOR_THEMES = [
  "#6366f1", // индиго
  "#8b5cf6", // фиолетовый
  "#ec4899", // розовый
  "#ef4444", // красный
  "#f97316", // оранжевый
  "#eab308", // жёлтый
  "#22c55e", // зелёный
  "#10b981", // изумрудный
  "#14b8a6", // бирюзовый
  "#06b6d4", // голубой
  "#0ea5e9", // небесный
  "#3b82f6", // синий
  "#64748b", // серый
  "#1e293b", // тёмно-синий
  "#a855f7", // пурпур
];

export const GRADIENTS = [
  { id: "sunset", css: "linear-gradient(135deg, #f97316, #ec4899)" },
  { id: "ocean", css: "linear-gradient(135deg, #06b6d4, #3b82f6)" },
  { id: "forest", css: "linear-gradient(135deg, #22c55e, #14b8a6)" },
  { id: "purple", css: "linear-gradient(135deg, #8b5cf6, #ec4899)" },
  { id: "fire", css: "linear-gradient(135deg, #eab308, #ef4444)" },
];

export const SYMBOLS = [
  // Власть
  "👑", "🎩", "🏆", "🥇", "⚜️", "💠",
  // Энергия
  "🔥", "⚡", "💥", "✨", "💫", "🌟",
  // Природа
  "🌸", "🌺", "🍀", "🌻", "🌈", "❄️",
  // Драгоценности
  "💎", "💍", "🪙", "💰", "🔮",
  // Животные
  "🦁", "🐺", "🦅", "🐉", "🦄",
  // Прочее
  "🎯", "🎨", "🎮", "🚀", "☕", "🍕",
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const register = async (nick, password, displayName, avatar = "🐱") => {
    const email = nickToEmail(nick);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      nick: nick.toLowerCase().trim(),
      displayName: displayName || nick,
      avatar,
      bio: "",
      colorTheme: "#6366f1",
      symbol: "",
      familyId: null,
      status: "Дома",
      statusEmoji: "🏠",
      createdAt: Date.now(),
    });
    return cred.user;
  };

  const login = async (nick, password) => {
    const email = nickToEmail(nick);
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => signOut(auth);

  const reloadProfile = async () => {
    if (!auth.currentUser) return setProfile(null);
    const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (snap.exists()) setProfile(snap.data());
  };

  const updateAvatar = async (emoji) => {
    if (!auth.currentUser) return;
    await setDoc(
      doc(db, "users", auth.currentUser.uid),
      { avatar: emoji },
      { merge: true }
    );
  };

  // Обновить профиль (имя, о себе, цвет, символ)
  const updateProfile = async (fields) => {
    if (!auth.currentUser) return;
    await setDoc(
      doc(db, "users", auth.currentUser.uid),
      fields,
      { merge: true }
    );
  };

  useEffect(() => {
    let profileUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (u) => {
      setUser(u);

      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (u) {
        profileUnsub = onSnapshot(doc(db, "users", u.uid), (snap) => {
          if (snap.exists()) setProfile(snap.data());
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        register,
        login,
        logout,
        reloadProfile,
        updateAvatar,
        updateProfile,
        AVATARS,
        COLOR_THEMES,
        GRADIENTS,
        SYMBOLS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}