import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export const THEMES = ["dark", "light"];

export const BACKGROUNDS = {
  light: [
    { id: "default", label: "Обычный", css: "#f9fafb" },
    {
      id: "sunset",
      label: "Закат",
      css: "linear-gradient(135deg, #FFE5D9 0%, #FFD6BA 50%, #FCE1CB 100%)",
    },
    {
      id: "mint",
      label: "Мята",
      css: "linear-gradient(135deg, #E0F7F4 0%, #C7F0EA 50%, #B0E9E1 100%)",
    },
    {
      id: "lavender",
      label: "Лаванда",
      css: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 50%, #C4B5FD 100%)",
    },
    {
      id: "sky",
      label: "Небо",
      css: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 50%, #93C5FD 100%)",
    },
    {
      id: "peach",
      label: "Персик",
      css: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%)",
    },
  ],
  dark: [
    { id: "default", label: "Ночь", css: "#0f172a" },
    {
      id: "midnight",
      label: "Полночь",
      css: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    },
    {
      id: "forest",
      label: "Лес",
      css: "linear-gradient(135deg, #0f172a 0%, #064e3b 100%)",
    },
    {
      id: "wine",
      label: "Вино",
      css: "linear-gradient(135deg, #0f172a 0%, #4c1d24 100%)",
    },
    {
      id: "ocean",
      label: "Океан",
      css: "linear-gradient(135deg, #0f172a 0%, #0c4a6e 100%)",
    },
    {
      id: "purple",
      label: "Пурпур",
      css: "linear-gradient(135deg, #0f172a 0%, #581c87 100%)",
    },
  ],
};

export function ThemeProvider({ children }) {
  // Тёмная тема по умолчанию
  const [theme, setTheme] = useState(
    () => localStorage.getItem("shtab_theme") || "dark"
  );
  const [bg, setBg] = useState(
    () => localStorage.getItem("shtab_bg") || "default"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("shtab_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("shtab_bg", bg);
    const list = BACKGROUNDS[theme];
    const found = list.find((b) => b.id === bg) || list[0];
    document.body.style.background = found.css;
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.minHeight = "100vh";
  }, [bg, theme]);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    setBg("default");
  };

  return (
    <ThemeContext.Provider
      value={{ theme, bg, setBg, changeTheme, THEMES, BACKGROUNDS }}
    >
      {children}
    </ThemeContext.Provider>
  );
}