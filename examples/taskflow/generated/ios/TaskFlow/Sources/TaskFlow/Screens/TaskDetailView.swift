import AVKit
import SwiftUI

struct TaskDetailView: View {
    @Bindable var model: AppModel
    let taskID: UUID
    @State private var showDeletePrompt = false

    private var task: Task? {
        model.tasks.first(where: { $0.id == taskID })
    }

    var body: some View {
        Group {
            if let task {
                ScrollView {
                    TaskDetailContent(model: model, task: task) {
                        showDeletePrompt = true
                    }
                    .padding(24)
                }
                .navigationTitle(task.title)
                .navigationBarTitleDisplayMode(.inline)
                .alert(model.localized("task_detail.delete_title"), isPresented: $showDeletePrompt) {
                    Button(model.localized("common.cancel"), role: .cancel) {}
                    Button(model.localized("common.delete"), role: .destructive) {
                        model.delete(task: task)
                    }
                } message: {
                    Text(String(format: model.localized("task_detail.delete_message"), task.title))
                }
            } else {
                ContentUnavailableView("Task missing", systemImage: "exclamationmark.triangle")
            }
        }
    }
}

struct TaskDetailPanel: View {
    @Bindable var model: AppModel
    let taskID: UUID
    @State private var showDeletePrompt = false

    private var task: Task? {
        model.tasks.first(where: { $0.id == taskID })
    }

    var body: some View {
        Group {
            if let task {
                TaskDetailContent(model: model, task: task) {
                    showDeletePrompt = true
                }
                .padding(24)
                .background(.background)
                .clipShape(RoundedRectangle(cornerRadius: 28))
                .alert(model.localized("task_detail.delete_title"), isPresented: $showDeletePrompt) {
                    Button(model.localized("common.cancel"), role: .cancel) {}
                    Button(model.localized("common.delete"), role: .destructive) {
                        model.delete(task: task)
                    }
                } message: {
                    Text(String(format: model.localized("task_detail.delete_message"), task.title))
                }
            }
        }
    }
}

private struct TaskDetailContent: View {
    @Bindable var model: AppModel
    let task: Task
    let requestDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 12) {
                Text(task.title)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                HStack(spacing: 12) {
                    badge(model.statusLabel(task.status), color: statusColor(task.status))
                    badge(model.priorityLabel(task.priority), color: priorityColor(task.priority))
                }
            }

            HStack(spacing: 12) {
                statCard(model.localized("task_detail.status"), value: model.statusLabel(task.status), color: statusColor(task.status))
                statCard(model.localized("task_detail.priority"), value: model.priorityLabel(task.priority), color: priorityColor(task.priority))
                statCard(model.localized("task_detail.due"), value: task.dueDate?.formatted(date: .abbreviated, time: .omitted) ?? "No due date", color: AppPalette.info)
            }

            if let description = task.description, !description.isEmpty {
                detailBlock(title: model.localized("task_detail.description")) {
                    Text(description)
                        .foregroundStyle(AppPalette.textSecondary)
                }
            }

            if let attachment = task.attachment {
                detailBlock(title: "Media") {
                    VStack(alignment: .leading, spacing: 10) {
                        Label(attachment.title, systemImage: attachment.mediaType == "video" ? "play.rectangle.fill" : "waveform")
                            .font(.headline)
                        if attachment.mediaType == "video", let mediaURL = attachment.url {
                            VideoPlayer(player: AVPlayer(url: mediaURL))
                                .frame(minHeight: 220)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        } else {
                            Text(model.localized("media_player.error"))
                                .font(.subheadline)
                                .foregroundStyle(AppPalette.textSecondary)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppPalette.surfaceSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                }
            }

            detailBlock(title: model.localized("task_detail.details")) {
                VStack(spacing: 12) {
                    detailRow(model.localized("task_detail.project"), value: model.project(for: task)?.name ?? "No project", symbol: "folder")
                    detailRow(model.localized("task_detail.assignee"), value: model.assignee(for: task)?.name ?? model.localized("task_detail.unassigned"), symbol: "person")
                    detailRow(model.localized("task_detail.tags"), value: task.tags.isEmpty ? "No tags" : task.tags.joined(separator: ", "), symbol: "tag")
                    detailRow(model.localized("task_detail.created"), value: task.createdAt.formatted(date: .abbreviated, time: .shortened), symbol: "clock")
                }
            }

            HStack(spacing: 12) {
                Button(model.localized("task_detail.edit")) {
                    model.presentedSheet = .editTask(task.id)
                }
                .buttonStyle(.borderedProminent)

                Button(model.localized("task_detail.assign_to")) {
                    model.presentedSheet = .assignTask(task.id)
                }
                .buttonStyle(.bordered)

                Button(task.status == .done ? model.localized("task_detail.reopen") : model.localized("task_detail.complete")) {
                    model.toggle(task: task)
                }
                .buttonStyle(.bordered)

                Button(model.localized("task_detail.delete"), role: .destructive) {
                    requestDelete()
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private func badge(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.subheadline.weight(.semibold))
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(color.opacity(0.14))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }

    private func statCard(_ title: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppPalette.textSecondary)
            Text(value)
                .font(.headline)
            Circle()
                .fill(color)
                .frame(width: 10, height: 10)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(AppPalette.surfaceSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }

    private func detailBlock<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.caption.weight(.bold))
                .foregroundStyle(AppPalette.textTertiary)
            content()
        }
    }

    private func detailRow(_ title: String, value: String, symbol: String) -> some View {
        HStack {
            Label(title, systemImage: symbol)
                .foregroundStyle(AppPalette.textSecondary)
            Spacer()
            Text(value)
                .multilineTextAlignment(.trailing)
        }
        .padding()
        .background(AppPalette.surfaceSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private func priorityColor(_ priority: TaskPriority) -> Color {
        switch priority {
        case .low: Color(hex: "#9CA3AF")
        case .medium: AppPalette.info
        case .high: AppPalette.warning
        case .urgent: AppPalette.danger
        }
    }

    private func statusColor(_ status: TaskStatus) -> Color {
        switch status {
        case .todo: Color(hex: "#9CA3AF")
        case .inProgress: AppPalette.brandPrimary
        case .done: AppPalette.success
        }
    }
}
