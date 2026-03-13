/**
 * Emits one SwiftUI View per screen YAML, with @Observable ViewModels.
 */

import { fileHeader } from "./swift-utils.js";
import type { IR } from "../ir/types.js";
import type { ResolvedIcon } from "../ir/types.js";
import { lookupSfSymbol } from "../ir/resolve-icons.js";

export function emitHomeScreen(icons: ResolvedIcon[]): string {
  const sf = (name: string) => lookupSfSymbol(name, icons);
  let code = fileHeader("HomeScreen.swift");

  code += `
@Observable
final class HomeViewModel {
    var tasks: [Task] = []
    var projects: [Project] = []
    var taskCounts = TaskCounts(all: 0, today: 0, upcoming: 0, done: 0)
    var activeFilter: String = "today"
    var sortOrder: String = "due_date"
    var searchQuery: String = ""
    var isLoading: Bool = true
    var showToast: Bool = false
    var toastMessage: String = ""

    private let service: TaskFlowService

    init(service: TaskFlowService = MockService.shared) {
        self.service = service
    }

    func load() async {
        isLoading = true
        do {
            tasks = try await service.fetchTasks(filter: activeFilter, sort: sortOrder, search: searchQuery.isEmpty ? nil : searchQuery)
            projects = try await service.fetchProjects()
            taskCounts = try await service.fetchTaskCounts()
        } catch {}
        isLoading = false
    }

    func toggleTask(_ task: Task) async {
        do {
            _ = try await service.toggleTaskStatus(id: task.id)
            await load()
        } catch {}
    }
}

struct HomeScreen: View {
    @State private var viewModel = HomeViewModel()
    @State private var showCreateTask = false
    @Environment(\\.horizontalSizeClass) private var sizeClass
    @Environment(\\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    headerSection
                    searchSection
                    filterSection
                    taskListSection
                }
            }
            .navigationTitle("")
            #if os(iOS)
            .toolbar(.hidden, for: .navigationBar)
            #endif
            .overlay(alignment: .bottomTrailing) {
                if sizeClass == .compact {
                    fabButton
                }
            }
        }
        .sheet(isPresented: $showCreateTask) {
            CreateTaskFlow()
        }
        .toast(isPresented: $viewModel.showToast, message: viewModel.toastMessage, severity: .success)
        .task { await viewModel.load() }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(greetingText)
                .font(sizeClass == .compact ? .headingLg : .display)
                .foregroundStyle(Color.textPrimary)
            Text("\\(viewModel.taskCounts.today) tasks today")
                .font(.bodySm)
                .foregroundStyle(Color.textSecondary)
        }
        .padding(.horizontal, Spacing.pageMarginH)
        .padding(.top, Spacing.md)
    }

    private var greetingText: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let greeting: String
        if hour < 12 { greeting = L10n.homeGreetingMorning }
        else if hour < 17 { greeting = L10n.homeGreetingAfternoon }
        else { greeting = L10n.homeGreetingEvening }
        return greeting
    }

    // MARK: - Search

    private var searchSection: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "${sf("search")}")
                .foregroundStyle(Color.textTertiary)
            TextField(L10n.homeSearchPlaceholder, text: $viewModel.searchQuery)
                .textFieldStyle(.plain)
            if !viewModel.searchQuery.isEmpty {
                Button {
                    viewModel.searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Color.textTertiary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(Spacing.sm)
        .background(Color.surfaceSecondary)
        .clipShape(RoundedRectangle(cornerRadius: Spacing.sm))
        .padding(.horizontal, Spacing.pageMarginH)
        .padding(.top, Spacing.md)
        .frame(maxWidth: sizeClass == .compact ? .infinity : 480)
        .accessibilityLabel(L10n.homeSearchLabel)
    }

    // MARK: - Filters

    private var filterSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.sm) {
                filterChip(id: "all", label: L10n.homeFilterAll, count: viewModel.taskCounts.all)
                filterChip(id: "today", label: L10n.homeFilterToday, count: viewModel.taskCounts.today)
                filterChip(id: "upcoming", label: L10n.homeFilterUpcoming, count: viewModel.taskCounts.upcoming)
                filterChip(id: "done", label: L10n.homeFilterDone, count: viewModel.taskCounts.done)
            }
            .padding(.horizontal, Spacing.pageMarginH)
        }
        .padding(.top, Spacing.sm)
    }

    private func filterChip(id: String, label: String, count: Int) -> some View {
        Button {
            viewModel.activeFilter = id
            SwiftUI.Task { await viewModel.load() }
        } label: {
            Text("\\(label) (\\(count))")
                .font(.bodySm)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs)
                .background(viewModel.activeFilter == id ? Color.brandPrimary : Color.surfaceSecondary)
                .foregroundStyle(viewModel.activeFilter == id ? .white : Color.textPrimary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(viewModel.activeFilter == id ? .isSelected : [])
    }

    // MARK: - Task List

    private var taskListSection: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 200)
            } else if viewModel.tasks.isEmpty {
                emptyState
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(viewModel.tasks, id: \\.id) { task in
                        NavigationLink(value: task) {
                            taskRow(task)
                        }
                        .buttonStyle(.plain)
                        Divider()
                            .padding(.leading, Spacing.pageMarginH + 32)
                    }
                }
            }
        }
        .padding(.top, Spacing.md)
        .navigationDestination(for: Task.self) { task in
            TaskDetailScreen(taskId: task.id)
        }
    }

    private func taskRow(_ task: Task) -> some View {
        HStack(spacing: Spacing.sm) {
            Button {
                SwiftUI.Task { await viewModel.toggleTask(task) }
            } label: {
                Image(systemName: task.status == "done" ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(task.status == "done" ? Color.brandPrimary : Color.textTertiary)
                    .font(.title3)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Mark \\(task.title) complete")

            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .font(.body)
                    .foregroundStyle(Color.textPrimary)
                    .strikethrough(task.status == "done")
                Text(task.projectId ?? "")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
            }

            Spacer()

            Circle()
                .fill(priorityColor(task.priority))
                .frame(width: 8, height: 8)
        }
        .padding(.horizontal, Spacing.pageMarginH)
        .padding(.vertical, Spacing.sm)
        .accessibilityElement(children: .combine)
    }

    private var emptyState: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "${sf("checkmark_circle_fill")}")
                .font(.system(size: 48))
                .foregroundStyle(Color.textTertiary)
            Text(L10n.homeEmptyTitle)
                .font(.heading)
            Text(L10n.homeEmptyBody)
                .font(.bodySm)
                .foregroundStyle(Color.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }

    // MARK: - FAB

    private var fabButton: some View {
        ActionTriggerView(
            label: L10n.homeNewTask,
            icon: "${sf("plus")}",
            variant: .primary,
            size: .lg
        ) {
            showCreateTask = true
        }
        .clipShape(RoundedRectangle(cornerRadius: 28))
        .elevation(Elevation.lg)
        .padding(Spacing.md)
    }

    private func priorityColor(_ priority: String) -> Color {
        switch priority {
        case "low": return .priorityLow
        case "medium": return .priorityMedium
        case "high": return .priorityHigh
        case "urgent": return .priorityUrgent
        default: return .textTertiary
        }
    }
}
`;
  return code;
}

export function emitTaskDetailScreen(icons: ResolvedIcon[]): string {
  const sf = (name: string) => lookupSfSymbol(name, icons);
  let code = fileHeader("TaskDetailScreen.swift");

  code += `
@Observable
final class TaskDetailViewModel {
    var task: Task?
    var isLoading = true
    var showDeleteConfirm = false
    var showToast = false
    var toastMessage = ""
    var toastSeverity: FeedbackSeverity = .neutral
    var showAssigneePicker = false
    var showEditTask = false

    private let service: TaskFlowService

    init(service: TaskFlowService = MockService.shared) {
        self.service = service
    }

    func load(taskId: String) async {
        isLoading = true
        do {
            task = try await service.fetchTask(id: taskId)
        } catch {}
        isLoading = false
    }

    func toggleStatus() async {
        guard let task else { return }
        do {
            self.task = try await service.toggleTaskStatus(id: task.id)
            toastMessage = L10n.taskDetailTaskUpdated
            toastSeverity = .success
            showToast = true
        } catch {
            toastMessage = L10n.taskDetailUpdateError
            toastSeverity = .error
            showToast = true
        }
    }

    func deleteTask() async -> Bool {
        guard let task else { return false }
        do {
            try await service.deleteTask(id: task.id)
            return true
        } catch {
            return false
        }
    }
}

struct TaskDetailScreen: View {
    let taskId: String
    @State private var viewModel = TaskDetailViewModel()
    @Environment(\\.dismiss) private var dismiss
    @Environment(\\.horizontalSizeClass) private var sizeClass

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let task = viewModel.task {
                taskContent(task)
            }
        }
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .alert(L10n.taskDetailDeleteTitle, isPresented: $viewModel.showDeleteConfirm) {
            Button(L10n.commonCancel, role: .cancel) {}
            Button(L10n.commonDelete, role: .destructive) {
                SwiftUI.Task {
                    if await viewModel.deleteTask() {
                        dismiss()
                    }
                }
            }
        } message: {
            Text(L10n.taskDetailDeleteMessage)
        }
        .sheet(isPresented: $viewModel.showEditTask) {
            EditTaskFlow(taskId: taskId)
        }
        .sheet(isPresented: $viewModel.showAssigneePicker) {
            AssigneePickerSheet(taskId: taskId)
        }
        .toast(isPresented: $viewModel.showToast, message: viewModel.toastMessage, severity: viewModel.toastSeverity)
        .task { await viewModel.load(taskId: taskId) }
    }

    private func taskContent(_ task: Task) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Hero header
                VStack(alignment: .leading, spacing: Spacing.md) {
                    DataDisplayView(
                        variant: .hero,
                        title: task.title,
                        badgeText: statusLabel(task.status),
                        badgeSeverity: statusSeverity(task.status)
                    )

                    // Stat cards
                    let layout = sizeClass == .compact ? AnyLayout(VStackLayout(spacing: Spacing.sm)) : AnyLayout(HStackLayout(spacing: Spacing.sm))
                    layout {
                        DataDisplayView(
                            variant: .stat,
                            title: L10n.taskDetailStatus,
                            body_text: statusLabel(task.status),
                            icon: "${sf("circle_fill")}",
                            iconColor: statusColor(task.status),
                            iconSize: 10
                        )
                        DataDisplayView(
                            variant: .stat,
                            title: L10n.taskDetailPriority,
                            body_text: priorityLabel(task.priority),
                            icon: "${sf("flag_fill")}",
                            iconColor: priorityColor(task.priority),
                            iconSize: 14
                        )
                        DataDisplayView(
                            variant: .stat,
                            title: L10n.taskDetailDue,
                            body_text: task.dueDate?.formatted(date: .abbreviated, time: .omitted) ?? "—"
                        )
                    }
                }
                .padding(Spacing.pageMarginH)

                // Description
                if let desc = task.description, !desc.isEmpty {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text(L10n.taskDetailDescription)
                            .font(.caption)
                            .textCase(.uppercase)
                            .tracking(0.08 * 11)
                            .foregroundStyle(Color.textTertiary)
                        Text(desc)
                            .font(.body)
                            .foregroundStyle(Color.textPrimary)
                    }
                    .padding(.horizontal, Spacing.pageMarginH)
                    .padding(.top, Spacing.md)
                    .frame(maxWidth: sizeClass == .compact ? .infinity : 640, alignment: .leading)
                }

                // Details section
                detailsSection(task)

                // Actions
                actionsSection(task)
            }
        }
    }

    private func detailsSection(_ task: Task) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(L10n.taskDetailDetails)
                .font(.caption)
                .textCase(.uppercase)
                .tracking(0.08 * 11)
                .foregroundStyle(Color.textTertiary)
                .padding(.bottom, Spacing.sm)

            DataDisplayView(
                variant: .compact,
                title: L10n.taskDetailProject,
                icon: "${sf("folder")}",
                iconColor: .textSecondary,
                iconSize: 18,
                trailingText: task.projectId ?? "—",
                trailingIcon: "${sf("chevron_right")}",
                isInteractive: true
            )
            Divider()

            DataDisplayView(
                variant: .compact,
                title: L10n.taskDetailAssignee,
                icon: "${sf("person")}",
                iconColor: .textSecondary,
                iconSize: 18,
                trailingText: task.assignee?.name ?? L10n.taskDetailUnassigned,
                isInteractive: true
            ) {
                viewModel.showAssigneePicker = true
            }
            Divider()

            DataDisplayView(
                variant: .compact,
                title: L10n.taskDetailTags,
                icon: "${sf("tag")}",
                iconColor: .textSecondary,
                iconSize: 18,
                trailingText: task.tags.joined(separator: ", ")
            )
            Divider()

            DataDisplayView(
                variant: .compact,
                title: L10n.taskDetailCreated,
                icon: "${sf("clock")}",
                iconColor: .textSecondary,
                iconSize: 18,
                trailingText: task.createdAt.formatted(date: .abbreviated, time: .omitted)
            )
        }
        .padding(.horizontal, Spacing.pageMarginH)
        .padding(.top, Spacing.lg)
        .frame(maxWidth: sizeClass == .compact ? .infinity : 640, alignment: .leading)
    }

    private func actionsSection(_ task: Task) -> some View {
        let layout = sizeClass == .compact ? AnyLayout(VStackLayout(spacing: Spacing.sm)) : AnyLayout(HStackLayout(spacing: Spacing.sm))
        return layout {
            ActionTriggerView(
                label: L10n.taskDetailEdit,
                icon: "${sf("pencil")}",
                variant: .primary,
                fullWidth: sizeClass == .compact
            ) {
                viewModel.showEditTask = true
            }

            ActionTriggerView(
                label: task.status == "done" ? "Reopen task" : "Mark complete",
                icon: task.status == "done" ? "${sf("arrow_uturn_left")}" : "${sf("checkmark")}",
                variant: .secondary,
                fullWidth: sizeClass == .compact
            ) {
                SwiftUI.Task { await viewModel.toggleStatus() }
            }

            ActionTriggerView(
                label: L10n.taskDetailDelete,
                icon: "${sf("trash")}",
                variant: .destructive,
                fullWidth: sizeClass == .compact
            ) {
                viewModel.showDeleteConfirm = true
            }
        }
        .padding(Spacing.pageMarginH)
        .padding(.top, Spacing.xl)
    }

    // Helpers
    private func statusLabel(_ status: String) -> String {
        switch status {
        case "todo": return L10n.statusTodo
        case "in_progress": return L10n.statusInProgress
        case "done": return L10n.statusDone
        default: return status
        }
    }

    private func statusSeverity(_ status: String) -> String {
        switch status {
        case "todo": return "neutral"
        case "in_progress": return "info"
        case "done": return "success"
        default: return "neutral"
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "todo": return .statusTodo
        case "in_progress": return .statusInProgress
        case "done": return .statusDone
        default: return .textTertiary
        }
    }

    private func priorityLabel(_ priority: String) -> String {
        switch priority {
        case "low": return L10n.priorityLow
        case "medium": return L10n.priorityMedium
        case "high": return L10n.priorityHigh
        case "urgent": return L10n.priorityUrgent
        default: return priority
        }
    }

    private func priorityColor(_ priority: String) -> Color {
        switch priority {
        case "low": return .priorityLow
        case "medium": return .priorityMedium
        case "high": return .priorityHigh
        case "urgent": return .priorityUrgent
        default: return .textTertiary
        }
    }
}

struct AssigneePickerSheet: View {
    let taskId: String
    @Environment(\\.dismiss) private var dismiss

    var body: some View {
        SurfaceSheetView(title: L10n.taskDetailAssignTo, isPresented: .constant(true)) {
            Text("Assignee picker placeholder")
                .foregroundStyle(Color.textSecondary)
        }
    }
}
`;
  return code;
}

export function emitProjectsScreen(icons: ResolvedIcon[]): string {
  const sf = (name: string) => lookupSfSymbol(name, icons);
  let code = fileHeader("ProjectsScreen.swift");

  code += `
@Observable
final class ProjectsViewModel {
    var projects: [Project] = []
    var isLoading = true
    var showNewProject = false

    private let service: TaskFlowService

    init(service: TaskFlowService = MockService.shared) {
        self.service = service
    }

    func load() async {
        isLoading = true
        do {
            projects = try await service.fetchProjects()
        } catch {}
        isLoading = false
    }
}

struct ProjectsScreen: View {
    @State private var viewModel = ProjectsViewModel()
    @Environment(\\.horizontalSizeClass) private var sizeClass

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack {
                    Text(L10n.projectsTitle)
                        .font(.headingLg)
                    Spacer()
                    ActionTriggerView(
                        label: L10n.projectsNewProject,
                        icon: "plus.circle",
                        variant: .tertiary,
                        size: .sm
                    ) {
                        viewModel.showNewProject = true
                    }
                }
                .padding(.horizontal, Spacing.pageMarginH)
                .padding(.top, Spacing.md)

                // Grid
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else if viewModel.projects.isEmpty {
                    VStack(spacing: Spacing.md) {
                        Image(systemName: "folder.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(Color.textTertiary)
                        Text(L10n.projectsEmptyTitle)
                            .font(.heading)
                        Text(L10n.projectsEmptyBody)
                            .font(.bodySm)
                            .foregroundStyle(Color.textSecondary)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                } else {
                    let columns = Array(repeating: GridItem(.flexible(), spacing: Spacing.md), count: gridColumns)
                    LazyVGrid(columns: columns, spacing: Spacing.md) {
                        ForEach(viewModel.projects, id: \\.id) { project in
                            NavigationLink(value: project) {
                                projectCard(project)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, Spacing.pageMarginH)
                    .padding(.top, Spacing.md)
                }
            }
        }
        .navigationDestination(for: Project.self) { project in
            ProjectDetailScreen(projectId: project.id)
        }
        .sheet(isPresented: $viewModel.showNewProject) {
            NewProjectSheet()
        }
        .task { await viewModel.load() }
    }

    private var gridColumns: Int {
        switch sizeClass {
        case .compact: return 1
        default: return 2
        }
    }

    private func projectCard(_ project: Project) -> some View {
        DataDisplayView(
            variant: .card,
            title: project.name,
            subtitle: "\\(project.taskCount) tasks",
            icon: "${sf("folder")}",
            iconColor: Color(hex: project.color) ?? .brandPrimary,
            iconSize: 24,
            isInteractive: true
        )
    }
}

struct NewProjectSheet: View {
    @Environment(\\.dismiss) private var dismiss
    @State private var name = ""
    @State private var color = "#5B4FE8"
    @State private var icon = "folder"

    var body: some View {
        NavigationStack {
            Form {
                TextField(L10n.projectsFieldName, text: $name)
                Picker(L10n.projectsFieldColor, selection: $color) {
                    Text("Indigo").tag("#5B4FE8")
                    Text("Coral").tag("#E8634F")
                    Text("Green").tag("#2D9D5E")
                    Text("Amber").tag("#D4920E")
                    Text("Blue").tag("#3B82D4")
                    Text("Purple").tag("#9B59B6")
                }
                Picker(L10n.projectsFieldIcon, selection: $icon) {
                    Label("Folder", systemImage: "folder").tag("folder")
                    Label("Briefcase", systemImage: "briefcase").tag("briefcase")
                    Label("Rocket", systemImage: "rocket").tag("rocket")
                    Label("Star", systemImage: "star").tag("star")
                    Label("Heart", systemImage: "heart").tag("heart")
                    Label("Lightbulb", systemImage: "lightbulb").tag("lightbulb")
                }
            }
            .navigationTitle(L10n.projectsDialogTitle)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L10n.commonCancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(L10n.commonCreate) { dismiss() }
                        .disabled(name.isEmpty)
                }
            }
        }
    }
}
`;
  return code;
}

export function emitSettingsScreen(icons: ResolvedIcon[]): string {
  const sf = (name: string) => lookupSfSymbol(name, icons);
  let code = fileHeader("SettingsScreen.swift");

  code += `
@Observable
final class SettingsViewModel {
    var userName = "Alex Johnson"
    var userEmail = "alex@taskflow.app"
    var theme = "system"
    var defaultPriority = "medium"
    var notificationsEnabled = true
    var remindersEnabled = true
    var showDeleteConfirm = false

    private let service: TaskFlowService

    init(service: TaskFlowService = MockService.shared) {
        self.service = service
    }

    func load() async {
        do {
            let user = try await service.fetchCurrentUser()
            userName = user.name
            userEmail = user.email
        } catch {}
    }
}

struct SettingsScreen: View {
    @State private var viewModel = SettingsViewModel()
    @Environment(\\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Profile card
                NavigationLink(value: "profile_edit") {
                    DataDisplayView(
                        variant: .card,
                        title: viewModel.userName,
                        subtitle: viewModel.userEmail,
                        icon: "${sf("person")}",
                        trailingIcon: "${sf("chevron_right")}",
                        trailingIconColor: .textTertiary,
                        isInteractive: true
                    )
                }
                .buttonStyle(.plain)
                .padding(Spacing.pageMarginH)

                // Preferences section
                VStack(alignment: .leading, spacing: 0) {
                    Text(L10n.settingsPreferences)
                        .font(.caption)
                        .textCase(.uppercase)
                        .tracking(0.08 * 11)
                        .foregroundStyle(Color.textTertiary)
                        .padding(.bottom, Spacing.sm)

                    Picker(L10n.settingsTheme, selection: $viewModel.theme) {
                        Text(L10n.settingsThemeSystem).tag("system")
                        Text(L10n.settingsThemeLight).tag("light")
                        Text(L10n.settingsThemeDark).tag("dark")
                        Text(L10n.settingsThemeWarm).tag("warm")
                    }
                    Divider()

                    Picker(L10n.settingsDefaultPriority, selection: $viewModel.defaultPriority) {
                        Text(L10n.priorityLow).tag("low")
                        Text(L10n.priorityMedium).tag("medium")
                        Text(L10n.priorityHigh).tag("high")
                    }
                    Divider()

                    Toggle(L10n.settingsNotifications, isOn: $viewModel.notificationsEnabled)
                        .tint(Color.brandPrimary)
                    Divider()

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Toggle(L10n.settingsReminders, isOn: $viewModel.remindersEnabled)
                            .tint(Color.brandPrimary)
                        Text(L10n.settingsRemindersHelper)
                            .font(.caption)
                            .foregroundStyle(Color.textTertiary)
                    }
                }
                .padding(.horizontal, Spacing.pageMarginH)
                .padding(.top, Spacing.lg)

                // Data section
                VStack(alignment: .leading, spacing: 0) {
                    Text(L10n.settingsData)
                        .font(.caption)
                        .textCase(.uppercase)
                        .tracking(0.08 * 11)
                        .foregroundStyle(Color.textTertiary)
                        .padding(.bottom, Spacing.sm)

                    DataDisplayView(
                        variant: .compact,
                        title: L10n.settingsExport,
                        icon: "${sf("square_arrow_up")}",
                        iconColor: .textSecondary,
                        iconSize: 18,
                        trailingIcon: "${sf("chevron_right")}",
                        isInteractive: true
                    )
                    Divider()

                    ActionTriggerView(
                        label: L10n.settingsDeleteAccount,
                        icon: "${sf("trash")}",
                        variant: .ghost,
                        fullWidth: true
                    ) {
                        viewModel.showDeleteConfirm = true
                    }
                    .tint(Color.semanticDanger)
                }
                .padding(.horizontal, Spacing.pageMarginH)
                .padding(.top, Spacing.xl)

                // App info
                VStack(spacing: Spacing.xs) {
                    Text(L10n.settingsAppVersion)
                        .font(.caption)
                        .foregroundStyle(Color.textTertiary)
                    Text(L10n.settingsAppCredit)
                        .font(.caption)
                        .foregroundStyle(Color.textTertiary)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, Spacing.xl)
                .padding(.bottom, Spacing.lg)
            }
        }
        .navigationDestination(for: String.self) { dest in
            if dest == "profile_edit" {
                ProfileEditScreen()
            }
        }
        .alert(L10n.settingsDeleteTitle, isPresented: $viewModel.showDeleteConfirm) {
            Button(L10n.commonCancel, role: .cancel) {}
            Button(L10n.settingsDeleteConfirm, role: .destructive) {}
        } message: {
            Text(L10n.settingsDeleteMessage)
        }
        .task { await viewModel.load() }
    }
}
`;
  return code;
}

export function emitCalendarScreen(): string {
  let code = fileHeader("CalendarScreen.swift");

  code += `
struct CalendarScreen: View {
    var body: some View {
        VStack(spacing: Spacing.md) {
            DataDisplayView(
                variant: .hero,
                title: L10n.calendarTitle,
                subtitle: L10n.calendarComingSoon
            )
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(Spacing.pageMarginH)
    }
}
`;
  return code;
}

export function emitProjectDetailScreen(icons: ResolvedIcon[]): string {
  const sf = (name: string) => lookupSfSymbol(name, icons);
  let code = fileHeader("ProjectDetailScreen.swift");

  code += `
@Observable
final class ProjectDetailViewModel {
    var project: Project?
    var tasks: [Task] = []
    var isLoading = true

    private let service: TaskFlowService

    init(service: TaskFlowService = MockService.shared) {
        self.service = service
    }

    func load(projectId: String) async {
        isLoading = true
        do {
            project = try await service.fetchProject(id: projectId)
            tasks = try await service.fetchTasks(filter: nil, sort: nil, search: nil)
        } catch {}
        isLoading = false
    }
}

struct ProjectDetailScreen: View {
    let projectId: String
    @State private var viewModel = ProjectDetailViewModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if let project = viewModel.project {
                    DataDisplayView(
                        variant: .hero,
                        title: project.name,
                        subtitle: "\\(project.taskCount) tasks",
                        icon: "${sf("folder")}",
                        iconColor: Color(hex: project.color) ?? .brandPrimary
                    )
                    .padding(Spacing.pageMarginH)
                }

                if viewModel.tasks.isEmpty && !viewModel.isLoading {
                    VStack(spacing: Spacing.md) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(Color.textTertiary)
                        Text(L10n.projectDetailEmptyTitle)
                            .font(.heading)
                        Text(L10n.projectDetailEmptyBody)
                            .font(.bodySm)
                            .foregroundStyle(Color.textSecondary)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                } else {
                    LazyVStack(spacing: 0) {
                        ForEach(viewModel.tasks, id: \\.id) { task in
                            NavigationLink(value: task) {
                                DataDisplayView(
                                    variant: .compact,
                                    title: task.title,
                                    subtitle: task.dueDate?.formatted(date: .abbreviated, time: .omitted),
                                    badgeSeverity: prioritySeverity(task.priority),
                                    badgeDot: true,
                                    isInteractive: true
                                )
                            }
                            .buttonStyle(.plain)
                            Divider()
                        }
                    }
                    .padding(.top, Spacing.md)
                }
            }
        }
        .navigationDestination(for: Task.self) { task in
            TaskDetailScreen(taskId: task.id)
        }
        .task { await viewModel.load(projectId: projectId) }
    }

    private func prioritySeverity(_ priority: String) -> String {
        switch priority {
        case "low": return "neutral"
        case "medium": return "info"
        case "high": return "warning"
        case "urgent": return "error"
        default: return "neutral"
        }
    }
}
`;
  return code;
}

export function emitProfileEditScreen(icons: ResolvedIcon[]): string {
  let code = fileHeader("ProfileEditScreen.swift");

  code += `
@Observable
final class ProfileEditViewModel {
    var name = ""
    var email = ""
    var showToast = false

    private let service: TaskFlowService

    init(service: TaskFlowService = MockService.shared) {
        self.service = service
    }

    func load() async {
        do {
            let user = try await service.fetchCurrentUser()
            name = user.name
            email = user.email
        } catch {}
    }
}

struct ProfileEditScreen: View {
    @State private var viewModel = ProfileEditViewModel()
    @Environment(\\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Avatar
                VStack(spacing: Spacing.md) {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(Color.brandPrimary)
                    ActionTriggerView(
                        label: L10n.profileChangePhoto,
                        variant: .tertiary,
                        size: .sm
                    )
                }
                .frame(maxWidth: .infinity)
                .padding(.top, Spacing.md)

                // Form
                VStack(spacing: Spacing.md) {
                    InputFieldView(
                        inputType: .text,
                        label: L10n.profileFieldName,
                        isRequired: true,
                        textValue: $viewModel.name,
                        boolValue: .constant(false),
                        dateValue: .constant(Date()),
                        selectionValue: .constant("")
                    )
                    InputFieldView(
                        inputType: .email,
                        label: L10n.profileFieldEmail,
                        isRequired: true,
                        textValue: $viewModel.email,
                        boolValue: .constant(false),
                        dateValue: .constant(Date()),
                        selectionValue: .constant("")
                    )
                }
                .padding(.top, Spacing.lg)

                // Save
                ActionTriggerView(
                    label: L10n.profileSave,
                    variant: .primary,
                    fullWidth: true
                ) {
                    dismiss()
                }
                .padding(.top, Spacing.lg)
            }
            .padding(Spacing.pageMarginH)
        }
        .toast(isPresented: $viewModel.showToast, message: L10n.profileSuccess, severity: .success)
        .task { await viewModel.load() }
    }
}
`;
  return code;
}
