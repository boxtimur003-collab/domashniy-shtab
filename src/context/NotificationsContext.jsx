import { createContext, useContext, useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext();
export const useNotifications = () => useContext(NotificationsContext);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Подписка на уведомления
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    });

    return unsub;
  }, [user]);

  // Отметить одно как прочитанное
  const markAsRead = async (notifId) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "notifications", notifId), {
      read: true,
    });
  };

  // Отметить все прочитанными
  const markAllAsRead = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications
      .filter((n) => !n.read)
      .forEach((n) => {
        batch.update(doc(db, "users", user.uid, "notifications", n.id), {
          read: true,
        });
      });
    await batch.commit();
  };

  // Удалить все
  const clearAll = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      batch.delete(doc(db, "users", user.uid, "notifications", n.id));
    });
    await batch.commit();
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

// Хелпер: отправить уведомление другому юзеру
// можно вызывать из любого места приложения
export async function sendNotification({
  toUid,
  type,
  title,
  body,
  link = null,
}) {
  if (!toUid) return;
  await addDoc(collection(db, "users", toUid, "notifications"), {
    type,
    title,
    body,
    link,
    read: false,
    createdAt: Date.now(),
  });
}