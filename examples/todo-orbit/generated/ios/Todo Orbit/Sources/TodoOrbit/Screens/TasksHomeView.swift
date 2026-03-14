import SwiftUI

struct TasksHomeView: View {
    @ObservedObject var model: AppModel
    @State private var searchQuery = ""
    @State private var filter: TaskFilter = .all
    @State private var taskSheetMode: TaskSheetMode?
    @State private var showDeleteDialog = false
    @State private var showMetaSheet = false

    var body: some View {
        NavigationSplitView {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(model.string("home.title"))
                            .font(.largeTitle.weight(.bold))
                        Text(model.homeSummary())
                            .foregroundStyle(.secondary)
                    }
                    .listRowInsets(EdgeInsets(top: 12, leading: 0, bottom: 12, trailing: 0))

                    Picker("Filter", selection: $filter) {
                        ForEach(TaskFilter.allCases) { item in
                            Text("\(model.string("home.filter_\(item.rawValue)")) (\(model.taskCount(for: item)))")
                                .tag(item)
                        }
                    }
                    .pickerStyle(.segmented)
                    .listRowInsets(EdgeInsets(top: 6, leading: 0, bottom: 12, trailing: 0))
                }

                ForEach(model.filteredTasks(filter: filter, search: searchQuery)) { task in
                    Button {
                        model.selectedTaskID = task.id
                    } label: {
                        HStack(spacing: 12) {
                            Button {
                                model.toggleTaskStatus(task.id)
                            } label: {
                                Image(systemName: task.status == .done ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(task.status == .done ? Color.green : Color.secondary)
                            }
                            .buttonStyle(.plain)

                            VStack(alignment: .leading, spacing: 4) {
                                Text(task.title)
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                                Text(model.formatRelativeDueDate(task.dueDate))
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()
                            PriorityDot(priority: task.priority)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .searchable(text: $searchQuery, prompt: model.string("home.search_placeholder"))
            .navigationTitle(model.string("nav.tasks"))
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        taskSheetMode = .create
                    } label: {
                        Label(model.string("home.new_task"), systemImage: "plus")
                    }
                }
            }
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
