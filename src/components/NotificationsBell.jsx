import { useState } from "react";
import { useNotifications } from "../context/NotificationsContext";
import { usePush } from "../context/PushContext";
import Icon from "./Icon";

const ICON_MAP = {
  message: "message-circle",
  dm: "mail",
  join_request: "user-plus",
  dm_request: "users",
  member_joined: "user-check",
  status_change: "activity",
  mention: "at-sign",
  default: "bell",
};

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

export default function NotificationsBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();
  const { permission, requestPermission, supported } = usePush();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition"
        title="Уведомления"
      >
        <Icon name="bell" size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-2 sm:p-4 bg-black/30 animate-fade-in">
          <div className="absolute inset-0" onClick={() => setOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-slide-up mt-14">
            <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
              <h2 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <Icon name="bell" size={20} />
                Уведомления
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {supported && permission !== "granted" && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 border-b dark:border-slate-700">
                <div className="text-sm dark:text-white mb-2 flex items-center gap-2">
                  <Icon name="bell-off" size={16} />
                  Push-уведомления выключены
                </div>
                <button
                  onClick={requestPermission}
                  className="w-full bg-primary hover:bg-indigo-600 text-white rounded-lg py-2 text-sm transition"
                >
                  Включить push-уведомления
                </button>
              </div>
            )}

            {supported && permission === "granted" && (
              <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b dark:border-slate-700 text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                <Icon name="check" size={14} />
                Push-уведомления включены
              </div>
            )}

            {!supported && (
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b dark:border-slate-700 text-xs text-yellow-700 dark:text-yellow-400">
                Твой браузер не поддерживает push-уведомления
              </div>
            )}

            {notifications.length > 0 && (
              <div className="flex justify-between px-4 py-2 border-b dark:border-slate-700 text-xs">
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  Прочитать все
                </button>
                <button
                  onClick={clearAll}
                  className="text-red-500 hover:underline"
                >
                  Очистить
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 && (
                <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                  Пока нет уведомлений
                </div>
              )}

              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markAsRead(n.id);
                  }}
                  className={`w-full text-left p-3 border-b dark:border-slate-700 flex gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition ${
                    !n.read ? "bg-indigo-50/50 dark:bg-indigo-900/20" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-primary flex-shrink-0">
                    <Icon
                      name={ICON_MAP[n.type] || ICON_MAP.default}
                      size={18}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className={`text-sm ${
                          !n.read
                            ? "font-semibold dark:text-white"
                            : "font-medium dark:text-gray-300"
                        }`}
                      >
                        {n.title}
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    {n.body && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                        {n.body}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1">
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}