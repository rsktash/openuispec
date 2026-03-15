import SwiftUI

enum TaskEditorMode {
    case create
    case edit(UUID)

    var titleKey: String {
        switch self {
        case .create: "create_task.title"
        case .edit: "edit_task.title"
        }
    }

    var saveKey: String {
        switch self {
        case .create: "create_task.save"
        case .edit: "edit_task.save"
        }
    }
}

struct TaskEditorSheet: View {
    @Bindable var model: AppModel
    let mode: TaskEditorMode
    @Environment(\.dismiss) private var dismiss
    @State private var draft = TaskDraft()

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(model.localized("create_task.field_title_placeholder"), text: $draft.title)
                    TextField(model.localized("create_task.field_description_placeholder"), text: $draft.description, axis: .vertical)
                        .lineLimit(4, reservesSpace: true)
                } header: {
                    Text(model.localized("create_task.field_title"))
                }

                Section {
                    Picker(model.localized("create_task.field_project"), selection: $draft.projectID) {
                        Text(model.localized("create_task.field_project_placeholder")).tag(UUID?.none)
                        ForEach(model.projects) { project in
                            Text(project.name).tag(UUID?.some(project.id))
                        }
                    }
                    Picker(model.localized("create_task.field_priority"), selection: $draft.priority) {
                        Text(model.localized("priority.low")).tag(TaskPriority.low)
                        Text(model.localized("priority.medium")).tag(TaskPriority.medium)
                        Text(model.localized("priority.high")).tag(TaskPriority.high)
                        Text(model.localized("priority.urgent")).tag(TaskPriority.urgent)
                    }
                }

                Section {
                    Toggle("Include due date", isOn: $draft.dueDateEnabled)
                    if draft.dueDateEnabled {
                        DatePicker(model.localized("create_task.field_due_date"), selection: $draft.dueDate, displayedComponents: [.date, .hourAndMinute])
                    }
                }

                Section {
                    TextField(model.localized("create_task.field_tags_placeholder"), text: $draft.tagsText)
                    Toggle(model.localized("create_task.field_assign_to_me"), isOn: $draft.assignToSelf)
                } footer: {
                    Text(model.localized("create_task.field_tags_helper"))
                }
            }
            .navigationTitle(model.localized(mode.titleKey))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(model.localized("common.cancel")) {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(model.localized(mode.saveKey)) {
                        save()
                    }
                    .disabled(draft.title.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
                    .fontWeight(.semibold)
                }
            }
            .onAppear {
                switch mode {
                case .create:
                    draft = TaskDraft(priority: model.preferences.defaultPriority)
                case let .edit(taskID):
                    let task = model.tasks.first(where: { $0.id == taskID })
                    draft = model.makeDraft(task: task)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func save() {
        let normalizedTitle = draft.title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard normalizedTitle.count >= 3 else { return }
        draft.title = normalizedTitle
        switch mode {
        case .create:
            model.saveTask(draft, editing: nil)
        case let .edit(taskID):
            model.saveTask(draft, editing: taskID)
        }
        dismiss()
    }
}

struct NewProjectSheet: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var draft = ProjectDraft()

    private let colors = ["#5B4FE8", "#E8634F", "#2D9D5E", "#D4920E", "#3B82D4"]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(model.localized("projects.field_name_placeholder"), text: $draft.name)
                } header: {
                    Text(model.localized("projects.field_name"))
                }

                Section(header: Text(model.localized("projects.field_color"))) {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 44))], spacing: 12) {
                        ForEach(colors, id: \.self) { hex in
                            Circle()
                                .fill(Color(hex: hex))
                                .frame(width: 36, height: 36)
                                .overlay {
                                    if draft.colorHex == hex {
                                        Circle().stroke(.white, lineWidth: 3)
                                    }
                                }
                                .onTapGesture {
                                    draft.colorHex = hex
                                }
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
            .navigationTitle(model.localized("projects.dialog_title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(model.localized("common.cancel")) {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(model.localized("common.create")) {
                        model.createProject(draft)
                        dismiss()
                    }
                    .disabled(draft.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

struct AssignTaskSheet: View {
    @Bindable var model: AppModel
    let taskID: UUID
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""

    private var filteredUsers: [UserProfile] {
        if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return model.team
        }
        return model.team.filter {
            $0.name.localizedCaseInsensitiveContains(query) ||
            $0.email.localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    TextField(model.localized("task_detail.search_people_placeholder"), text: $query)
                        .textInputAutocapitalization(.never)
                } header: {
                    Text(model.localized("task_detail.search_people"))
                }

                Section {
                    ForEach(filteredUsers) { user in
                        Button {
                            model.assignTask(taskID: taskID, userID: user.id)
                            dismiss()
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.name)
                                Text(user.email)
                                    .font(.caption)
                                    .foregroundStyle(AppPalette.textSecondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle(model.localized("task_detail.assign_to"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(model.localized("common.cancel")) {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
