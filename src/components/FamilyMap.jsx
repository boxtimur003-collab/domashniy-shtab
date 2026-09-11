import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import useGeolocation from "../hooks/useGeolocation";

// Иконка маркера с эмодзи
function makeIcon(emoji, isMe) {
  const bg = isMe ? "#22c55e" : "#6366f1";
  return L.divIcon({
    className: "custom-marker",
    html: `<div class="custom-marker-inner" style="background:${bg}">${
      emoji || "🐱"
    }</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// Компонент, который центрирует карту при первом рендере
function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

export default function FamilyMap({ members = [] }) {
  const { user, profile, reloadProfile } = useAuth();
  const [sharing, setSharing] = useState(profile?.shareLocation || false);

  // при изменении профиля извне — синхронизировать
  useEffect(() => {
    setSharing(profile?.shareLocation || false);
  }, [profile?.shareLocation]);

  const handleUpdate = async (coords) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), {
      location: {
        lat: coords.lat,
        lng: coords.lng,
        ts: coords.ts,
      },
    });
  };

  const { position, error, loading } = useGeolocation({
    enabled: sharing,
    intervalMs: 30000,
    onUpdate: handleUpdate,
  });

  const toggleSharing = async () => {
    const next = !sharing;
    setSharing(next);
    await updateDoc(doc(db, "users", user.uid), {
      shareLocation: next,
    });
    reloadProfile();
  };

  // Центр карты — своя позиция или первый доступный член семьи
  const firstWithLoc = members.find((m) => m.location?.lat);
  const initialCenter = position
    ? [position.lat, position.lng]
    : firstWithLoc
    ? [firstWithLoc.location.lat, firstWithLoc.location.lng]
    : [55.7558, 37.6176]; // Москва по умолчанию

  // Список членов семьи, у кого есть локация + активная (за последние 30 мин)
  const membersWithLocation = members.filter((m) => m.location?.lat);

  return (
    <div className="space-y-4">
      {/* Переключатель */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📍</div>
            <div>
              <div className="font-semibold dark:text-white">
                Моя геолокация
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {sharing
                  ? "Ты делишься позицией с семьёй"
                  : "Позиция скрыта от семьи"}
              </div>
            </div>
          </div>
          <button
            onClick={toggleSharing}
            className={`relative w-14 h-8 rounded-full transition ${
              sharing ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                sharing ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>

        {error && (
          <div className="mt-3 text-xs text-red-500 bg-red-50 dark:bg-red-900/30 p-2 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {sharing && loading && !position && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            ⏳ Определяем твою позицию...
          </div>
        )}

        {sharing && position && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            ✅ Позиция определена (±{Math.round(position.accuracy)} м)
          </div>
        )}
      </div>

      {/* Карта */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm overflow-hidden">
        <MapContainer
          center={initialCenter}
          zoom={13}
          style={{ height: "60vh", width: "100%", borderRadius: "1rem" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter position={position} />

          {membersWithLocation.map((m) => {
            const isMe = m.uid === user.uid;
            const isActive =
              m.location?.ts && Date.now() - m.location.ts < 30 * 60 * 1000;
            return (
              <Marker
                key={m.uid}
                position={[m.location.lat, m.location.lng]}
                icon={makeIcon(m.avatar, isMe)}
              >
                <Popup>
                  <div className="text-center min-w-[120px]">
                    <div className="text-2xl">{m.avatar || "🐱"}</div>
                    <div className="font-semibold">
                      {m.displayName}
                      {isMe && " (ты)"}
                    </div>
                    <div className="text-xs text-gray-500">@{m.nick}</div>
                    <div className="text-xs mt-1">
                      {isActive ? (
                        <span className="text-green-600">
                          🟢 {timeAgo(m.location.ts)}
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          ⚪ {timeAgo(m.location.ts)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {m.statusEmoji} {m.status}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Список участников */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold mb-3 dark:text-white">
          Члены семьи ({membersWithLocation.length}/{members.length})
        </h3>
        <div className="space-y-2">
          {members.map((m) => {
            const hasLoc = m.location?.lat;
            const isActive =
              m.location?.ts && Date.now() - m.location.ts < 30 * 60 * 1000;
            return (
              <div
                key={m.uid}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xl">
                    {m.avatar || "🐱"}
                  </div>
                  <div>
                    <div className="font-medium leading-tight dark:text-white">
                      {m.displayName}
                    </div>
                    <div className="text-gray-400 text-xs">@{m.nick}</div>
                  </div>
                </div>
                <div className="text-right">
                  {hasLoc ? (
                    isActive ? (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        🟢 {timeAgo(m.location.ts)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        ⚪ {timeAgo(m.location.ts)}
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}