import SwiftUI

struct TasksHomeView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @ObservedObject var model: AppModel
    @State private var searchQuery = ""
    @State private var filter: TaskFilter = .all
    @State private var taskSheetMode: TaskSheetMode?
    @State private var showDeleteDialog = false
    @State private var showMetaSheet = false

    var body: some View {
        Group {
            if horizontalSizeClass == .compact {
                compactLayout
            } else {
                splitLayout
            }
        }
        .sheet(item: $taskSheetMode) { mode in
            switch mode {
            case .create:
                TaskEditorSheet(model: model, editingTaskID: nil)
            case .edit(let id):
                TaskEditorSheet(model: model, editingTaskID: id)
            }
        }
        .sheet(isPresented: $showMetaSheet) {
            if let taskID = model.selectedTaskID {
                TaskMetaSheet(model: model, taskID: taskID)
            }
        }
        .confirmationDialog(
            model.string("task_detail.delete_title"),
            isPresented: $showDeleteDialog,
            titleVisibility: .visible
        ) {
            Button(model.string("common.delete"), role: .destructive) {
                if let taskID = model.selectedTaskID {
                    model.deleteTask(taskID)
                }
            }
            Button(model.string("common.cancel"), role: .cancel) {}
        } message: {
            Text(model.string("task_detail.delete_message"))
        }
    }

    private var splitLayout: some View {
        NavigationSplitView {
            tasksCanvas(selectionMode: .split)
                .navigationTitle(model.string("nav.tasks"))
        } detail: {
            if let task = model.task(id: model.selectedTaskID) {
                TaskDetailPanel(
                    model: model,
                    task: task,
                    onEdit: { taskSheetMode = .edit(task.id) },
                    onMeta: { showMetaSheet = true },
                    onDelete: { showDeleteDialog = true }
                )
            } else {
                ContentUnavailableView(model.string("home.empty_title"), systemImage: "checkmark.circle")
            }
        }
    }

    private var compactLayout: some View {
        tasksCanvas(selectionMode: .compact)
            .navigationTitle(model.string("nav.tasks"))
    }

    private enum SelectionMode {
        case compact
        case split
    }

    private func tasksCanvas(selectionMode: SelectionMode) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                taskHeader
                searchField
                filterChips
                taskListContent(selectionMode: selectionMode)
            }
            .padding(.horizontal, horizontalSizeClass == .compact ? 16 : 20)
            .padding(.top, 12)
            .padding(.bottom, 104)
        }
        .background(Color(uiColor: .systemGroupedBackground).ignoresSafeArea())
        .overlay(alignment: .bottomTrailing) {
            createButton
                .padding(.trailing, horizontalSizeClass == .compact ? 18 : 24)
                .padding(.bottom, horizontalSizeClass == .compact ? 20 : 24)
        }
    }

    private var taskHeader: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(model.string("home.title"))
                .font(.largeTitle.weight(.bold))
            Text(model.homeSummary())
                .foregroundStyle(.secondary)
        }
    }

    private var searchField: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)

            TextField(model.string("home.search_placeholder"), text: $searchQuery)
                .textFieldStyle(.plain)

            if !searchQuery.isEmpty {
                Button {
                    searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
        }
        .orbitInputShell(
            fill: Color(uiColor: .systemBackground),
            stroke: Color.teal.opacity(0.3),
            lineWidth: 1.5
        )
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(TaskFilter.allCases) { item in
                    Button {
                        filter = item
                    } label: {
                        Text("\(model.string("home.filter_\(item.rawValue)")) (\(model.taskCount(for: item)))")
                    }
                    .buttonStyle(OrbitChipButtonStyle(selected: filter == item))
                }
            }
        }
    }

    @ViewBuilder
    private func taskListContent(selectionMode: SelectionMode) -> some View {
        let filtered = model.filteredTasks(filter: filter, search: searchQuery)

        if filtered.isEmpty {
            ContentUnavailableView(
                model.string("home.empty_title"),
                systemImage: "checkmark.circle"
            )
            .frame(maxWidth: .infinity, minHeight: 220)
        } else {
            LazyVStack(spacing: 12) {
                ForEach(filtered) { task in
                    taskRowCard(task, selectionMode: selectionMode)
                }
            }
        }
    }

    @ViewBuilder
    private func taskRowCard(_ task: Task, selectionMode: SelectionMode) -> some View {
        let selected = selectionMode == .split && model.selectedTaskID == task.id
        let card = taskRow(task, selected: selected)

        switch selectionMode {
        case .compact:
            NavigationLink {
                TaskDetailPanel(
                    model: model,
                    task: task,
                    onEdit: { taskSheetMode = .edit(task.id) },
                    onMeta: {
                        model.selectedTaskID = task.id
                        showMetaSheet = true
                    },
                    onDelete: {
                        model.selectedTaskID = task.id
                        showDeleteDialog = true
                    }
                )
            } label: {
                card
            }
            .buttonStyle(.plain)
        case .split:
            Button {
                model.selectedTaskID = task.id
            } label: {
                card
            }
            .buttonStyle(.plain)
        }
    }

    private func taskRow(_ task: Task, selected: Bool) -> some View {
        HStack(spacing: 12) {
            Button {
                model.toggleTaskStatus(task.id)
            } label: {
                Image(systemName: task.status == .done ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(task.status == .done ? Color.green : Color.secondary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.headline)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.leading)
                Text(model.formatRelativeDueDate(task.dueDate))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 12)
            PriorityDot(priority: task.priority)

            if horizontalSizeClass == .compact {
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .orbitSurface(
            cut: 14,
            fill: selected ? Color.teal.opacity(0.12) : Color(uiColor: .systemBackground),
            stroke: selected ? Color.teal.opacity(0.34) : Color(uiColor: .separator).opacity(0.28),
            lineWidth: selected ? 1.5 : 1,
            contentPadding: 16
        )
    }

    private var createButton: some View {
        Button {
            taskSheetMode = .create
        } label: {
            Label(model.string("home.new_task"), systemImage: "plus")
        }
        .buttonStyle(OrbitFloatingActionButtonStyle())
    }
}

private enum TaskSheetMode: Identifiable {
    case create
    case edit(UUID)

    var id: String {
        switch self {
        case .create: "create"
        case .edit(let id): "edit-\(id.uuidString)"
        }
    }
}

private struct TaskDetailPanel: View {
    @ObservedObject var model: AppModel
    let task: Task
    let onEdit: () -> Void
    let onMeta: () -> Void
    let onDelete: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(task.title)
                        .font(.largeTitle.weight(.bold))
                    Text(model.formatDate(task.dueDate))
                        .foregroundStyle(.secondary)
                    Label(model.label(for: task.status), systemImage: task.status == .done ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(task.status == .done ? .green : .blue)
                }
                .orbitCard(fill: Color(uiColor: .systemBackground), stroke: task.priority.tint.opacity(0.25))

                LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 12) {
                    stat(model.string("task_detail.status"), value: model.label(for: task.status))
                    stat(model.string("task_detail.priority"), value: model.label(for: task.priority))
                    stat(model.string("task_detail.created"), value: model.formatDate(task.createdAt))
                    stat(model.string("task_detail.updated"), value: model.formatDate(task.updatedAt))
                }

                if !task.notes.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(model.string("task_detail.notes"))
                            .font(.headline)
                        Text(task.notes)
                            .foregroundStyle(.secondary)
                    }
                    .orbitCard()
                }

                VStack(spacing: 12) {
                    Button(model.string("task_detail.edit"), action: onEdit)
                        .buttonStyle(OrbitPrimaryButtonStyle())
                    Button(model.string("task_detail.toggle_status")) {
                        model.toggleTaskStatus(task.id)
                    }
                    .buttonStyle(OrbitGhostButtonStyle())
                    Button(model.string("task_detail.more_info"), action: onMeta)
                        .buttonStyle(OrbitGhostButtonStyle())
                    Button(model.string("task_detail.delete"), role: .destructive, action: onDelete)
                        .buttonStyle(OrbitGhostButtonStyle())
                }
            }
            .padding()
        }
    }

    private func stat(_ title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title3.weight(.bold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .orbitCard()
    }
}

private struct TaskMetaSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: AppModel
    let taskID: UUID

    var body: some View {
        NavigationStack {
            if let task = model.task(id: taskID) {
                List {
                    row(model.string("task_detail.status"), model.label(for: task.status))
                    row(model.string("task_detail.priority"), model.label(for: task.priority))
                    row(model.string("task_detail.created"), model.formatDate(task.createdAt))
                    row(model.string("task_detail.updated"), model.formatDate(task.updatedAt))
                }
                .navigationTitle(model.string("task_detail.more_info"))
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(model.string("common.cancel")) { dismiss() }
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func row(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text(value)
                .foregroundStyle(.secondary)
        }
    }
}
