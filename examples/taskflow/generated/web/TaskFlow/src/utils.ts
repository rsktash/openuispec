import type { Filter, Project, Task } from "./types";

export function matchesFilter(task: Task, filter: Filter) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (filter === "all") return true;
  if (filter === "done") return task.status === "done";
  if (filter === "today") return Boolean(due && due.toDateString() === today.toDateString() && task.status !== "done");
  return Boolean(due && due > today && task.status !== "done");
}

export function matchesQuery(task: Task, projects: Project[], query: string) {
  if (!query.trim()) return true;
  const projectName = projects.find((project) => project.id === task.projectId)?.name ?? "";
  return [task.title, task.description ?? "", projectName, task.tags.join(" ")]
    .join(" ")
    .toLowerCase()
    .includes(query.toLowerCase());
}

export function buildCounts(tasks: Task[]) {
  return {
    all: tasks.length,
    today: tasks.filter((task) => matchesFilter(task, "today")).length,
    upcoming: tasks.filter((task) => matchesFilter(task, "upcoming")).length,
    done: tasks.filter((task) => task.status === "done").length
  };
}

export function parseTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function relativeDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function addDays(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

export function daysAgo(days: number) {
  const previous = new Date();
  previous.setDate(previous.getDate() - days);
  return previous.toISOString();
}
