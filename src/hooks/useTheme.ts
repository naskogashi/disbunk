import { useSyncExternalStore, useEffect } from "react";

type Theme = "light" | "dark";
let fallback: Theme = "light";
const readTheme = (): Theme => {
  try { return localStorage.getItem("disbunk-theme") === "dark" ? "dark" : "light"; }
  catch { return fallback; }
};
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("disbunk-theme-change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("disbunk-theme-change", callback); };
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const setTheme = (next: Theme) => {
    fallback = next;
    try { localStorage.setItem("disbunk-theme", next); } catch { /* Use the session fallback. */ }
    window.dispatchEvent(new Event("disbunk-theme-change"));
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggleTheme };
}
