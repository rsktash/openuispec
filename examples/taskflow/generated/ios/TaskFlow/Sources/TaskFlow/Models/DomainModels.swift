import Foundation

enum AppSection: String, CaseIterable, Identifiable {
    case home
    case projects
    case calendar
    case settings

    var id: String { rawValue }
}

enum TaskStatus: String, CaseIterable, Codable {
    case todo
    case inProgress = "in_progress"
    case done
}

enum TaskPriority: String, CaseIterable, Codable {
    case low
    case medium
    case high
    case urgent
}

enum HomeFilter: String, CaseIterable, Codable {
    case all
    case today
    case upcoming
    case done
}

enum SortOrder: String, CaseIterable, Codable {
    case dueDate = "due_date"
    case priority = "priority"
    case createdAt = "created_at"
}

enum ThemePreference: String, CaseIterable, Codable {
    case system
    case light
    case dark
    case warm
}

struct Project: Identifiable, Hashable, Codable {
    let id: UUID
    var name: String
    var colorHex: String
    var icon: String
}

struct UserProfile: Identifiable, Hashable, Codable {
    let id: UUID
    var name: String
    var firstName: String
    var email: String
    var avatarSymbol: String?
}

struct TaskAttachment: Hashable, Codable {
    var mediaType: String
    var title: String
    var url: URL?
}

struct Task: Identifiable, Hashable, Codable {
    let id: UUID
    var title: String
    var description: String?
    var status: TaskStatus
    var priority: TaskPriority
    var dueDate: Date?
    var projectID: UUID?
    var assigneeID: UUID?
    var tags: [String]
    var createdAt: Date
    var updatedAt: Date
    var attachment: TaskAttachment?
}

struct Preferences: Codable {
    var theme: ThemePreference
    var defaultPriority: TaskPriority
    var notificationsEnabled: Bool
    var remindersEnabled: Bool
}

struct TaskDraft {
    var title = ""
    var description = ""
    var projectID: UUID?
    var priority: TaskPriority = .medium
    var dueDateEnabled = false
    var dueDate = Date()
    var tagsText = ""
    var assignToSelf = true
}

struct ProjectDraft {
    var name = ""
    var colorHex = "#5B4FE8"
}

enum PresentedSheet: Identifiable {
    case createTask
    case editTask(UUID)
    case newProject
    case assignTask(UUID)

    var id: String {
        switch self {
        case .createTask:
            return "createTask"
        case let .editTask(id):
            return "editTask-\(id.uuidString)"
        case .newProject:
            return "newProject"
        case let .assignTask(id):
            return "assignTask-\(id.uuidString)"
        }
    }
}
