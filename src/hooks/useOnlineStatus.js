import { useEffect, useRef } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// Хук пишет lastSeen в профиль пользователя
// Пока вкладка открыта — обновляет каждые 30 секунд
export default function useOnlineStatus(user) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;

    const updateLastSeen = () => {
      updateDoc(doc(db, "users", user.uid), {
        lastSeen: Date.now(),
      }).catch((e) => console.log("lastSeen error:", e));
    };

    // Сразу обновить
    updateLastSeen();

    // Каждые 30 секунд
    intervalRef.current = setInterval(updateLastSeen, 30000);

    // События активности
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updateLastSeen();
      }
    };
    const handleFocus = () => updateLastSeen();
    const handleBeforeUnload = () => updateLastSeen();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Финальное обновление при размонтировании
      updateLastSeen();
    };
  }, [user?.uid]);
}