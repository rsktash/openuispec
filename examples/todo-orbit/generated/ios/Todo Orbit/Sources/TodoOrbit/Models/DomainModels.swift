import Foundation
import SwiftUI

enum AppLocale: String, CaseIterable, Identifiable {
    case en
    case ru

    var id: String { rawValue }
}

enum ThemePreference: String, CaseIterable, Identifiable {
    case light
    case dark

    var id: String { rawValue }

    var colorScheme: ColorScheme {
        switch self {
        case .light: .light
        case .dark: .dark
        }
    }
}

enum TaskStatus: String, CaseIterable, Identifiable {
    case open
    case done

    var id: String { rawValue }
}

enum TaskPriority: String, CaseIterable, Identifiable {
    case low
    case medium
    case high

    var id: String { rawValue }

    var tint: Color {
        switch self {
        case .low: Color(red: 148 / 255, green: 163 / 255, blue: 184 / 255)
        case .medium: Color(red: 37 / 255, green: 99 / 255, blue: 235 / 255)
        case .high: Color(red: 217 / 255, green: 119 / 255, blue: 6 / 255)
        }
    }
}

enum TaskFilter: String, CaseIterable, Identifiable {
    case all
    case open
    case done

    var id: String { rawValue }
}

enum AnalyticsPeriod: String, CaseIterable, Identifiable {
    case week
    case month
    case quarter

    var id: String { rawValue }
}

enum RecurrenceCadence: String, CaseIterable, Identifiable {
    case daily
    case weekly
    case monthly

    var id: String { rawValue }
}

enum Weekday: String, CaseIterable, Identifiable {
    case mon
    case tue
    case wed
    case thu
    case fri
    case sat
    case sun

    var id: String { rawValue }

    var calendarIndex: Int {
        switch self {
        case .sun: 1
        case .mon: 2
        case .tue: 3
        case .wed: 4
        case .thu: 5
        case .fri: 6
        case .sat: 7
        }
    }
}

enum SummaryChannel: String, CaseIterable, Identifiable {
    case push
    case email

    var id: String { rawValue }
}

struct Preferences: Equatable {
    var locale: AppLocale
    var theme: ThemePreference
    var remindersEnabled: Bool
    var dailySummaryEnabled: Bool
}

struct Task: Identifiable, Equatable {
    let id: UUID
    var title: String
    var notes: String
    var status: TaskStatus
    var priority: TaskPriority
    var dueDate: Date?
    let createdAt: Date
    var updatedAt: Date
}

struct RecurringRule: Identifiable, Equatable {
    let id: UUID
    var name: String
    var cadence: RecurrenceCadence
    var interval: Int
    var weekday: Weekday?
    var monthDay: Int?
    var startDate: Date
    var endDate: Date?
    var remindAt: String?
    var summaryChannel: SummaryChannel?
}

struct TrendPoint: Identifiable, Equatable {
    let id = UUID()
    let label: String
    let completed: Int
    let created: Int
}

struct AnalyticsSnapshot: Equatable {
    let completedToday: Int
    let openTasks: Int
    let overdueTasks: Int
    let completionRate: Int
}

struct ToastMessage: Identifiable, Equatable {
    enum Level {
        case success
        case warning
        case error
    }

    let id = UUID()
    let level: Level
    let text: String
}

struct TaskEditorDraft {
    var title: String
    var notes: String
    var priority: TaskPriority
    var dueDate: Date?
}

struct RecurringRuleDraft {
    var name: String = ""
    var confirmName: String = ""
    var cadence: RecurrenceCadence?
    var interval: String = "1"
    var weekday: Weekday?
    var monthDay: String = ""
    var startDate: Date = .now
    var hasEndDate: Bool = false
    var endDate: Date = .now
    var remindAt: String = ""
    var enableSummary: Bool = false
    var summaryChannel: SummaryChannel?
}

extension Task {
    static func seed(referenceDate: Date = .now) -> [Task] {
        let calendar = Calendar.current
        return [
            Task(
                id: UUID(uuidString: "A6AC1D32-DF3E-4A87-9E11-6E9C2A52CF11")!,
                title: "Prepare bilingual launch notes",
                notes: "Document the web, iOS, and Android behavior differences before review.",
                status: .open,
                priority: .high,
                dueDate: calendar.date(byAdding: .day, value: 2, to: referenceDate),
                createdAt: calendar.date(byAdding: .day, value: -6, to: referenceDate)!,
                updatedAt: calendar.date(byAdding: .day, value: -1, to: referenceDate)!
            ),
            Task(
                id: UUID(uuidString: "A6AC1D32-DF3E-4A87-9E11-6E9C2A52CF12")!,
                title: "Review recurring-rule validation",
                notes: "Confirm async uniqueness checks and cross-field constraints.",
                status: .done,
                priority: .medium,
                dueDate: calendar.date(byAdding: .day, value: -1, to: referenceDate),
                createdAt: calendar.date(byAdding: .day, value: -5, to: referenceDate)!,
                updatedAt: referenceDate
            ),
            Task(
                id: UUID(uuidString: "A6AC1D32-DF3E-4A87-9E11-6E9C2A52CF13")!,
                title: "Polish analytics empty states",
                notes: "Ensure chart and overdue list degrade gracefully on zero-data snapshots.",
                status: .open,
                priority: .medium,
                dueDate: calendar.date(byAdding: .day, value: 5, to: referenceDate),
                createdAt: calendar.date(byAdding: .day, value: -4, to: referenceDate)!,
                updatedAt: calendar.date(byAdding: .day, value: -2, to: referenceDate)!
            ),
            Task(
                id: UUID(uuidString: "A6AC1D32-DF3E-4A87-9E11-6E9C2A52CF14")!,
                title: "Regenerate drift snapshots",
                notes: "Refresh ios, android, and web state after spec edits.",
                status: .open,
                priority: .low,
                dueDate: calendar.date(byAdding: .day, value: -3, to: referenceDate),
                createdAt: calendar.date(byAdding: .day, value: -3, to: referenceDate)!,
                updatedAt: calendar.date(byAdding: .day, value: -3, to: referenceDate)!
            ),
            Task(
                id: UUID(uuidString: "A6AC1D32-DF3E-4A87-9E11-6E9C2A52CF15")!,
                title: "Prototype schedule preview contract",
                notes: "Use derived occurrences to prove custom-contract generation.",
                status: .done,
                priority: .high,
                dueDate: calendar.date(byAdding: .day, value: 1, to: referenceDate),
                createdAt: calendar.date(byAdding: .day, value: -8, to: referenceDate)!,
                updatedAt: calendar.date(byAdding: .day, value: -1, to: referenceDate)!
            )
        ]
    }
}
