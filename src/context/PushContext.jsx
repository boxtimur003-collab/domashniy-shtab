import { createContext, useContext, useEffect, useState } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { app, db } from "../firebase";
import { useAuth } from "./AuthContext";

const PushContext = createContext();
export const usePush = () => useContext(PushContext);

export function PushProvider({ children }) {
  const { user } = useAuth();
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [token, setToken] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [supported, setSupported] = useState(false);

  // Проверяем поддержку браузером
  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator) {
      setSupported(true);
    }
  }, []);

  // Запрос разрешения + получение токена
  const requestPermission = async () => {
    if (!supported) {
      alert("Твой браузер не поддерживает push-уведомления");
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        console.log("Уведомления запрещены пользователем");
        return;
      }

      // Регистрируем Service Worker
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

      // Получаем токен
      const messaging = getMessaging(app);
      const vapidKey = import.meta.env.VITE_FB_VAPID_KEY;

      if (!vapidKey) {
        console.error("VITE_FB_VAPID_KEY не задан в .env.local");
        alert("Ошибка конфигурации: VAPID ключ отсутствует");
        return;
      }

      const t = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      console.log("✅ FCM token:", t);
      setToken(t);

      // Сохраняем токен в профиль
      if (user && t) {
        await updateDoc(doc(db, "users", user.uid), {
          fcmToken: t,
          fcmUpdatedAt: Date.now(),
        });
        console.log("✅ Токен сохранён в Firestore");
      }
    } catch (e) {
      console.error("❌ Ошибка получения токена:", e);
      alert("Ошибка: " + e.message);
    }
  };

  // Автосохранение токена при входе, если разрешение уже дано
  useEffect(() => {
    if (!user || permission !== "granted") return;
    if (token) {
      updateDoc(doc(db, "users", user.uid), {
        fcmToken: token,
        fcmUpdatedAt: Date.now(),
      }).catch((e) => console.log("Ошибка сохранения токена:", e));
    }
  }, [user, token, permission]);

  // Обработка foreground-сообщений (вкладка открыта)
  useEffect(() => {
    if (!supported || permission !== "granted") return;
    try {
      const messaging = getMessaging(app);
      const unsub = onMessage(messaging, (payload) => {
        console.log("📩 Foreground message:", payload);
        setLastMessage(payload);
        if (payload.notification) {
          new Notification(payload.notification.title || "Домашний штаб", {
            body: payload.notification.body || "",
          });
        }
      });
      return unsub;
    } catch (e) {
      console.log("Foreground listener error:", e);
    }
  }, [supported, permission]);

  return (
    <PushContext.Provider
      value={{ permission, token, requestPermission, supported, lastMessage }}
    >
      {children}
    </PushContext.Provider>
  );
}