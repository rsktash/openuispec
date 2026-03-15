import Foundation
import Observation
import SwiftUI

@MainActor
@Observable
final class AppModel {
    var selectedSection: AppSection = .home
    var homeFilter: HomeFilter = .today
    var sortOrder: SortOrder = .dueDate
    var searchQuery = ""
    var selectedTaskID: UUID?
    var selectedProjectID: UUID?
    var presentedSheet: PresentedSheet?
    var preferences = Preferences(
        theme: .system,
        defaultPriority: .medium,
        notificationsEnabled: true,
        remindersEnabled: true
    )
    var currentUser: UserProfile
    var team: [UserProfile]
    var projects: [Project]
    var tasks: [Task]
    var toastMessage: String?

    private let calendar = Calendar.current

    init() {
        let me = UserProfile(
            id: UUID(),
            name: "Nora Malik",
            firstName: "Nora",
            email: "nora@taskflow.app",
            avatarSymbol: "person.crop.circle.fill"
        )
        currentUser = me

        let inbox = Project(id: UUID(), name: "Inbox Zero", colorHex: "#5B4FE8", icon: "tray.full")
        let launch = Project(id: UUID(), name: "Product Launch", colorHex: "#E8634F", icon: "rocket")
        let studio = Project(id: UUID(), name: "Studio Refresh", colorHex: "#2D9D5E", icon: "paintbrush.pointed")
        projects = [inbox, launch, studio]

        let leo = UserProfile(id: UUID(), name: "Leo Park", firstName: "Leo", email: "leo@taskflow.app", avatarSymbol: "person.crop.circle")
        let maya = UserProfile(id: UUID(), name: "Maya Chen", firstName: "Maya", email: "maya@taskflow.app", avatarSymbol: "person.crop.circle.badge.checkmark")
        team = [me, leo, maya]

        let now = Date()
        tasks = [
            Task(
                id: UUID(),
                title: "Finalize keynote outline",
                description: "Align story arc, confirm metrics slide, and leave time for live demo rehearsal.",
                status: .inProgress,
                priority: .urgent,
                dueDate: calendar.date(byAdding: .hour, value: 6, to: now),
                projectID: launch.id,
                assigneeID: me.id,
                tags: ["launch", "slides"],
                createdAt: calendar.date(byAdding: .day, value: -4, to: now) ?? now,
                updatedAt: now,
                attachment: TaskAttachment(mediaType: "video", title: "Preview reel", url: URL(string: "https://example.com/reel.mp4"))
            ),
            Task(
                id: UUID(),
                title: "Book photographer",
                description: "Shortlist candidates and secure availability for the launch event.",
                status: .todo,
                priority: .high,
                dueDate: calendar.date(byAdding: .day, value: 2, to: now),
                projectID: launch.id,
                assigneeID: leo.id,
                tags: ["launch", "vendor"],
                createdAt: calendar.date(byAdding: .day, value: -2, to: now) ?? now,
                updatedAt: now,
                attachment: nil
            ),
            Task(
                id: UUID(),
                title: "Refine onboarding checklist",
                description: "Add copy tweaks from user testing and reduce setup friction.",
                status: .done,
                priority: .medium,
                dueDate: calendar.date(byAdding: .day, value: -1, to: now),
                projectID: inbox.id,
                assigneeID: maya.id,
                tags: ["ux", "copy"],
                createdAt: calendar.date(byAdding: .day, value: -5, to: now) ?? now,
                updatedAt: calendar.date(byAdding: .day, value: -1, to: now) ?? now,
                attachment: nil
            ),
            Task(
                id: UUID(),
                title: "Source new desk lamps",
                description: "Collect options that fit the warm material palette for the studio.",
                status: .todo,
                priority: .low,
                dueDate: calendar.date(byAdding: .day, value: 5, to: now),
                projectID: studio.id,
                assigneeID: nil,
                tags: ["studio"],
                createdAt: calendar.date(byAdding: .day, value: -3, to: now) ?? now,
                updatedAt: now,
                attachment: nil
            )
        ]

        selectedTaskID = tasks.first?.id
        selectedProjectID = projects.first?.id
    }

    var selectedTask: Task? {
        tasks.first(where: { $0.id == selectedTaskID }) ?? filteredTasks.first
    }

    var selectedProject: Project? {
        projects.first(where: { $0.id == selectedProjectID }) ?? projects.first
    }

    var filteredTasks: [Task] {
        let filtered = tasks.filter { task in
            let queryMatches: Bool
            if searchQuery.isEmpty {
                queryMatches = true
            } else {
                let haystack = [
                    task.title,
                    task.description ?? "",
                    project(for: task)?.name ?? "",
                    task.tags.joined(separator: " ")
                ].joined(separator: " ").localizedCaseInsensitiveContains(searchQuery)
                queryMatches = haystack
            }

            let filterMatches: Bool
            switch homeFilter {
            case .all:
                filterMatches = true
            case .today:
                filterMatches = task.dueDate.map(calendar.isDateInToday) ?? false
            case .upcoming:
                filterMatches = task.status != .done && (task.dueDate.map { $0 > Date() } ?? false)
            case .done:
                filterMatches = task.status == .done
            }
            return queryMatches && filterMatches
        }

        switch sortOrder {
        case .dueDate:
            return filtered.sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
        case .priority:
            return filtered.sorted { $0.priority.rank > $1.priority.rank }
        case .createdAt:
            return filtered.sorted { $0.createdAt > $1.createdAt }
        }
    }

    func project(for task: Task) -> Project? {
        guard let projectID = task.projectID else { return nil }
        return projects.first(where: { $0.id == projectID })
    }

    func assignee(for task: Task) -> UserProfile? {
        guard let assigneeID = task.assigneeID else { return nil }
        return team.first(where: { $0.id == assigneeID })
    }

    func tasks(for project: Project) -> [Task] {
        tasks.filter { $0.projectID == project.id }
    }

    func count(for filter: HomeFilter) -> Int {
        switch filter {
        case .all:
            return tasks.count
        case .today:
            return tasks.filter { $0.dueDate.map(calendar.isDateInToday) ?? false }.count
        case .upcoming:
            return tasks.filter { $0.status != .done && ($0.dueDate.map { $0 > Date() } ?? false) }.count
        case .done:
            return tasks.filter { $0.status == .done }.count
        }
    }

    func greeting() -> String {
        let hour = calendar.component(.hour, from: Date())
        let key = hour < 12 ? "home.greeting.morning" : (hour < 18 ? "home.greeting.afternoon" : "home.greeting.evening")
        return String(format: localized(key), currentUser.firstName)
    }

    func todayCountText() -> String {
        let count = count(for: .today)
        if count == 0 { return localized("home.task_count.none") }
        if count == 1 { return String(format: localized("home.task_count.one"), count) }
        return String(format: localized("home.task_count.other"), count)
    }

    func statusLabel(_ status: TaskStatus) -> String {
        localized("status.\(status.rawValue)")
    }

    func priorityLabel(_ priority: TaskPriority) -> String {
        localized("priority.\(priority.rawValue)")
    }

    func localized(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }

    func toggle(task: Task) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        tasks[index].status = task.status == .done ? .todo : .done
        tasks[index].updatedAt = Date()
        toastMessage = localized("task_detail.task_updated")
    }

    func delete(task: Task) {
        tasks.removeAll { $0.id == task.id }
        if selectedTaskID == task.id {
            selectedTaskID = filteredTasks.first?.id
        }
        toastMessage = localized("task_detail.task_deleted")
    }

    func saveTask(_ draft: TaskDraft, editing taskID: UUID?) {
        let tags = draft.tagsText
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        let dueDate = draft.dueDateEnabled ? draft.dueDate : nil
        let assignee = draft.assignToSelf ? currentUser.id : nil

        if let taskID, let index = tasks.firstIndex(where: { $0.id == taskID }) {
            tasks[index].title = draft.title
            tasks[index].description = draft.description.isEmpty ? nil : draft.description
            tasks[index].projectID = draft.projectID
            tasks[index].priority = draft.priority
            tasks[index].dueDate = dueDate
            tasks[index].assigneeID = assignee
            tasks[index].tags = tags
            tasks[index].updatedAt = Date()
            selectedTaskID = taskID
            toastMessage = localized("edit_task.success")
        } else {
            let task = Task(
                id: UUID(),
                title: draft.title,
                description: draft.description.isEmpty ? nil : draft.description,
                status: .todo,
                priority: draft.priority,
                dueDate: dueDate,
                projectID: draft.projectID,
                assigneeID: assignee,
                tags: tags,
                createdAt: Date(),
                updatedAt: Date(),
                attachment: nil
            )
            tasks.insert(task, at: 0)
            selectedTaskID = task.id
            toastMessage = localized("create_task.success")
        }
    }

    func makeDraft(task: Task?) -> TaskDraft {
        guard let task else { return TaskDraft() }
        return TaskDraft(
            title: task.title,
            description: task.description ?? "",
            projectID: task.projectID,
            priority: task.priority,
            dueDateEnabled: task.dueDate != nil,
            dueDate: task.dueDate ?? Date(),
            tagsText: task.tags.joined(separator: ", "),
            assignToSelf: task.assigneeID == currentUser.id
        )
    }

    func createProject(_ draft: ProjectDraft) {
        let project = Project(
            id: UUID(),
            name: draft.name,
            colorHex: draft.colorHex,
            icon: "folder"
        )
        projects.append(project)
        selectedProjectID = project.id
        toastMessage = localized("projects.created")
    }

    func updateProfile(name: String, email: String) {
        currentUser.name = name
        currentUser.firstName = name.split(separator: " ").first.map(String.init) ?? name
        currentUser.email = email
        toastMessage = localized("profile.success")
    }

    func assignTask(taskID: UUID, userID: UUID) {
        guard let index = tasks.firstIndex(where: { $0.id == taskID }) else { return }
        tasks[index].assigneeID = userID
        tasks[index].updatedAt = Date()
        toastMessage = localized("task_detail.task_updated")
    }

    func exportData() {
        toastMessage = localized("settings.export_success")
    }
}

private extension TaskPriority {
    var rank: Int {
        switch self {
        case .low: 1
        case .medium: 2
        case .high: 3
        case .urgent: 4
        }
    }
}
