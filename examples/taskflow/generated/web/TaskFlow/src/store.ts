import { create } from "zustand";
import type { Preferences, Project, ProjectDraft, Task, TaskDraft, User } from "./types";
import { addDays, daysAgo, parseTags } from "./utils";

type AppState = {
  user: User;
  users: User[];
  preferences: Preferences;
  projects: Project[];
  tasks: Task[];
  searchQuery: string;
  activeFilter: "all" | "today" | "upcoming" | "done";
  selectedTaskId?: string;
  setSearchQuery: (value: string) => void;
  setActiveFilter: (value: "all" | "today" | "upcoming" | "done") => void;
  setSelectedTaskId: (value?: string) => void;
  setTheme: (value: Preferences["theme"]) => void;
  updatePreferences: (patch: Partial<Preferences>) => void;
  updateProfile: (patch: Pick<User, "name" | "email">) => void;
  createTask: (draft: TaskDraft) => Task;
  updateTask: (taskId: string, draft: TaskDraft) => void;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  assignTask: (taskId: string, userId: string) => void;
  createProject: (draft: ProjectDraft) => void;
};

const sampleUser: User = {
  id: "user-1",
  name: "Maya Hart",
  firstName: "Maya",
  email: "maya@taskflow.app"
};

const teamUsers: User[] = [
  sampleUser,
  { id: "user-2", name: "Luca Park", firstName: "Luca", email: "luca@taskflow.app" },
  { id: "user-3", name: "Noah Singh", firstName: "Noah", email: "noah@taskflow.app" }
];

const sampleProjects: Project[] = [
  { id: "proj-1", name: "Product Launch", color: "#5B4FE8", icon: "rocket", taskCount: 3 },
  { id: "proj-2", name: "Ops Cleanup", color: "#E8634F", icon: "briefcase", taskCount: 2 },
  { id: "proj-3", name: "Brand Refresh", color: "#2D9D5E", icon: "star", taskCount: 1 }
];

const sampleTasks: Task[] = [
  {
    id: "task-1",
    title: "Ship onboarding copy review",
    description: "Review the final onboarding text with product and legal before release.",
    status: "in_progress",
    priority: "high",
    dueDate: addDays(0),
    projectId: "proj-1",
    tags: ["launch", "copy"],
    createdAt: daysAgo(3),
    updatedAt: daysAgo(0),
    assignee: teamUsers[1],
    attachment: {
      source: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      mediaType: "video",
      title: "Launch teaser draft"
    }
  },
  {
    id: "task-2",
    title: "Audit due-date reminder logic",
    description: "Check notification timing against the reminder preference spec.",
    status: "todo",
    priority: "urgent",
    dueDate: addDays(2),
    projectId: "proj-2",
    tags: ["notifications", "qa"],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1)
  },
  {
    id: "task-3",
    title: "Warm theme polish pass",
    description: "Tune the warm theme tinting against the token ranges.",
    status: "done",
    priority: "medium",
    dueDate: daysAgo(1),
    projectId: "proj-3",
    tags: ["design"],
    createdAt: daysAgo(6),
    updatedAt: daysAgo(1),
    assignee: teamUsers[2]
  },
  {
    id: "task-4",
    title: "Prepare project import CSV",
    description: "Gather migration rows for the first customer workspace.",
    status: "todo",
    priority: "low",
    dueDate: addDays(4),
    projectId: "proj-2",
    tags: ["ops", "data"],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    assignee: sampleUser
  }
];

export const useAppStore = create<AppState>((set, get) => ({
  user: sampleUser,
  users: teamUsers,
  preferences: {
    theme: "system",
    defaultPriority: "medium",
    notificationsEnabled: true,
    remindersEnabled: true
  },
  projects: sampleProjects,
  tasks: sampleTasks,
  searchQuery: "",
  activeFilter: "today",
  selectedTaskId: sampleTasks[0]?.id,
  setSearchQuery: (value) => set({ searchQuery: value }),
  setActiveFilter: (value) => set({ activeFilter: value }),
  setSelectedTaskId: (value) => set({ selectedTaskId: value }),
  setTheme: (value) => set((state) => ({ preferences: { ...state.preferences, theme: value } })),
  updatePreferences: (patch) => set((state) => ({ preferences: { ...state.preferences, ...patch } })),
  updateProfile: (patch) =>
    set((state) => ({
      user: {
        ...state.user,
        ...patch,
        firstName: patch.name ? patch.name.split(" ")[0] ?? patch.name : state.user.firstName
      }
    })),
  createTask: (draft) => {
    const created: Task = {
      id: `task-${Date.now()}`,
      title: draft.title,
      description: draft.description || undefined,
      status: "todo",
      priority: draft.priority,
      dueDate: draft.dueDate || undefined,
      projectId: draft.projectId || undefined,
      tags: parseTags(draft.tags),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignee: draft.assignToSelf ? get().user : undefined
    };
    set((state) => ({ tasks: [created, ...state.tasks], selectedTaskId: created.id }));
    syncProjectCounts(set, get);
    return created;
  },
  updateTask: (taskId, draft) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title: draft.title,
              description: draft.description || undefined,
              priority: draft.priority,
              dueDate: draft.dueDate || undefined,
              projectId: draft.projectId || undefined,
              tags: parseTags(draft.tags),
              assignee: draft.assignToSelf ? state.user : task.assignee,
              updatedAt: new Date().toISOString()
            }
          : task
      )
    }));
    syncProjectCounts(set, get);
  },
  toggleTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === "done" ? "todo" : "done", updatedAt: new Date().toISOString() }
          : task
      )
    }));
  },
  deleteTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
      selectedTaskId:
        state.selectedTaskId === taskId ? state.tasks.find((task) => task.id !== taskId)?.id : state.selectedTaskId
    }));
    syncProjectCounts(set, get);
  },
  assignTask: (taskId, userId) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, assignee: state.users.find((user) => user.id === userId) } : task
      )
    }));
  },
  createProject: (draft) => {
    set((state) => ({
      projects: [
        ...state.projects,
        { id: `proj-${Date.now()}`, name: draft.name, color: draft.color, icon: draft.icon, taskCount: 0 }
      ]
    }));
  }
}));

function syncProjectCounts(
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  get: () => AppState
) {
  const tasks = get().tasks;
  set((state) => ({
    projects: state.projects.map((project) => ({
      ...project,
      taskCount: tasks.filter((task) => task.projectId === project.id).length
    }))
  }));
}
