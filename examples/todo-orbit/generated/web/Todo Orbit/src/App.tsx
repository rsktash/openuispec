import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState
} from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { create } from "zustand";

type Locale = "en" | "ru";
type Theme = "light" | "dark";
type TaskStatus = "open" | "done";
type Priority = "low" | "medium" | "high";
type Filter = "all" | "open" | "done";
type Period = "week" | "month" | "quarter";
type Cadence = "daily" | "weekly" | "monthly";
type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type SummaryChannel = "push" | "email";

type Task = {
  id: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};

type Preferences = {
  locale: Locale;
  theme: Theme;
  remindersEnabled: boolean;
  dailySummaryEnabled: boolean;
};

type RecurringRule = {
  id: string;
  name: string;
  cadence: Cadence;
  interval: number;
  weekday?: Weekday;
  monthDay?: number;
  startDate: string;
  endDate?: string;
  remindAt?: string;
  summaryChannel?: SummaryChannel;
};

type Toast = {
  id: string;
  message: string;
  severity: "success" | "warning" | "error" | "info";
};

type TrendPoint = {
  label: string;
  completed: number;
  created: number;
};

type RuleDraft = {
  name: string;
  confirmName: string;
  cadence: "" | Cadence;
  interval: string;
  weekday: "" | Weekday;
  monthDay: string;
  startDate: string;
  hasEndDate: boolean;
  endDate: string;
  remindAt: string;
  enableSummary: boolean;
  summaryChannel: "" | SummaryChannel;
};

const messages: Record<Locale, Record<string, string>> = {
  en: {
    "nav.tasks": "Tasks",
    "nav.analytics": "Analytics",
    "nav.settings": "Settings",
    "home.title": "Today, organized",
    "home.search_label": "Search tasks",
    "home.search_placeholder": "Search by title or notes",
    "home.filter.all": "All",
    "home.filter.open": "Open",
    "home.filter.done": "Done",
    "home.mark_complete": "Mark {title} complete",
    "home.empty_title": "Nothing to do",
    "home.empty_body": "Add a task or switch filters to see more items.",
    "home.new_task": "New task",
    "analytics.title": "Task analytics",
    "analytics.subtitle": "Monitor throughput, overdue work, and completion trends.",
    "analytics.period_week": "Week",
    "analytics.period_month": "Month",
    "analytics.period_quarter": "Quarter",
    "analytics.completed_today": "Completed today",
    "analytics.open_tasks": "Open tasks",
    "analytics.overdue_tasks": "Overdue",
    "analytics.completion_rate": "Completion rate",
    "analytics.overdue_section": "Overdue review",
    "analytics.overdue_subtitle": "Tasks that need attention first.",
    "analytics.empty_trend": "No trend data yet.",
    "analytics.empty_overdue": "No overdue tasks",
    "analytics.empty_overdue_body": "Everything important is on track.",
    "task_detail.status": "Status",
    "task_detail.priority": "Priority",
    "task_detail.notes": "Notes",
    "task_detail.due_date": "Due date",
    "task_detail.no_due_date": "No deadline",
    "task_detail.created": "Created",
    "task_detail.updated": "Updated",
    "task_detail.edit": "Edit task",
    "task_detail.toggle_status": "Toggle status",
    "task_detail.more_info": "More info",
    "task_detail.delete": "Delete task",
    "task_detail.delete_title": "Delete this task?",
    "task_detail.delete_message": "This action cannot be undone.",
    "task_detail.updated_feedback": "Task updated",
    "task_detail.update_error": "Could not update task",
    "task_detail.deleted_feedback": "Task deleted",
    "settings.title": "Preferences",
    "settings.subtitle": "Adjust language and theme for every platform target.",
    "settings.language": "Language",
    "settings.language_en": "English",
    "settings.language_ru": "Russian",
    "settings.theme": "Theme",
    "settings.theme_light": "Light",
    "settings.theme_dark": "Dark",
    "settings.reminders": "Due date reminders",
    "settings.reminders_helper": "Notify me before tasks are due.",
    "settings.daily_summary": "Daily summary",
    "settings.daily_summary_helper": "Send a summary of open work each morning.",
    "settings.automation_title": "Automation",
    "settings.automation_subtitle": "Create recurring task rules to stress conditional forms and validation.",
    "settings.automation_create_rule": "Create recurring rule",
    "settings.save": "Save changes",
    "settings.saving": "Saving...",
    "settings.saved": "Preferences updated",
    "settings.error_title": "Could not update preferences",
    "create_task.title": "New task",
    "create_task.save": "Save",
    "create_task.saving": "Saving...",
    "create_task.field_title": "Title",
    "create_task.field_title_placeholder": "What needs to be done?",
    "create_task.field_notes": "Notes",
    "create_task.field_notes_placeholder": "Context, links, or next steps",
    "create_task.field_priority": "Priority",
    "create_task.field_due_date": "Due date",
    "create_task.field_due_date_placeholder": "No deadline",
    "create_task.success": "Task created",
    "create_task.error_title": "Could not create task",
    "edit_task.title": "Edit task",
    "edit_task.save": "Save",
    "edit_task.saving": "Saving...",
    "edit_task.field_title": "Title",
    "edit_task.field_notes": "Notes",
    "edit_task.field_priority": "Priority",
    "edit_task.field_due_date": "Due date",
    "edit_task.success": "Task saved",
    "edit_task.error_title": "Could not save task",
    "recurring_rule.title": "Recurring rule",
    "recurring_rule.subtitle": "Configure a reusable schedule with conditional inputs and validation.",
    "recurring_rule.save": "Save rule",
    "recurring_rule.saving": "Saving...",
    "recurring_rule.success": "Recurring rule created",
    "recurring_rule.error_title": "Could not create recurring rule",
    "recurring_rule.field_name": "Rule name",
    "recurring_rule.field_name_placeholder": "Daily planning ritual",
    "recurring_rule.field_confirm_name": "Confirm rule name",
    "recurring_rule.field_confirm_name_placeholder": "Repeat the rule name",
    "recurring_rule.field_cadence": "Cadence",
    "recurring_rule.cadence_daily": "Daily",
    "recurring_rule.cadence_weekly": "Weekly",
    "recurring_rule.cadence_monthly": "Monthly",
    "recurring_rule.field_interval": "Repeat every",
    "recurring_rule.field_interval_helper": "Use whole numbers between 1 and 30.",
    "recurring_rule.field_weekday": "Weekday",
    "recurring_rule.field_month_day": "Day of month",
    "recurring_rule.field_month_day_helper": "Limited to 28 for portable scheduling.",
    "recurring_rule.field_start_date": "Start date",
    "recurring_rule.field_has_end_date": "Set an end date",
    "recurring_rule.field_has_end_date_helper": "Stop generating tasks after a specific date.",
    "recurring_rule.field_end_date": "End date",
    "recurring_rule.field_remind_at": "Reminder time",
    "recurring_rule.field_remind_at_placeholder": "09:00",
    "recurring_rule.field_remind_at_helper": "24-hour time in HH:MM format. Shown only when reminders are enabled.",
    "recurring_rule.field_enable_summary": "Attach daily summary delivery",
    "recurring_rule.field_enable_summary_helper": "Choose how the summary should be delivered for this rule.",
    "recurring_rule.field_summary_channel": "Summary channel",
    "recurring_rule.summary_push": "Push notification",
    "recurring_rule.summary_email": "Email",
    "recurring_preview.title": "Upcoming schedule preview",
    "recurring_preview.empty": "No upcoming dates can be generated from this rule.",
    "recurring_preview.invalid": "Complete the cadence and date fields to preview the schedule.",
    "priority.low": "Low",
    "priority.medium": "Medium",
    "priority.high": "High",
    "status.open": "Open",
    "status.done": "Done",
    "validation.min_length": "Must be at least {min} characters",
    "validation.min_value": "Must be at least {min}",
    "validation.max_value": "Must be no more than {max}",
    "validation.fix_errors": "Fix the highlighted fields before saving.",
    "validation.rule_name_min_length": "Rule name must be at least {min} characters",
    "validation.rule_name_reserved": "The default name is reserved. Choose a more specific label.",
    "validation.rule_name_taken": "A recurring rule with this name already exists.",
    "validation.match_field": "Fields do not match",
    "validation.end_date_after_start": "End date must be the same as or later than the start date.",
    "validation.time_format": "Use a 24-hour time like 09:00",
    "validation.month_day_max": "Choose a day between 1 and 28",
    "weekday.mon": "Monday",
    "weekday.tue": "Tuesday",
    "weekday.wed": "Wednesday",
    "weekday.thu": "Thursday",
    "weekday.fri": "Friday",
    "weekday.sat": "Saturday",
    "weekday.sun": "Sunday",
    "common.cancel": "Cancel",
    "common.delete": "Delete"
  },
  ru: {
    "nav.tasks": "Задачи",
    "nav.analytics": "Аналитика",
    "nav.settings": "Настройки",
    "home.title": "Сегодня все под контролем",
    "home.search_label": "Поиск задач",
    "home.search_placeholder": "Искать по названию или заметкам",
    "home.filter.all": "Все",
    "home.filter.open": "Открытые",
    "home.filter.done": "Выполненные",
    "home.mark_complete": "Отметить задачу «{title}» выполненной",
    "home.empty_title": "Список пуст",
    "home.empty_body": "Добавьте задачу или смените фильтр, чтобы увидеть элементы.",
    "home.new_task": "Новая задача",
    "analytics.title": "Аналитика задач",
    "analytics.subtitle": "Следите за выполнением, просроченными задачами и динамикой.",
    "analytics.period_week": "Неделя",
    "analytics.period_month": "Месяц",
    "analytics.period_quarter": "Квартал",
    "analytics.completed_today": "Выполнено сегодня",
    "analytics.open_tasks": "Открытые задачи",
    "analytics.overdue_tasks": "Просрочено",
    "analytics.completion_rate": "Процент выполнения",
    "analytics.overdue_section": "Просроченные задачи",
    "analytics.overdue_subtitle": "Задачи, которым нужно уделить внимание в первую очередь.",
    "analytics.empty_trend": "Данные тренда пока отсутствуют.",
    "analytics.empty_overdue": "Просроченных задач нет",
    "analytics.empty_overdue_body": "Все важные задачи идут по плану.",
    "task_detail.status": "Статус",
    "task_detail.priority": "Приоритет",
    "task_detail.notes": "Заметки",
    "task_detail.due_date": "Срок",
    "task_detail.no_due_date": "Без срока",
    "task_detail.created": "Создано",
    "task_detail.updated": "Обновлено",
    "task_detail.edit": "Редактировать задачу",
    "task_detail.toggle_status": "Сменить статус",
    "task_detail.more_info": "Подробнее",
    "task_detail.delete": "Удалить задачу",
    "task_detail.delete_title": "Удалить эту задачу?",
    "task_detail.delete_message": "Это действие нельзя отменить.",
    "task_detail.updated_feedback": "Задача обновлена",
    "task_detail.update_error": "Не удалось обновить задачу",
    "task_detail.deleted_feedback": "Задача удалена",
    "settings.title": "Параметры",
    "settings.subtitle": "Измените язык и тему для всех целевых платформ.",
    "settings.language": "Язык",
    "settings.language_en": "Английский",
    "settings.language_ru": "Русский",
    "settings.theme": "Тема",
    "settings.theme_light": "Светлая",
    "settings.theme_dark": "Тёмная",
    "settings.reminders": "Напоминания о сроках",
    "settings.reminders_helper": "Уведомлять перед наступлением срока задачи.",
    "settings.daily_summary": "Ежедневная сводка",
    "settings.daily_summary_helper": "Присылать утреннюю сводку по открытым задачам.",
    "settings.automation_title": "Автоматизация",
    "settings.automation_subtitle": "Создавайте повторяющиеся правила задач, чтобы проверить условные формы и валидацию.",
    "settings.automation_create_rule": "Создать правило",
    "settings.save": "Сохранить",
    "settings.saving": "Сохранение...",
    "settings.saved": "Параметры обновлены",
    "settings.error_title": "Не удалось обновить параметры",
    "create_task.title": "Новая задача",
    "create_task.save": "Сохранить",
    "create_task.saving": "Сохранение...",
    "create_task.field_title": "Название",
    "create_task.field_title_placeholder": "Что нужно сделать?",
    "create_task.field_notes": "Заметки",
    "create_task.field_notes_placeholder": "Контекст, ссылки или следующие шаги",
    "create_task.field_priority": "Приоритет",
    "create_task.field_due_date": "Срок",
    "create_task.field_due_date_placeholder": "Без срока",
    "create_task.success": "Задача создана",
    "create_task.error_title": "Не удалось создать задачу",
    "edit_task.title": "Редактировать задачу",
    "edit_task.save": "Сохранить",
    "edit_task.saving": "Сохранение...",
    "edit_task.field_title": "Название",
    "edit_task.field_notes": "Заметки",
    "edit_task.field_priority": "Приоритет",
    "edit_task.field_due_date": "Срок",
    "edit_task.success": "Задача сохранена",
    "edit_task.error_title": "Не удалось сохранить задачу",
    "recurring_rule.title": "Повторяющееся правило",
    "recurring_rule.subtitle": "Настройте расписание с условными полями и валидацией.",
    "recurring_rule.save": "Сохранить правило",
    "recurring_rule.saving": "Сохранение...",
    "recurring_rule.success": "Повторяющееся правило создано",
    "recurring_rule.error_title": "Не удалось создать правило",
    "recurring_rule.field_name": "Название правила",
    "recurring_rule.field_name_placeholder": "Ежедневный ритуал планирования",
    "recurring_rule.field_confirm_name": "Подтвердите название",
    "recurring_rule.field_confirm_name_placeholder": "Повторите название правила",
    "recurring_rule.field_cadence": "Периодичность",
    "recurring_rule.cadence_daily": "Ежедневно",
    "recurring_rule.cadence_weekly": "Еженедельно",
    "recurring_rule.cadence_monthly": "Ежемесячно",
    "recurring_rule.field_interval": "Повторять каждые",
    "recurring_rule.field_interval_helper": "Используйте целые числа от 1 до 30.",
    "recurring_rule.field_weekday": "День недели",
    "recurring_rule.field_month_day": "День месяца",
    "recurring_rule.field_month_day_helper": "Ограничено 28 днями для переносимого расписания.",
    "recurring_rule.field_start_date": "Дата начала",
    "recurring_rule.field_has_end_date": "Указать дату окончания",
    "recurring_rule.field_has_end_date_helper": "Прекратить создание задач после определённой даты.",
    "recurring_rule.field_end_date": "Дата окончания",
    "recurring_rule.field_remind_at": "Время напоминания",
    "recurring_rule.field_remind_at_placeholder": "09:00",
    "recurring_rule.field_remind_at_helper": "24-часовой формат HH:MM. Поле показывается, только если напоминания включены.",
    "recurring_rule.field_enable_summary": "Добавить ежедневную сводку",
    "recurring_rule.field_enable_summary_helper": "Выберите способ доставки сводки для этого правила.",
    "recurring_rule.field_summary_channel": "Канал сводки",
    "recurring_rule.summary_push": "Push-уведомление",
    "recurring_rule.summary_email": "Электронная почта",
    "recurring_preview.title": "Предпросмотр расписания",
    "recurring_preview.empty": "Для этого правила не удаётся сформировать будущие даты.",
    "recurring_preview.invalid": "Заполните периодичность и даты, чтобы увидеть предпросмотр расписания.",
    "priority.low": "Низкий",
    "priority.medium": "Средний",
    "priority.high": "Высокий",
    "status.open": "Открыта",
    "status.done": "Выполнена",
    "validation.min_length": "Минимум {min} символа(ов)",
    "validation.min_value": "Значение должно быть не меньше {min}",
    "validation.max_value": "Значение должно быть не больше {max}",
    "validation.fix_errors": "Исправьте выделенные поля перед сохранением.",
    "validation.rule_name_min_length": "Название правила должно содержать минимум {min} символа(ов)",
    "validation.rule_name_reserved": "Название по умолчанию зарезервировано. Укажите более точную метку.",
    "validation.rule_name_taken": "Правило с таким названием уже существует.",
    "validation.match_field": "Поля не совпадают",
    "validation.end_date_after_start": "Дата окончания должна быть не раньше даты начала.",
    "validation.time_format": "Используйте 24-часовой формат, например 09:00",
    "validation.month_day_max": "Выберите день от 1 до 28",
    "weekday.mon": "Понедельник",
    "weekday.tue": "Вторник",
    "weekday.wed": "Среда",
    "weekday.thu": "Четверг",
    "weekday.fri": "Пятница",
    "weekday.sat": "Суббота",
    "weekday.sun": "Воскресенье",
    "common.cancel": "Отмена",
    "common.delete": "Удалить"
  }
};

const priorityAccent: Record<Priority, string> = {
  low: "var(--priority-low)",
  medium: "var(--priority-medium)",
  high: "var(--priority-high)"
};

const seedTasks: Task[] = [
  {
    id: "task-1",
    title: "Prepare bilingual launch notes",
    notes: "Document the web, iOS, and Android behavior differences before review.",
    status: "open",
    priority: "high",
    dueDate: shiftDate(2),
    createdAt: shiftDateTime(-6),
    updatedAt: shiftDateTime(-1)
  },
  {
    id: "task-2",
    title: "Review recurring-rule validation",
    notes: "Confirm async uniqueness checks and cross-field constraints.",
    status: "done",
    priority: "medium",
    dueDate: shiftDate(-1),
    createdAt: shiftDateTime(-5),
    updatedAt: shiftDateTime(0)
  },
  {
    id: "task-3",
    title: "Polish analytics empty states",
    notes: "Ensure chart and overdue list degrade gracefully on zero-data snapshots.",
    status: "open",
    priority: "medium",
    dueDate: shiftDate(5),
    createdAt: shiftDateTime(-4),
    updatedAt: shiftDateTime(-2)
  },
  {
    id: "task-4",
    title: "Regenerate drift snapshots",
    notes: "Refresh ios, android, and web state after spec edits.",
    status: "open",
    priority: "low",
    dueDate: shiftDate(-3),
    createdAt: shiftDateTime(-3),
    updatedAt: shiftDateTime(-3)
  },
  {
    id: "task-5",
    title: "Prototype schedule preview contract",
    notes: "Use derived occurrences to prove custom-contract generation.",
    status: "done",
    priority: "high",
    dueDate: shiftDate(1),
    createdAt: shiftDateTime(-8),
    updatedAt: shiftDateTime(-1)
  }
];

const initialPreferences: Preferences = {
  locale: "en",
  theme: "light",
  remindersEnabled: true,
  dailySummaryEnabled: false
};

type AppState = {
  locale: Locale;
  preferences: Preferences;
  tasks: Task[];
  rules: RecurringRule[];
  selectedTaskId: string | null;
  toasts: Toast[];
  setSelectedTask: (taskId: string | null) => void;
  savePreferences: (preferences: Preferences) => void;
  createTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Task;
  updateTask: (taskId: string, patch: Partial<Omit<Task, "id">>) => void;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  addRule: (rule: Omit<RecurringRule, "id">) => void;
  pushToast: (message: string, severity: Toast["severity"]) => void;
  removeToast: (toastId: string) => void;
};

const useAppStore = create<AppState>((set, get) => ({
  locale: initialPreferences.locale,
  preferences: initialPreferences,
  tasks: seedTasks,
  rules: [],
  selectedTaskId: seedTasks[0]?.id ?? null,
  toasts: [],
  setSelectedTask: (taskId) => set({ selectedTaskId: taskId }),
  savePreferences: (preferences) =>
    set({
      preferences,
      locale: preferences.locale
    }),
  createTask: (task) => {
    const nextTask: Task = {
      ...task,
      id: createId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set((state) => ({
      tasks: [nextTask, ...state.tasks],
      selectedTaskId: nextTask.id
    }));
    return nextTask;
  },
  updateTask: (taskId, patch) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? { ...task, ...patch, updatedAt: new Date().toISOString() }
          : task
      )
    })),
  toggleTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === "done" ? "open" : "done",
              updatedAt: new Date().toISOString()
            }
          : task
      )
    })),
  deleteTask: (taskId) =>
    set((state) => {
      const nextTasks = state.tasks.filter((task) => task.id !== taskId);
      return {
        tasks: nextTasks,
        selectedTaskId:
          state.selectedTaskId === taskId ? nextTasks[0]?.id ?? null : state.selectedTaskId
      };
    }),
  addRule: (rule) =>
    set((state) => ({
      rules: [{ ...rule, id: createId() }, ...state.rules]
    })),
  pushToast: (message, severity) => {
    const toast = { id: createId(), message, severity };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    window.setTimeout(() => get().removeToast(toast.id), 2600);
  },
  removeToast: (toastId) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== toastId)
    }))
}));

type ModalState =
  | { type: "create-task" }
  | { type: "edit-task"; taskId: string }
  | { type: "recurring-rule" }
  | { type: "task-meta"; taskId: string }
  | null;

export default function App() {
  const theme = useAppStore((state) => state.preferences.theme);
  const locale = useAppStore((state) => state.locale);
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale;
  }, [locale, theme]);

  return (
    <div className="app-frame">
      <AppShell onOpenModal={setModal} />
      <ToastViewport toasts={toasts} onDismiss={removeToast} />
      {modal?.type === "create-task" && <TaskFormModal onClose={() => setModal(null)} />}
      {modal?.type === "edit-task" && (
        <TaskFormModal taskId={modal.taskId} onClose={() => setModal(null)} />
      )}
      {modal?.type === "recurring-rule" && (
        <RecurringRuleModal onClose={() => setModal(null)} />
      )}
      {modal?.type === "task-meta" && (
        <TaskMetaModal taskId={modal.taskId} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function AppShell({ onOpenModal }: { onOpenModal: (modal: ModalState) => void }) {
  const location = useLocation();
  const t = useTranslator();

  return (
    <div className="shell-layout">
      <aside className="nav-shell cut-surface">
        <div className="brand-lockup">
          <div className="brand-mark">TO</div>
          <div>
            <p className="eyebrow">OpenUISpec generated</p>
            <h1>Todo Orbit</h1>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Primary">
          <NavItem to="/" active={location.pathname === "/" || location.pathname.startsWith("/tasks/")}>
            {t("nav.tasks")}
          </NavItem>
          <NavItem to="/analytics" active={location.pathname.startsWith("/analytics")}>
            {t("nav.analytics")}
          </NavItem>
          <NavItem to="/settings" active={location.pathname.startsWith("/settings")}>
            {t("nav.settings")}
          </NavItem>
        </nav>

        <div className="nav-note cut-panel">
          <p className="eyebrow">Stress profile</p>
          <strong>2 custom contracts</strong>
          <span>Reactive validation, analytics, bilingual copy, and cut-corner components.</span>
        </div>
      </aside>

      <main className="screen-shell">
        <Routes>
          <Route path="/" element={<HomeScreen onOpenModal={onOpenModal} />} />
          <Route path="/tasks/:taskId" element={<TaskDetailRoute onOpenModal={onOpenModal} />} />
          <Route path="/analytics" element={<AnalyticsScreen />} />
          <Route path="/settings" element={<SettingsScreen onOpenModal={onOpenModal} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function HomeScreen({ onOpenModal }: { onOpenModal: (modal: ModalState) => void }) {
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const tasks = useAppStore((state) => state.tasks);
  const selectedTaskId = useAppStore((state) => state.selectedTaskId);
  const setSelectedTask = useAppStore((state) => state.setSelectedTask);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const pushToast = useAppStore((state) => state.pushToast);
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const t = useTranslator();
  const filteredTasks = useMemo(
    () => filterTasks(tasks, activeFilter, deferredSearch),
    [activeFilter, deferredSearch, tasks]
  );
  const counts = getTaskCounts(tasks);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null;

  useEffect(() => {
    if (!selectedTaskId && filteredTasks[0]) {
      setSelectedTask(filteredTasks[0].id);
    }
  }, [filteredTasks, selectedTaskId, setSelectedTask]);

  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">screens/home</p>
          <h2>{t("home.title")}</h2>
          <p className="screen-subtitle">{formatSummary(useAppStore.getState().locale, counts.open, counts.all)}</p>
        </div>
        <button className="cut-button primary" onClick={() => onOpenModal({ type: "create-task" })}>
          <span className="button-icon">+</span>
          {t("home.new_task")}
        </button>
      </header>

      <div className={`home-layout ${isDesktop ? "desktop" : ""}`}>
        <div className="home-primary">
          <label className="field-block">
            <span className="field-label">{t("home.search_label")}</span>
            <div className="cut-input input-shell">
              <span className="leading-icon">⌕</span>
              <input
                value={searchQuery}
                onChange={(event) =>
                  startTransition(() => setSearchQuery(event.target.value))
                }
                placeholder={t("home.search_placeholder")}
              />
              {searchQuery ? (
                <button
                  className="clear-button"
                  onClick={() => setSearchQuery("")}
                  type="button"
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </div>
          </label>

          <div className="chip-row">
            {(["all", "open", "done"] as Filter[]).map((filterId) => (
              <button
                key={filterId}
                className={`cut-button ghost ${activeFilter === filterId ? "selected" : ""}`}
                onClick={() => startTransition(() => setActiveFilter(filterId))}
              >
                {t(`home.filter.${filterId}`)} ({counts[filterId]})
              </button>
            ))}
          </div>

          <div className="task-list cut-surface">
            {filteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">○</div>
                <h3>{t("home.empty_title")}</h3>
                <p>{t("home.empty_body")}</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <button
                  key={task.id}
                  className={`task-row ${selectedTask?.id === task.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedTask(task.id);
                    if (!isDesktop) {
                      navigate(`/tasks/${task.id}`);
                    }
                  }}
                >
                  <label
                    className="checkbox-shell"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <input
                      checked={task.status === "done"}
                      onChange={() => {
                        toggleTask(task.id);
                        pushToast(t("task_detail.updated_feedback"), "success");
                      }}
                      type="checkbox"
                      aria-label={t("home.mark_complete", { title: task.title })}
                    />
                  </label>

                  <div className="task-copy">
                    <strong>{task.title}</strong>
                    <span>{formatRelativeDate(task.dueDate, useAppStore.getState().locale, t("task_detail.no_due_date"))}</span>
                  </div>

                  <span className="priority-dot" style={{ background: priorityAccent[task.priority] }} />
                </button>
              ))
            )}
          </div>
        </div>

        {isDesktop && selectedTask ? (
          <div className="home-secondary">
            <TaskDetailCard task={selectedTask} onOpenModal={onOpenModal} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TaskDetailRoute({ onOpenModal }: { onOpenModal: (modal: ModalState) => void }) {
  const { taskId } = useParams();
  const task = useAppStore((state) => state.tasks.find((entry) => entry.id === taskId));

  if (!task) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="screen">
      <TaskDetailCard task={task} onOpenModal={onOpenModal} />
    </section>
  );
}

function TaskDetailCard({
  task,
  onOpenModal
}: {
  task: Task;
  onOpenModal: (modal: ModalState) => void;
}) {
  const t = useTranslator();
  const locale = useAppStore((state) => state.locale);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const pushToast = useAppStore((state) => state.pushToast);
  const navigate = useNavigate();

  return (
    <article className="task-detail cut-surface">
      <div className="hero-card">
        <div>
          <p className="eyebrow">screens/task_detail</p>
          <h2>{task.title}</h2>
          <p className="screen-subtitle">
            {task.dueDate ? formatAbsoluteDate(task.dueDate, locale) : t("task_detail.no_due_date")}
          </p>
        </div>
        <div className={`status-badge ${task.status}`}>{t(`status.${task.status}`)}</div>
      </div>

      <div className="stat-grid">
        <StatCard label={t("task_detail.status")} value={t(`status.${task.status}`)} />
        <StatCard label={t("task_detail.priority")} value={t(`priority.${task.priority}`)} />
        <StatCard label={t("task_detail.created")} value={formatAbsoluteDate(task.createdAt, locale)} />
        <StatCard label={t("task_detail.updated")} value={formatAbsoluteDate(task.updatedAt, locale)} />
      </div>

      {task.notes ? (
        <section className="detail-section">
          <h3>{t("task_detail.notes")}</h3>
          <p>{task.notes}</p>
        </section>
      ) : null}

      <section className="detail-list">
        <DetailRow label={t("task_detail.due_date")} value={task.dueDate ? formatAbsoluteDate(task.dueDate, locale) : t("task_detail.no_due_date")} />
        <DetailRow label={t("task_detail.created")} value={formatAbsoluteDate(task.createdAt, locale)} />
        <DetailRow label={t("task_detail.updated")} value={formatAbsoluteDate(task.updatedAt, locale)} />
      </section>

      <div className="action-row">
        <button className="cut-button primary" onClick={() => onOpenModal({ type: "edit-task", taskId: task.id })}>
          {t("task_detail.edit")}
        </button>
        <button
          className="cut-button ghost"
          onClick={() => {
            toggleTask(task.id);
            pushToast(t("task_detail.updated_feedback"), "success");
          }}
        >
          {t("task_detail.toggle_status")}
        </button>
        <button className="cut-button ghost" onClick={() => onOpenModal({ type: "task-meta", taskId: task.id })}>
          {t("task_detail.more_info")}
        </button>
        <button
          className="cut-button danger"
          onClick={() => {
            if (window.confirm(`${t("task_detail.delete_title")} ${t("task_detail.delete_message")}`)) {
              deleteTask(task.id);
              pushToast(t("task_detail.deleted_feedback"), "success");
              navigate("/");
            }
          }}
        >
          {t("task_detail.delete")}
        </button>
      </div>
    </article>
  );
}

function AnalyticsScreen() {
  const tasks = useAppStore((state) => state.tasks);
  const [period, setPeriod] = useState<Period>("week");
  const t = useTranslator();
  const locale = useAppStore((state) => state.locale);
  const overview = getAnalyticsOverview(tasks);
  const trend = getTrendSeries(tasks, period, locale);
  const overdue = getOverdueTasks(tasks);

  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">screens/analytics</p>
          <h2>{t("analytics.title")}</h2>
          <p className="screen-subtitle">{t("analytics.subtitle")}</p>
        </div>
      </header>

      <div className="chip-row">
        {(["week", "month", "quarter"] as Period[]).map((item) => (
          <button
            key={item}
            className={`cut-button ghost ${period === item ? "selected" : ""}`}
            onClick={() => setPeriod(item)}
          >
            {t(`analytics.period_${item}`)}
          </button>
        ))}
      </div>

      <div className="analytics-grid">
        <StatCard label={t("analytics.completed_today")} value={String(overview.completedToday)} />
        <StatCard label={t("analytics.open_tasks")} value={String(overview.openTasks)} />
        <StatCard label={t("analytics.overdue_tasks")} value={String(overview.overdueTasks)} />
        <StatCard label={t("analytics.completion_rate")} value={`${overview.completionRate}%`} />
      </div>

      <TaskTrendChart
        emptyMessage={t("analytics.empty_trend")}
        period={period}
        series={trend}
      />

      <section className="cut-surface">
        <div className="section-head">
          <div>
            <p className="eyebrow">collection.table</p>
            <h3>{t("analytics.overdue_section")}</h3>
            <p className="screen-subtitle">{t("analytics.overdue_subtitle")}</p>
          </div>
        </div>

        {overdue.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h3>{t("analytics.empty_overdue")}</h3>
            <p>{t("analytics.empty_overdue_body")}</p>
          </div>
        ) : (
          <div className="table-list">
            {overdue.map((task) => (
              <div className="table-row" key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{t(`priority.${task.priority}`)}</span>
                </div>
                <span>{task.dueDate ? formatAbsoluteDate(task.dueDate, locale) : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function SettingsScreen({ onOpenModal }: { onOpenModal: (modal: ModalState) => void }) {
  const preferences = useAppStore((state) => state.preferences);
  const savePreferences = useAppStore((state) => state.savePreferences);
  const pushToast = useAppStore((state) => state.pushToast);
  const t = useTranslator();
  const [form, setForm] = useState(preferences);

  useEffect(() => {
    setForm(preferences);
  }, [preferences]);

  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">screens/settings</p>
          <h2>{t("settings.title")}</h2>
          <p className="screen-subtitle">{t("settings.subtitle")}</p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="cut-surface form-stack">
          <SelectField
            label={t("settings.language")}
            value={form.locale}
            onChange={(value) => setForm((current) => ({ ...current, locale: value as Locale }))}
            options={[
              { label: t("settings.language_en"), value: "en" },
              { label: t("settings.language_ru"), value: "ru" }
            ]}
          />

          <SelectField
            label={t("settings.theme")}
            value={form.theme}
            onChange={(value) => setForm((current) => ({ ...current, theme: value as Theme }))}
            options={[
              { label: t("settings.theme_light"), value: "light" },
              { label: t("settings.theme_dark"), value: "dark" }
            ]}
          />

          <ToggleField
            label={t("settings.reminders")}
            helper={t("settings.reminders_helper")}
            checked={form.remindersEnabled}
            onChange={(checked) => setForm((current) => ({ ...current, remindersEnabled: checked }))}
          />

          <ToggleField
            label={t("settings.daily_summary")}
            helper={t("settings.daily_summary_helper")}
            checked={form.dailySummaryEnabled}
            onChange={(checked) => setForm((current) => ({ ...current, dailySummaryEnabled: checked }))}
          />

          <button
            className="cut-button primary full-width"
            onClick={() => {
              savePreferences(form);
              pushToast(t("settings.saved"), "success");
            }}
          >
            {t("settings.save")}
          </button>
        </section>

        <section className="cut-surface form-stack">
          <div className="section-head compact">
            <div>
              <p className="eyebrow">flows/create_recurring_rule</p>
              <h3>{t("settings.automation_title")}</h3>
              <p className="screen-subtitle">{t("settings.automation_subtitle")}</p>
            </div>
          </div>
          <button
            className="cut-button primary full-width"
            onClick={() => onOpenModal({ type: "recurring-rule" })}
          >
            {t("settings.automation_create_rule")}
          </button>
          <RuleList />
        </section>
      </div>
    </section>
  );
}

function TaskFormModal({
  taskId,
  onClose
}: {
  taskId?: string;
  onClose: () => void;
}) {
  const task = useAppStore((state) => state.tasks.find((entry) => entry.id === taskId));
  const createTask = useAppStore((state) => state.createTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const pushToast = useAppStore((state) => state.pushToast);
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [error, setError] = useState("");
  const t = useTranslator();

  const submit = () => {
    if (title.trim().length < 2) {
      setError(t("validation.min_length", { min: 2 }));
      return;
    }

    if (taskId) {
      updateTask(taskId, { title: title.trim(), notes: notes.trim(), priority, dueDate });
      pushToast(t("edit_task.success"), "success");
    } else {
      createTask({
        title: title.trim(),
        notes: notes.trim(),
        priority,
        dueDate,
        status: "open"
      });
      pushToast(t("create_task.success"), "success");
    }

    onClose();
  };

  return (
    <ModalShell
      title={taskId ? t("edit_task.title") : t("create_task.title")}
      subtitle={taskId ? "" : "flow.task_form"}
      onClose={onClose}
      action={
        <button className="cut-button primary" onClick={submit}>
          {taskId ? t("edit_task.save") : t("create_task.save")}
        </button>
      }
    >
      {error ? <InlineError message={error} /> : null}
      <TextField
        label={taskId ? t("edit_task.field_title") : t("create_task.field_title")}
        value={title}
        onChange={setTitle}
        placeholder={t("create_task.field_title_placeholder")}
        error={error}
      />
      <TextAreaField
        label={taskId ? t("edit_task.field_notes") : t("create_task.field_notes")}
        value={notes}
        onChange={setNotes}
        placeholder={t("create_task.field_notes_placeholder")}
      />
      <SelectField
        label={taskId ? t("edit_task.field_priority") : t("create_task.field_priority")}
        value={priority}
        onChange={(value) => setPriority(value as Priority)}
        options={[
          { label: t("priority.low"), value: "low" },
          { label: t("priority.medium"), value: "medium" },
          { label: t("priority.high"), value: "high" }
        ]}
      />
      <DateField
        label={taskId ? t("edit_task.field_due_date") : t("create_task.field_due_date")}
        value={dueDate}
        onChange={setDueDate}
      />
    </ModalShell>
  );
}

function RecurringRuleModal({ onClose }: { onClose: () => void }) {
  const t = useTranslator();
  const preferences = useAppStore((state) => state.preferences);
  const rules = useAppStore((state) => state.rules);
  const addRule = useAppStore((state) => state.addRule);
  const pushToast = useAppStore((state) => state.pushToast);
  const [draft, setDraft] = useState<RuleDraft>({
    name: "",
    confirmName: "",
    cadence: "",
    interval: "1",
    weekday: "",
    monthDay: "",
    startDate: isoToday(),
    hasEndDate: false,
    endDate: "",
    remindAt: "",
    enableSummary: false,
    summaryChannel: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);

  useEffect(() => {
    const trimmed = draft.name.trim();
    if (!trimmed || trimmed.length < 4 || trimmed === "Default") {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsCheckingName(true);
      window.setTimeout(() => {
        setErrors((current) => {
          const next = { ...current };
          const duplicate = rules.some(
            (rule) => rule.name.toLowerCase() === trimmed.toLowerCase()
          );
          if (duplicate) {
            next.name = t("validation.rule_name_taken");
          } else if (current.name === t("validation.rule_name_taken")) {
            delete next.name;
          }
          return next;
        });
        setIsCheckingName(false);
      }, 200);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [draft.name, rules, t]);

  const submit = () => {
    const nextErrors = validateRuleDraft(draft, preferences, rules, t);
    setErrors(nextErrors);
    setConfirmTouched(true);

    if (Object.keys(nextErrors).length > 0) {
      pushToast(t("validation.fix_errors"), "warning");
      return;
    }

    addRule({
      name: draft.name.trim(),
      cadence: draft.cadence as Cadence,
      interval: Number(draft.interval),
      weekday: draft.weekday || undefined,
      monthDay: draft.monthDay ? Number(draft.monthDay) : undefined,
      startDate: draft.startDate,
      endDate: draft.hasEndDate ? draft.endDate : undefined,
      remindAt: preferences.remindersEnabled ? draft.remindAt : undefined,
      summaryChannel: draft.enableSummary ? (draft.summaryChannel as SummaryChannel) : undefined
    });
    pushToast(t("recurring_rule.success"), "success");
    onClose();
  };

  const preview = getSchedulePreview({
    cadence: draft.cadence || undefined,
    interval: Number(draft.interval || 0),
    weekday: draft.weekday || undefined,
    monthDay: draft.monthDay ? Number(draft.monthDay) : undefined,
    startDate: draft.startDate,
    endDate: draft.hasEndDate ? draft.endDate : undefined,
    previewCount: 4
  });

  return (
    <ModalShell
      title={t("recurring_rule.title")}
      subtitle={t("recurring_rule.subtitle")}
      onClose={onClose}
      wide
      action={
        <button className="cut-button primary" onClick={submit}>
          {t("recurring_rule.save")}
        </button>
      }
    >
      <div className="modal-two-column">
        <div className="form-stack">
          <TextField
            label={t("recurring_rule.field_name")}
            value={draft.name}
            onChange={(value) => {
              setDraft((current) => ({ ...current, name: value }));
              setErrors((current) => {
                const next = { ...current };
                if (value.trim().length < 4) {
                  next.name = t("validation.rule_name_min_length", { min: 4 });
                } else if (value.trim() === "Default") {
                  next.name = t("validation.rule_name_reserved");
                } else {
                  delete next.name;
                }
                return next;
              });
            }}
            placeholder={t("recurring_rule.field_name_placeholder")}
            error={errors.name}
            helper={isCheckingName ? "Checking..." : undefined}
          />

          <TextField
            label={t("recurring_rule.field_confirm_name")}
            value={draft.confirmName}
            onChange={(value) => setDraft((current) => ({ ...current, confirmName: value }))}
            onBlur={() => setConfirmTouched(true)}
            placeholder={t("recurring_rule.field_confirm_name_placeholder")}
            error={confirmTouched ? errors.confirmName : ""}
          />

          <SelectField
            label={t("recurring_rule.field_cadence")}
            value={draft.cadence}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                cadence: value as RuleDraft["cadence"],
                weekday: value === "weekly" ? current.weekday : "",
                monthDay: value === "monthly" ? current.monthDay : ""
              }))
            }
            options={[
              { value: "", label: "—" },
              { value: "daily", label: t("recurring_rule.cadence_daily") },
              { value: "weekly", label: t("recurring_rule.cadence_weekly") },
              { value: "monthly", label: t("recurring_rule.cadence_monthly") }
            ]}
            error={errors.cadence}
          />

          <NumberField
            label={t("recurring_rule.field_interval")}
            value={draft.interval}
            onChange={(value) => setDraft((current) => ({ ...current, interval: value }))}
            helper={t("recurring_rule.field_interval_helper")}
            error={errors.interval}
          />

          {draft.cadence === "weekly" ? (
            <SelectField
              label={t("recurring_rule.field_weekday")}
              value={draft.weekday}
              onChange={(value) => setDraft((current) => ({ ...current, weekday: value as Weekday }))}
              options={[
                { value: "", label: "—" },
                { value: "mon", label: t("weekday.mon") },
                { value: "tue", label: t("weekday.tue") },
                { value: "wed", label: t("weekday.wed") },
                { value: "thu", label: t("weekday.thu") },
                { value: "fri", label: t("weekday.fri") },
                { value: "sat", label: t("weekday.sat") },
                { value: "sun", label: t("weekday.sun") }
              ]}
              error={errors.weekday}
            />
          ) : null}

          {draft.cadence === "monthly" ? (
            <NumberField
              label={t("recurring_rule.field_month_day")}
              value={draft.monthDay}
              onChange={(value) => setDraft((current) => ({ ...current, monthDay: value }))}
              helper={t("recurring_rule.field_month_day_helper")}
              error={errors.monthDay}
            />
          ) : null}

          <DateField
            label={t("recurring_rule.field_start_date")}
            value={draft.startDate}
            onChange={(value) => setDraft((current) => ({ ...current, startDate: value }))}
            error={errors.startDate}
          />

          <ToggleField
            label={t("recurring_rule.field_has_end_date")}
            helper={t("recurring_rule.field_has_end_date_helper")}
            checked={draft.hasEndDate}
            onChange={(checked) => setDraft((current) => ({ ...current, hasEndDate: checked }))}
          />

          <DateField
            label={t("recurring_rule.field_end_date")}
            value={draft.endDate}
            onChange={(value) => setDraft((current) => ({ ...current, endDate: value }))}
            disabled={!draft.hasEndDate}
            error={errors.endDate}
          />

          {preferences.remindersEnabled ? (
            <TextField
              label={t("recurring_rule.field_remind_at")}
              value={draft.remindAt}
              onChange={(value) => setDraft((current) => ({ ...current, remindAt: value }))}
              placeholder={t("recurring_rule.field_remind_at_placeholder")}
              helper={t("recurring_rule.field_remind_at_helper")}
              error={errors.remindAt}
            />
          ) : null}

          <ToggleField
            label={t("recurring_rule.field_enable_summary")}
            helper={t("recurring_rule.field_enable_summary_helper")}
            checked={draft.enableSummary}
            onChange={(checked) => setDraft((current) => ({ ...current, enableSummary: checked }))}
          />

          {draft.enableSummary ? (
            <SelectField
              label={t("recurring_rule.field_summary_channel")}
              value={draft.summaryChannel}
              onChange={(value) =>
                setDraft((current) => ({ ...current, summaryChannel: value as SummaryChannel }))
              }
              options={[
                { value: "", label: "—" },
                { value: "push", label: t("recurring_rule.summary_push") },
                { value: "email", label: t("recurring_rule.summary_email") }
              ]}
              error={errors.summaryChannel}
            />
          ) : null}
        </div>

        <SchedulePreviewCard preview={preview} />
      </div>
    </ModalShell>
  );
}

function TaskMetaModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const task = useAppStore((state) => state.tasks.find((entry) => entry.id === taskId));
  const locale = useAppStore((state) => state.locale);
  const t = useTranslator();

  if (!task) {
    return null;
  }

  return (
    <ModalShell title={t("task_detail.more_info")} onClose={onClose}>
      <DetailRow label={t("task_detail.status")} value={t(`status.${task.status}`)} />
      <DetailRow label={t("task_detail.priority")} value={t(`priority.${task.priority}`)} />
      <DetailRow label={t("task_detail.created")} value={formatAbsoluteDate(task.createdAt, locale)} />
      <DetailRow label={t("task_detail.updated")} value={formatAbsoluteDate(task.updatedAt, locale)} />
    </ModalShell>
  );
}

function ModalShell({
  title,
  subtitle,
  wide,
  onClose,
  action,
  children
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  onClose: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslator();

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal-card cut-surface ${wide ? "wide" : ""}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">surface.modal</p>
            <h3>{title}</h3>
            {subtitle ? <p className="screen-subtitle">{subtitle}</p> : null}
          </div>
          <div className="modal-actions">
            <button className="cut-button ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
            {action}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function RuleList() {
  const rules = useAppStore((state) => state.rules);
  const locale = useAppStore((state) => state.locale);

  if (rules.length === 0) {
    return null;
  }

  return (
    <div className="rule-list">
      {rules.map((rule) => (
        <div className="rule-card" key={rule.id}>
          <strong>{rule.name}</strong>
          <span>{describeRule(rule, locale)}</span>
        </div>
      ))}
    </div>
  );
}

function SchedulePreviewCard({
  preview
}: {
  preview: ReturnType<typeof getSchedulePreview>;
}) {
  const t = useTranslator();
  const locale = useAppStore((state) => state.locale);

  return (
    <section className="cut-surface preview-card">
      <div className="section-head compact">
        <div>
          <p className="eyebrow">x_schedule_preview.detail</p>
          <h3>{t("recurring_preview.title")}</h3>
        </div>
      </div>

      {preview.state === "invalid" ? (
        <InlineError message={t("recurring_preview.invalid")} />
      ) : null}

      {preview.state === "empty" ? (
        <div className="empty-state compact">
          <p>{t("recurring_preview.empty")}</p>
        </div>
      ) : null}

      {preview.state === "ready" ? (
        <div className="preview-list">
          {preview.occurrences.map((date, index) => (
            <div className={`preview-item ${index === 0 ? "next" : ""}`} key={date}>
              <strong>{index === 0 ? "Next" : `+${index}`}</strong>
              <span>{formatAbsoluteDate(date, locale)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TaskTrendChart({
  emptyMessage,
  period,
  series
}: {
  emptyMessage: string;
  period: Period;
  series: TrendPoint[];
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  if (series.length === 0) {
    return (
      <section className="cut-surface chart-card empty-state">
        <h3>{emptyMessage}</h3>
      </section>
    );
  }

  const width = 620;
  const height = 260;
  const padding = 36;
  const maxValue = Math.max(...series.flatMap((point) => [point.completed, point.created]), 1);
  const xStep = (width - padding * 2) / Math.max(series.length - 1, 1);
  const completedPath = series
    .map((point, index) => {
      const x = padding + index * xStep;
      const y = height - padding - (point.completed / maxValue) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const createdPath = series
    .map((point, index) => {
      const x = padding + index * xStep;
      const y = height - padding - (point.created / maxValue) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const highlighted = series[Math.min(highlightedIndex, series.length - 1)];

  return (
    <section className="cut-surface chart-card">
      <div className="section-head compact">
        <div>
          <p className="eyebrow">x_task_trend_chart.detail</p>
          <h3>{period.toUpperCase()} trend</h3>
        </div>
        <div className="legend">
          <span><i className="legend-dot created" />Created</span>
          <span><i className="legend-dot completed" />Completed</span>
        </div>
      </div>

      <svg
        aria-label={`${highlighted.label}: ${highlighted.completed} completed, ${highlighted.created} created`}
        className="trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
      >
        {Array.from({ length: 4 }).map((_, index) => {
          const y = padding + ((height - padding * 2) / 3) * index;
          return <line className="grid-line" key={y} x1={padding} x2={width - padding} y1={y} y2={y} />;
        })}
        <path className="line created" d={createdPath} />
        <path className="line completed" d={completedPath} />
        {series.map((point, index) => {
          const x = padding + index * xStep;
          const completedY = height - padding - (point.completed / maxValue) * (height - padding * 2);
          return (
            <g key={point.label}>
              <circle
                className={`point ${index === highlightedIndex ? "active" : ""}`}
                cx={x}
                cy={completedY}
                r={index === highlightedIndex ? 6 : 4}
                onMouseEnter={() => setHighlightedIndex(index)}
              />
              <text className="chart-label" x={x} y={height - 10} textAnchor="middle">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="chart-callout">
        <strong>{highlighted.label}</strong>
        <span>{highlighted.completed} completed</span>
        <span>{highlighted.created} created</span>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card cut-panel">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  error,
  onBlur
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string;
  onBlur?: () => void;
}) {
  return (
    <label className="field-block">
      <span className="field-label">{label}</span>
      <div className={`cut-input input-shell ${error ? "error" : ""}`}>
        <input value={value} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </div>
      {error ? <span className="field-error">{error}</span> : helper ? <span className="field-helper">{helper}</span> : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field-block">
      <span className="field-label">{label}</span>
      <div className="cut-input input-shell textarea-shell">
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </div>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  helper,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  error?: string;
}) {
  return (
    <label className="field-block">
      <span className="field-label">{label}</span>
      <div className={`cut-input input-shell ${error ? "error" : ""}`}>
        <input inputMode="numeric" type="number" value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
      {error ? <span className="field-error">{error}</span> : helper ? <span className="field-helper">{helper}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  error?: string;
}) {
  return (
    <label className="field-block">
      <span className="field-label">{label}</span>
      <div className={`cut-input input-shell ${error ? "error" : ""}`}>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  disabled,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <label className="field-block">
      <span className="field-label">{label}</span>
      <div className={`cut-input input-shell ${error ? "error" : ""} ${disabled ? "disabled" : ""}`}>
        <input disabled={disabled} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

function ToggleField({
  label,
  helper,
  checked,
  onChange
}: {
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <div>
        <span className="field-label">{label}</span>
        {helper ? <span className="field-helper">{helper}</span> : null}
      </div>
      <button
        className={`toggle-pill ${checked ? "checked" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          onChange(!checked);
        }}
        type="button"
      >
        <span />
      </button>
    </label>
  );
}

function InlineError({ message }: { message: string }) {
  return <div className="inline-error">{message}</div>;
}

function ToastViewport({
  toasts,
  onDismiss
}: {
  toasts: Toast[];
  onDismiss: (toastId: string) => void;
}) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <button
          className={`toast ${toast.severity}`}
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}

function NavItem({
  to,
  active,
  children
}: {
  to: string;
  active: boolean;
  children: string;
}) {
  return (
    <NavLink className={`nav-item ${active ? "active" : ""}`} to={to}>
      {children}
    </NavLink>
  );
}

function useTranslator() {
  const locale = useAppStore((state) => state.locale);
  return (key: string, params?: Record<string, string | number>) => {
    const template = messages[locale][key] ?? key;
    return Object.entries(params ?? {}).reduce(
      (output, [param, value]) => output.replaceAll(`{${param}}`, String(value)),
      template
    );
  };
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 1080px)").matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1080px)");
    const listener = () => setDesktop(mediaQuery.matches);
    listener();
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return desktop;
}

function filterTasks(tasks: Task[], activeFilter: Filter, query: string) {
  return tasks.filter((task) => {
    const byStatus = activeFilter === "all" ? true : task.status === activeFilter;
    const normalized = query.trim().toLowerCase();
    const bySearch =
      normalized.length === 0
        ? true
        : `${task.title} ${task.notes ?? ""}`.toLowerCase().includes(normalized);
    return byStatus && bySearch;
  });
}

function getTaskCounts(tasks: Task[]) {
  const open = tasks.filter((task) => task.status === "open").length;
  const done = tasks.filter((task) => task.status === "done").length;
  return { all: tasks.length, open, done };
}

function getAnalyticsOverview(tasks: Task[]) {
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = tasks.filter(
    (task) => task.status === "done" && task.updatedAt.slice(0, 10) === today
  ).length;
  const openTasks = tasks.filter((task) => task.status === "open").length;
  const overdueTasks = getOverdueTasks(tasks).length;
  const completionRate = tasks.length === 0 ? 0 : Math.round(((tasks.length - openTasks) / tasks.length) * 100);
  return { completedToday, openTasks, overdueTasks, completionRate };
}

function getOverdueTasks(tasks: Task[]) {
  const now = new Date().toISOString().slice(0, 10);
  return tasks.filter((task) => task.status === "open" && Boolean(task.dueDate) && task.dueDate! < now);
}

function getTrendSeries(tasks: Task[], period: Period, locale: Locale): TrendPoint[] {
  const length = period === "week" ? 7 : period === "month" ? 6 : 8;
  const today = new Date();
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: period === "week" ? "numeric" : undefined,
    weekday: period === "week" ? "short" : undefined
  });

  return Array.from({ length }).map((_, index) => {
    const offset = length - index - 1;
    const pointDate = new Date(today);
    pointDate.setDate(today.getDate() - offset * (period === "week" ? 1 : 5));
    const iso = pointDate.toISOString().slice(0, 10);
    const completed = tasks.filter(
      (task) => task.status === "done" && task.updatedAt.slice(0, 10) <= iso
    ).length;
    const created = tasks.filter((task) => task.createdAt.slice(0, 10) <= iso).length;
    return {
      label: formatter.format(pointDate),
      completed,
      created
    };
  });
}

function getSchedulePreview(input: {
  cadence?: Cadence;
  interval: number;
  weekday?: Weekday;
  monthDay?: number;
  startDate: string;
  endDate?: string;
  previewCount: number;
}) {
  if (!input.cadence || !input.startDate || input.interval < 1) {
    return { state: "invalid" as const, occurrences: [] };
  }

  if (input.endDate && input.endDate < input.startDate) {
    return { state: "invalid" as const, occurrences: [] };
  }

  const occurrences: string[] = [];
  const start = new Date(`${input.startDate}T09:00:00`);
  const end = input.endDate ? new Date(`${input.endDate}T23:59:59`) : null;

  if (input.cadence === "weekly" && !input.weekday) {
    return { state: "invalid" as const, occurrences: [] };
  }

  if (input.cadence === "monthly" && !input.monthDay) {
    return { state: "invalid" as const, occurrences: [] };
  }

  let cursor = new Date(start);
  let guard = 0;
  while (occurrences.length < input.previewCount && guard < 32) {
    guard += 1;
    const candidate = getOccurrence(input, cursor, start);
    if (!candidate) {
      break;
    }
    if (!end || candidate <= end) {
      const iso = candidate.toISOString().slice(0, 10);
      if (!occurrences.includes(iso)) {
        occurrences.push(iso);
      }
    }
    cursor = stepCursor(input, candidate);
  }

  if (occurrences.length === 0) {
    return { state: "empty" as const, occurrences: [] };
  }

  return { state: "ready" as const, occurrences };
}

function getOccurrence(
  input: {
    cadence?: Cadence;
    interval: number;
    weekday?: Weekday;
    monthDay?: number;
  },
  cursor: Date,
  start: Date
) {
  if (input.cadence === "daily") {
    return new Date(cursor);
  }

  if (input.cadence === "weekly" && input.weekday) {
    const weekdayIndex = weekdayToIndex(input.weekday);
    const next = new Date(cursor);
    while (next.getDay() !== weekdayIndex) {
      next.setDate(next.getDate() + 1);
    }
    if (next < start) {
      next.setDate(next.getDate() + 7 * input.interval);
    }
    return next;
  }

  if (input.cadence === "monthly" && input.monthDay) {
    const next = new Date(cursor);
    next.setDate(1);
    next.setHours(9, 0, 0, 0);
    next.setDate(input.monthDay);
    if (next < start) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(input.monthDay);
    }
    return next;
  }

  return null;
}

function stepCursor(
  input: {
    cadence?: Cadence;
    interval: number;
  },
  candidate: Date
) {
  const next = new Date(candidate);
  if (input.cadence === "daily") {
    next.setDate(next.getDate() + input.interval);
  } else if (input.cadence === "weekly") {
    next.setDate(next.getDate() + 7 * input.interval);
  } else if (input.cadence === "monthly") {
    next.setMonth(next.getMonth() + input.interval);
  }
  return next;
}

function validateRuleDraft(
  draft: RuleDraft,
  preferences: Preferences,
  rules: RecurringRule[],
  t: ReturnType<typeof useTranslator>
) {
  const errors: Record<string, string> = {};

  if (draft.name.trim().length < 4) {
    errors.name = t("validation.rule_name_min_length", { min: 4 });
  } else if (draft.name.trim() === "Default") {
    errors.name = t("validation.rule_name_reserved");
  } else if (
    rules.some((rule) => rule.name.toLowerCase() === draft.name.trim().toLowerCase())
  ) {
    errors.name = t("validation.rule_name_taken");
  }

  if (draft.confirmName.trim() !== draft.name.trim()) {
    errors.confirmName = t("validation.match_field");
  }

  if (!draft.cadence) {
    errors.cadence = "Required";
  }

  const interval = Number(draft.interval);
  if (!Number.isFinite(interval) || interval < 1) {
    errors.interval = t("validation.min_value", { min: 1 });
  } else if (interval > 30) {
    errors.interval = t("validation.max_value", { max: 30 });
  }

  if (draft.cadence === "weekly" && !draft.weekday) {
    errors.weekday = "Required";
  }

  if (draft.cadence === "monthly") {
    const monthDay = Number(draft.monthDay);
    if (!Number.isFinite(monthDay) || monthDay < 1) {
      errors.monthDay = t("validation.min_value", { min: 1 });
    } else if (monthDay > 28) {
      errors.monthDay = t("validation.month_day_max");
    }
  }

  if (!draft.startDate) {
    errors.startDate = "Required";
  }

  if (draft.hasEndDate) {
    if (!draft.endDate) {
      errors.endDate = "Required";
    } else if (draft.endDate < draft.startDate) {
      errors.endDate = t("validation.end_date_after_start");
    }
  }

  if (preferences.remindersEnabled) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.remindAt)) {
      errors.remindAt = t("validation.time_format");
    }
  }

  if (draft.enableSummary && !draft.summaryChannel) {
    errors.summaryChannel = "Required";
  }

  return errors;
}

function describeRule(rule: RecurringRule, locale: Locale) {
  const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const cadence =
    rule.cadence === "daily"
      ? "Daily"
      : rule.cadence === "weekly"
        ? `Weekly on ${messages[locale][`weekday.${rule.weekday}`]}`
        : `Monthly on ${rule.monthDay}`;
  return `${cadence} · ${formatter.format(new Date(rule.startDate))}`;
}

function formatSummary(locale: Locale, open: number, total: number) {
  if (locale === "ru") {
    if (open === 0) return "Все задачи закрыты";
    return `Осталось ${open} из ${total}`;
  }
  if (open === 0) return "Everything is done";
  return `${open} task${open === 1 ? "" : "s"} left out of ${total}`;
}

function formatRelativeDate(value: string | undefined, locale: Locale, fallback: string) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  const diff = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  return rtf.format(diff, "day");
}

function formatAbsoluteDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftDateTime(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function weekdayToIndex(weekday: Weekday) {
  return {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6
  }[weekday];
}
