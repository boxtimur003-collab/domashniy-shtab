import { getOnlineStatus } from "../utils/formatDate";

const SIZES = {
  xs: "w-6 h-6 text-sm",
  sm: "w-8 h-8 text-base",
  md: "w-10 h-10 text-xl",
  lg: "w-12 h-12 text-2xl",
  xl: "w-16 h-16 text-3xl",
  "2xl": "w-20 h-20 text-4xl",
};

const SYMBOL_SIZES = {
  xs: "text-[10px] -bottom-0.5 -right-0.5",
  sm: "text-xs -bottom-0.5 -right-0.5",
  md: "text-sm -bottom-0.5 -right-1",
  lg: "text-base -bottom-1 -right-1",
  xl: "text-lg -bottom-1 -right-1",
  "2xl": "text-xl -bottom-1 -right-1",
};

const DOT_SIZES = {
  xs: "w-2 h-2",
  sm: "w-2.5 h-2.5",
  md: "w-3 h-3",
  lg: "w-3.5 h-3.5",
  xl: "w-4 h-4",
  "2xl": "w-5 h-5",
};

export default function UserAvatar({
  user,
  avatar,
  color,
  symbol,
  size = "md",
  onClick,
  className = "",
  showSymbol = true,
  showOnline = false,
}) {
  const sizeCls = SIZES[size] || SIZES.md;
  const symbolCls = SYMBOL_SIZES[size] || SYMBOL_SIZES.md;
  const dotCls = DOT_SIZES[size] || DOT_SIZES.md;

  const finalAvatar = avatar ?? user?.avatar ?? "🐱";
  const finalAvatarUrl = user?.avatarUrl || null;
  const finalColor = color ?? user?.colorTheme ?? "#6366f1";
  const finalSymbol = symbol ?? user?.symbol ?? "";

  const handleClick = (e) => {
    if (onClick) {
      e.stopPropagation();
      onClick(
        user || {
          avatar: finalAvatar,
          colorTheme: finalColor,
          symbol: finalSymbol,
        }
      );
    }
  };

  const clickable = !!onClick;
  const onlineStatus = showOnline ? getOnlineStatus(user) : null;

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      <div
        onClick={handleClick}
        className={`${sizeCls} rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center font-medium transition overflow-hidden ${
          clickable ? "cursor-pointer hover:scale-105" : ""
        }`}
        style={{ border: `2px solid ${finalColor}` }}
      >
        {finalAvatarUrl ? (
          <img
            src={finalAvatarUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.textContent = finalAvatar;
            }}
          />
        ) : (
          finalAvatar
        )}
      </div>

      {/* Онлайн-точка */}
      {showOnline && onlineStatus?.online && (
        <span
          className={`absolute bottom-0 right-0 ${dotCls} bg-green-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm`}
          title="В сети"
        />
      )}

      {/* Символ */}
      {showSymbol && finalSymbol && (
        <div
          className={`absolute ${symbolCls} bg-white dark:bg-slate-800 rounded-full px-1 leading-none shadow-sm pointer-events-none`}
          style={{ border: `1.5px solid ${finalColor}` }}
        >
          {finalSymbol}
        </div>
      )}
    </div>
  );
}