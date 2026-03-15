export type Priority = "low" | "medium" | "high" | "urgent";
export type Status = "todo" | "in_progress" | "done";
export type ThemeMode = "system" | "light" | "dark" | "warm";
export type Filter = "all" | "today" | "upcoming" | "done";
export type SizeClass = "compact" | "regular" | "expanded";

export type User = {
  id: string;
  name: string;
  firstName: string;
  email: string;
};

export type Project = {
  id: string;
  name: string;
  color: string;
  icon: string;
  taskCount: number;
};

export type Attachment = {
  source: string;
  mediaType: "audio" | "video";
  title: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  dueDate?: string;
  projectId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  assignee?: User;
  attachment?: Attachment;
};

export type Preferences = {
  theme: ThemeMode;
  defaultPriority: Priority;
  notificationsEnabled: boolean;
  remindersEnabled: boolean;
};

export type TaskDraft = {
  title: string;
  description: string;
  projectId: string;
  priority: Priority;
  dueDate: string;
  tags: string;
  assignToSelf: boolean;
};

export type ProjectDraft = {
  name: string;
  color: string;
  icon: string;
};
