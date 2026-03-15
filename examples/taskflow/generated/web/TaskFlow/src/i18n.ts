import { messages } from "./generated/messages";

export function t(key: keyof typeof messages | string) {
  return messages[key as keyof typeof messages] ?? key;
}

export function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

export function greeting(name: string) {
  const hour = new Date().getHours();
  const key = hour < 12 ? "home.greeting.morning" : hour < 18 ? "home.greeting.afternoon" : "home.greeting.evening";
  return interpolate(t(key), { name });
}

export function taskCountLabel(count: number) {
  if (count === 0) return t("home.task_count.none");
  if (count === 1) return interpolate(t("home.task_count.one"), { count: "1" });
  return interpolate(t("home.task_count.other"), { count: String(count) });
}

export function projectTaskCountLabel(count: number) {
  if (count === 0) return t("projects.task_count.none");
  if (count === 1) return interpolate(t("projects.task_count.one"), { count: "1" });
  return interpolate(t("projects.task_count.other"), { count: String(count) });
}

export function priorityLabel(priority: string) {
  return t(`priority.${priority}`);
}

export function statusLabel(status: string) {
  return t(`status.${status}`);
}

export function filterLabel(filter: string) {
  return t(`home.filter.${filter}`);
}
