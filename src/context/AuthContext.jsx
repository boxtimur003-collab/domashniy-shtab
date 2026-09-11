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

// ник -> фейковый email
export const nickToEmail = (nick) =>
  `${nick.toLowerCase().trim()}@domashniy-shtab.local`;

// Дефолтные аватарки (эмодзи)
export const AVATARS = [
  "🐱", "🐶", "🦊", "🐼", "🐨", "🦁", "🐯", "🐸",
  "🐵", "🦄", "🐝", "🦋", "🌟", "⭐", "🌈", "🌙",
  "🍀", "🌻", "🌹", "🍕", "🍔", "🍎", "⚽", "🎮",
  "🎸", "🎨", "🚀", "👑", "💎", "🔥", "❄️", "🎯",
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Регистрация
  const register = async (nick, password, displayName, avatar = "🐱") => {
    const email = nickToEmail(nick);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // создаём профиль
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      nick: nick.toLowerCase().trim(),
      displayName: displayName || nick,
      avatar,
      familyId: null,
      status: "Дома",
      statusEmoji: "🏠",
      createdAt: Date.now(),
    });
    return cred.user;
  };

  // Вход
  const login = async (nick, password) => {
    const email = nickToEmail(nick);
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Выход
  const logout = () => signOut(auth);

  // Ручная перезагрузка профиля
  const reloadProfile = async () => {
    if (!auth.currentUser) return setProfile(null);
    const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (snap.exists()) setProfile(snap.data());
  };

  // Обновить мою аватарку
  const updateAvatar = async (emoji) => {
    if (!auth.currentUser) return;
    await setDoc(
      doc(db, "users", auth.currentUser.uid),
      { avatar: emoji },
      { merge: true }
    );
  };

  // Реалтайм-подписка на профиль
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
        AVATARS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}