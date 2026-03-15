import { useEffect, useState } from "react";
import type { ThemeMode } from "./types";

export function useResolvedTheme(theme: ThemeMode) {
  const [prefersDark, setPrefersDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setPrefersDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

export function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}
