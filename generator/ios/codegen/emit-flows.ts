/**
 * Emits SwiftUI Views for flow screens (CreateTask, EditTask).
 */

import { fileHeader } from "./swift-utils.js";
import type { ResolvedIcon } from "../ir/types.js";
import { lookupSfSymbol } from "../ir/resolve-icons.js";

export function emitCreateTaskFlow(icons: ResolvedIcon[]): string {
  let code = fileHeader("CreateTaskFlow.swift");

  code += `
@Observable
final class CreateTaskViewModel {
    var title = ""
    var description = ""
    var projectId = ""
    var priority = "medium"
    var dueDate = Date()
    var hasDueDate = false
    var tags = ""
    var assignToSelf = true
    var isSubmitting = false
    var showToast = false
    var toastMessage = ""
    var toastSeverity: FeedbackSeverity = .neutral
    var showError = false
    var errorMessage = ""

    private let service: TaskFlowService

    init(service: TaskFlowService = MockService.shared) {
        self.service = service
    }

    var isValid: Bool {
        title.count >= 3
    }

    func submit() async -> Bool {
        guard isValid else { return false }
        isSubmitting = true
        do {
            let task = Task(
                id: UUID().uuidString,
                title: title,
                description: description.isEmpty ? nil : description,
                status: "todo",
                priority: priority,
                dueDate: hasDueDate ? dueDate : nil,
                projectId: projectId.isEmpty ? nil : projectId,
                assignee: nil,
                tags: tags.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) },
                createdAt: Date(),
                updatedAt: Date()
            )
            _ = try await service.createTask(task)
            isSubmitting = false
            return true
        } catch {
            isSubmitting = false
            showError = true
            errorMessage = error.localizedDescription
            return false
        }
    }
}

struct CreateTaskFlow: View {
    @State private var viewModel = CreateTaskViewModel()
    @Environment(\\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Form fields
                    VStack(spacing: Spacing.md) {
                        // Title
                        InputFieldView(
                            inputType: .text,
                            label: L10n.createTaskFieldTitle,
                            placeholder: L10n.createTaskFieldTitlePlaceholder,
                            isRequired: true,
                            maxLength: 200,
                            textValue: $viewModel.title,
                            boolValue: .constant(false),
                            dateValue: .constant(Date()),
                            selectionValue: .constant("")
                        )

                        // Description
                        InputFieldView(
                            inputType: .multiline,
                            label: L10n.createTaskFieldDescription,
                            placeholder: L10n.createTaskFieldDescriptionPlaceholder,
                            textValue: $viewModel.description,
                            boolValue: .constant(false),
                            dateValue: .constant(Date()),
                            selectionValue: .constant("")
                        )

                        // Project
                        InputFieldView(
                            inputType: .select,
                            label: L10n.createTaskFieldProject,
                            placeholder: L10n.createTaskFieldProjectPlaceholder,
                            textValue: .constant(""),
                            boolValue: .constant(false),
                            dateValue: .constant(Date()),
                            selectionValue: $viewModel.projectId,
                            options: [
                                SelectOption(value: "p1", label: "Product Launch", icon: "rocket"),
                                SelectOption(value: "p2", label: "Marketing", icon: "briefcase"),
                                SelectOption(value: "p3", label: "Engineering", icon: "gear"),
                            ]
                        )

                        // Priority
                        InputFieldView(
                            inputType: .select,
                            label: L10n.createTaskFieldPriority,
                            textValue: .constant(""),
                            boolValue: .constant(false),
                            dateValue: .constant(Date()),
                            selectionValue: $viewModel.priority,
                            options: [
                                SelectOption(value: "low", label: L10n.priorityLow, icon: "flag"),
                                SelectOption(value: "medium", label: L10n.priorityMedium, icon: "flag.fill"),
                                SelectOption(value: "high", label: L10n.priorityHigh, icon: "flag.fill"),
                                SelectOption(value: "urgent", label: L10n.priorityUrgent, icon: "exclamationmark.triangle"),
                            ]
                        )

                        // Due date
                        Toggle("Set due date", isOn: $viewModel.hasDueDate)
                            .tint(Color.brandPrimary)
                        if viewModel.hasDueDate {
                            InputFieldView(
                                inputType: .date,
                                label: L10n.createTaskFieldDueDate,
                                textValue: .constant(""),
                                boolValue: .constant(false),
                                dateValue: $viewModel.dueDate,
                                selectionValue: .constant("")
                            )
                        }

                        // Tags
                        InputFieldView(
                            inputType: .text,
                            label: L10n.createTaskFieldTags,
                            placeholder: L10n.createTaskFieldTagsPlaceholder,
                            helperText: L10n.createTaskFieldTagsHelper,
                            textValue: $viewModel.tags,
                            boolValue: .constant(false),
                            dateValue: .constant(Date()),
                            selectionValue: .constant("")
                        )

                        // Assign to me
                        InputFieldView(
                            inputType: .toggle,
                            label: L10n.createTaskFieldAssignToMe,
                            textValue: .constant(""),
                            boolValue: $viewModel.assignToSelf,
                            dateValue: .constant(Date()),
                            selectionValue: .constant("")
                        )
                    }
                    .padding(.top, Spacing.lg)

                    if viewModel.showError {
                        Text(viewModel.errorMessage)
                            .font(.bodySm)
                            .foregroundStyle(Color.semanticDanger)
                            .padding(.top, Spacing.md)
                    }
                }
                .padding(.horizontal, Spacing.pageMarginH)
            }
            .navigationTitle(L10n.createTaskTitle)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L10n.commonCancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        SwiftUI.Task {
                            if await viewModel.submit() {
                                dismiss()
                            }
                        }
                    } label: {
                        if viewModel.isSubmitting {
                            ProgressView()
                        } else {
                            Text(L10n.createTaskSave)
                        }
                    }
                    .disabled(!viewModel.isValid || viewModel.isSubmitting)
                }
            }
        }
    }
}
`;
  return code;
}

export function emitEditTaskFlow(icons: ResolvedIcon[]): string {
  let code = fileHeader("EditTaskFlow.swift");

  code += `
@Observable
final class EditTaskViewModel {
    var title = ""
    var description = ""
    var priority = "medium"
    var dueDate = Date()
    var hasDueDate = false
    var isSubmitting = false
    var showError = false
    var errorMessage = ""

    private let service: TaskFlowService

    init(service: TaskFlowService = MockService.shared) {
        self.service = service
    }

    var isValid: Bool {
        title.count >= 3
    }

    func load(taskId: String) async {
        do {
            let task = try await service.fetchTask(id: taskId)
            title = task.title
            description = task.description ?? ""
            priority = task.priority
            if let date = task.dueDate {
                dueDate = date
                hasDueDate = true
            }
        } catch {}
    }

    func submit(taskId: String) async -> Bool {
        guard isValid else { return false }
        isSubmitting = true
        do {
            let task = Task(
                id: taskId,
                title: title,
                description: description.isEmpty ? nil : description,
                status: "todo",
                priority: priority,
                dueDate: hasDueDate ? dueDate : nil,
                projectId: nil,
                assignee: nil,
                tags: [],
                createdAt: Date(),
                updatedAt: Date()
            )
            _ = try await service.updateTask(id: taskId, task)
            isSubmitting = false
            return true
        } catch {
            isSubmitting = false
            showError = true
            errorMessage = error.localizedDescription
            return false
        }
    }
}

struct EditTaskFlow: View {
    let taskId: String
    @State private var viewModel = EditTaskViewModel()
    @Environment(\\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.md) {
                    InputFieldView(
                        inputType: .text,
                        label: L10n.editTaskFieldTitle,
                        isRequired: true,
                        maxLength: 200,
                        textValue: $viewModel.title,
                        boolValue: .constant(false),
                        dateValue: .constant(Date()),
                        selectionValue: .constant("")
                    )

                    InputFieldView(
                        inputType: .multiline,
                        label: L10n.editTaskFieldDescription,
                        textValue: $viewModel.description,
                        boolValue: .constant(false),
                        dateValue: .constant(Date()),
                        selectionValue: .constant("")
                    )

                    InputFieldView(
                        inputType: .select,
                        label: L10n.editTaskFieldPriority,
                        textValue: .constant(""),
                        boolValue: .constant(false),
                        dateValue: .constant(Date()),
                        selectionValue: $viewModel.priority,
                        options: [
                            SelectOption(value: "low", label: L10n.priorityLow, icon: "flag"),
                            SelectOption(value: "medium", label: L10n.priorityMedium, icon: "flag.fill"),
                            SelectOption(value: "high", label: L10n.priorityHigh, icon: "flag.fill"),
                            SelectOption(value: "urgent", label: L10n.priorityUrgent, icon: "exclamationmark.triangle"),
                        ]
                    )

                    Toggle("Set due date", isOn: $viewModel.hasDueDate)
                        .tint(Color.brandPrimary)
                    if viewModel.hasDueDate {
                        InputFieldView(
                            inputType: .date,
                            label: L10n.editTaskFieldDueDate,
                            textValue: .constant(""),
                            boolValue: .constant(false),
                            dateValue: $viewModel.dueDate,
                            selectionValue: .constant("")
                        )
                    }

                    if viewModel.showError {
                        Text(viewModel.errorMessage)
                            .font(.bodySm)
                            .foregroundStyle(Color.semanticDanger)
                    }
                }
                .padding(Spacing.pageMarginH)
                .padding(.top, Spacing.lg)
            }
            .navigationTitle(L10n.editTaskTitle)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L10n.commonCancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        SwiftUI.Task {
                            if await viewModel.submit(taskId: taskId) {
                                dismiss()
                            }
                        }
                    } label: {
                        if viewModel.isSubmitting {
                            ProgressView()
                        } else {
                            Text(L10n.editTaskSave)
                        }
                    }
                    .disabled(!viewModel.isValid || viewModel.isSubmitting)
                }
            }
        }
        .task { await viewModel.load(taskId: taskId) }
    }
}
`;
  return code;
}
