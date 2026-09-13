// Универсальная иконка из public/icons/*.svg
// Использует <img> + dark:invert для тёмной темы
// ВАЖНО: цвет не наследуется — иконка чёрная в светлой, белая в тёмной

export default function Icon({ name, size = 20, className = "" }) {
  return (
    <img
      src={`/icons/${name}.svg`}
      alt=""
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 dark:invert ${className}`}
      style={{ width: size, height: size, objectFit: "contain" }}
      draggable={false}
    />
  );
}