import { useState, useEffect, useRef } from "react";

// Хук, который периодически отправляет геолокацию через callback
export default function useGeolocation({
  enabled = false,
  intervalMs = 30000,
  onUpdate,
}) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const watchRef = useRef(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Браузер не поддерживает геолокацию");
      return;
    }

    setLoading(true);
    setError(null);

    const handleSuccess = (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        ts: Date.now(),
      };
      setPosition(coords);
      setLoading(false);

      // отправляем не чаще чем раз в intervalMs
      if (onUpdate && Date.now() - lastSentRef.current > intervalMs) {
        lastSentRef.current = Date.now();
        onUpdate(coords);
      }
    };

    const handleError = (err) => {
      setError(err.message || "Не удалось получить локацию");
      setLoading(false);
    };

    // watchPosition — отслеживает изменения
    watchRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 15000,
      }
    );

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);

  return { position, error, loading };
}