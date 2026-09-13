// Универсальная иконка из public/icons/*.svg
// Использует маску, чтобы можно было красить через CSS

export default function Icon({ name, size = 20, className = "" }) {
  return (
    <span
      className={`inline-block flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(/icons/${name}.svg)`,
        maskImage: `url(/icons/${name}.svg)`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}