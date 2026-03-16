import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { tokens, type SizeClass } from "./tokens";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeDate(value: string) {
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffHours = Math.round((then - now) / (1000 * 60 * 60));
  const absHours = Math.abs(diffHours);
  const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (absHours < 24) {
    return relativeFormat.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  return relativeFormat.format(diffDays, "day");
}

export type UiScenario = "normal" | "loading" | "empty" | "error";

export function useUiScenario() {
  const [searchParams] = useSearchParams();
  const ui = searchParams.get("ui");
  if (ui === "loading" || ui === "empty" || ui === "error") {
    return ui;
  }
  return "normal" as const;
}

export function useSimulatedLoading(key: string, scenario: UiScenario) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scenario === "loading") {
      setLoading(true);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 320);
    return () => window.clearTimeout(timer);
  }, [key, scenario]);

  return loading;
}

export function useSizeClass(): SizeClass {
  const [sizeClass, setSizeClass] = useState<SizeClass>(() => getSizeClass(window.innerWidth));

  useEffect(() => {
    const onResize = () => setSizeClass(getSizeClass(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return sizeClass;
}

function getSizeClass(width: number): SizeClass {
  if (width <= tokens.breakpoints.compactMax) {
    return "compact";
  }
  if (width <= tokens.breakpoints.regularMax) {
    return "regular";
  }
  return "expanded";
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
