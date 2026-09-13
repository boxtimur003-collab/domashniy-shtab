import Icon from "./Icon";
import UserAvatar from "./UserAvatar";

export default function ChatHeader({
  avatar,
  user,
  title,
  subtitle,
  subtitleClass = "",
  onBack,
  onMenu,
  onSearch,
  rightExtra,
  avatarIsSvg = false, // если true — avatar это имя SVG-иконки (например "users")
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-2 border-b dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur sticky top-0 z-20">
      {onBack && (
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-300 transition"
          title="Назад"
        >
          <Icon name="arrow-left" size={22} />
        </button>
      )}

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {user ? (
          <UserAvatar user={user} size="md" showOnline />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
            {avatarIsSvg ? (
              <Icon name={avatar} size={22} />
            ) : (
              <span className="text-xl">{avatar}</span>
            )}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold leading-tight dark:text-white truncate">
            {title}
          </div>
          {subtitle && (
            <div
              className={`text-xs truncate ${
                subtitleClass || "text-gray-400"
              }`}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {rightExtra}

      {onSearch && (
        <button
          onClick={onSearch}
          className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-300 transition"
          title="Поиск"
        >
          <Icon name="search" size={20} />
        </button>
      )}

      {onMenu && (
        <button
          onClick={onMenu}
          className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-300 transition"
          title="Меню"
        >
          <Icon name="more-vertical" size={20} />
        </button>
      )}
    </div>
  );
}