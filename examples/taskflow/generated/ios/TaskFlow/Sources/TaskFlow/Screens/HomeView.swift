import SwiftUI

struct HomeView: View {
    @Bindable var model: AppModel

    var body: some View {
        GeometryReader { geometry in
            let expanded = geometry.size.width >= 900
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header
                    searchField
                    filterRow
                    if expanded {
                        HStack(alignment: .top, spacing: 24) {
                            taskList(expanded: true)
                                .frame(maxWidth: .infinity)
                            detailPanel
                                .frame(maxWidth: 420)
                        }
                    } else {
                        taskList(expanded: false)
                    }
                }
                .padding(24)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle(model.localized("nav.tasks"))
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        model.presentedSheet = .createTask
                    } label: {
                        Label(model.localized("home.new_task"), systemImage: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(model.greeting())
                .font(.system(size: 30, weight: .bold, design: .rounded))
            Text(model.todayCountText())
                .font(.body)
                .foregroundStyle(AppPalette.textSecondary)
        }
    }

    private var searchField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(model.localized("home.search_label"))
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppPalette.textSecondary)
            TextField(model.localized("home.search_placeholder"), text: $model.searchQuery)
                .textFieldStyle(.roundedBorder)
        }
    }

    private var filterRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                filterChip(.all)
                filterChip(.today)
                filterChip(.upcoming)
                filterChip(.done)
                Picker("Sort", selection: $model.sortOrder) {
                    Text("Due").tag(SortOrder.dueDate)
                    Text("Priority").tag(SortOrder.priority)
                    Text("Created").tag(SortOrder.createdAt)
                }
                .pickerStyle(.menu)
            }
        }
    }

    private func filterChip(_ filter: HomeFilter) -> some View {
        let selected = model.homeFilter == filter
        let title: String
        switch filter {
        case .all: title = model.localized("home.filter.all")
        case .today: title = model.localized("home.filter.today")
        case .upcoming: title = model.localized("home.filter.upcoming")
        case .done: title = model.localized("home.filter.done")
        }
        return Button {
            model.homeFilter = filter
        } label: {
            Text("\(title) (\(model.count(for: filter)))")
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(selected ? AppPalette.brandPrimary : AppPalette.surfaceSecondary)
                .foregroundStyle(selected ? .white : .primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func taskList(expanded: Bool) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            if model.filteredTasks.isEmpty {
                ContentUnavailableView(
                    model.localized("home.empty_title"),
                    systemImage: "checkmark.circle.fill",
                    description: Text(model.localized("home.empty_body"))
                )
                .frame(maxWidth: .infinity)
                .padding(.top, 40)
            } else {
                ForEach(model.filteredTasks) { task in
                    if expanded {
                        taskRow(task)
                    } else {
                        NavigationLink {
                            TaskDetailView(model: model, taskID: task.id)
                        } label: {
                            taskCard(task)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func taskRow(_ task: Task) -> some View {
        Button {
            model.selectedTaskID = task.id
        } label: {
            taskCard(task)
                .overlay {
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(model.selectedTaskID == task.id ? AppPalette.brandPrimary : .clear, lineWidth: 2)
                }
        }
        .buttonStyle(.plain)
    }

    private func taskCard(_ task: Task) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: task.status == .done ? "checkmark.circle.fill" : "circle")
                .font(.title3)
                .foregroundStyle(task.status == .done ? AppPalette.success : AppPalette.textTertiary)

            VStack(alignment: .leading, spacing: 6) {
                Text(task.title)
                    .font(.headline)
                Text([model.project(for: task)?.name, relativeDate(task.dueDate)].compactMap { $0 }.joined(separator: " · "))
                    .font(.subheadline)
                    .foregroundStyle(AppPalette.textSecondary)
                if !task.tags.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(task.tags, id: \.self) { tag in
                            Text(tag)
                                .font(.caption.weight(.medium))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(AppPalette.surfaceSecondary)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
            Spacer()
            Circle()
                .fill(priorityColor(task.priority))
                .frame(width: 10, height: 10)
        }
        .padding(18)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .shadow(color: .black.opacity(0.05), radius: 12, y: 4)
    }

    private var detailPanel: some View {
        Group {
            if let selectedTask = model.selectedTask {
                TaskDetailPanel(model: model, taskID: selectedTask.id)
            } else {
                ContentUnavailableView("Select a task", systemImage: "sidebar.right", description: Text("Choose a task to inspect its details."))
            }
        }
    }

    private func relativeDate(_ date: Date?) -> String? {
        guard let date else { return nil }
        return date.formatted(.relative(presentation: .named))
    }

    private func priorityColor(_ priority: TaskPriority) -> Color {
        switch priority {
        case .low: Color(hex: "#9CA3AF")
        case .medium: AppPalette.info
        case .high: AppPalette.warning
        case .urgent: AppPalette.danger
        }
    }
}
