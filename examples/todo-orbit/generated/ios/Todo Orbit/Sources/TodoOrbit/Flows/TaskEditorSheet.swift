import SwiftUI

struct TaskEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: AppModel
    let editingTaskID: UUID?

    @State private var draft = TaskEditorDraft(title: "", notes: "", priority: .medium, dueDate: nil)
    @State private var validationError: String?

    var body: some View {
        NavigationStack {
            Form {
                if let validationError {
                    Section {
                        Text(validationError)
                            .font(.footnote.weight(.medium))
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    TextField(model.string(editingTaskID == nil ? "create_task.field_title" : "edit_task.field_title"), text: $draft.title)
                    TextField(model.string(editingTaskID == nil ? "create_task.field_notes" : "edit_task.field_notes"), text: $draft.notes, axis: .vertical)
                    Picker(model.string(editingTaskID == nil ? "create_task.field_priority" : "edit_task.field_priority"), selection: $draft.priority) {
                        ForEach(TaskPriority.allCases) { priority in
                            Text(model.label(for: priority)).tag(priority)
                        }
                    }
                    .pickerStyle(.segmented)
                    DatePicker(
                        model.string(editingTaskID == nil ? "create_task.field_due_date" : "edit_task.field_due_date"),
                        selection: Binding(
                            get: { draft.dueDate ?? .now },
                            set: { draft.dueDate = $0 }
                        ),
                        displayedComponents: .date
                    )
                }
            }
            .navigationTitle(model.string(editingTaskID == nil ? "create_task.title" : "edit_task.title"))
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(model.string("common.cancel")) { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(model.string(editingTaskID == nil ? "create_task.save" : "edit_task.save")) {
                        validationError = model.submitTask(draft, editing: editingTaskID)
                        if validationError == nil {
                            dismiss()
                        }
                    }
                }
            }
        }
        .onAppear {
            draft = model.makeTaskDraft(for: model.task(id: editingTaskID))
        }
        .presentationDetents([.medium, .large])
    }
}
