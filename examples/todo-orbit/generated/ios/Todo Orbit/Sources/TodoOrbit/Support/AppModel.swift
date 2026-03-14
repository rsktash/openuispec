import Foundation
import SwiftUI

@MainActor
final class AppModel: ObservableObject {
    @Published var preferences = Preferences(
        locale: .en,
        theme: .light,
        remindersEnabled: true,
        dailySummaryEnabled: false
    )
    @Published var tasks: [Task] = Task.seed()
    @Published var rules: [RecurringRule] = []
    @Published var selectedTaskID: UUID?
    @Published var toast: ToastMessage?

    init() {
        selectedTaskID = tasks.first?.id
    }

    var locale: Locale { Locale(identifier: preferences.locale.rawValue) }

    func string(_ key: String) -> String {
        let bundle = Bundle.main.path(
            forResource: preferences.locale.rawValue,
            ofType: "lproj"
        ).flatMap { Bundle(path: $0) } ?? .main
        return bundle.localizedString(forKey: key, value: key, table: nil)
    }

    func format(_ key: String, _ arguments: CVarArg...) -> String {
        let format = string(key)
        return String(format: format, locale: locale, arguments: arguments)
    }

    func homeSummary() -> String {
        let open = tasks.filter { $0.status == .open }.count
        let total = tasks.count
        if preferences.locale == .ru {
            if open == 0 { return string("home.summary.done") }
            return format("home.summary.remaining", open, total)
        }

        if open == 0 { return string("home.summary.done") }
        return format("home.summary.remaining", open, total)
    }

    func taskCount(for filter: TaskFilter) -> Int {
        switch filter {
        case .all:
            return tasks.count
        case .open:
            return tasks.filter { $0.status == .open }.count
        case .done:
            return tasks.filter { $0.status == .done }.count
        }
    }

    func filteredTasks(filter: TaskFilter, search: String) -> [Task] {
        tasks.filter { task in
            let matchesFilter: Bool
            switch filter {
            case .all: matchesFilter = true
            case .open: matchesFilter = task.status == .open
            case .done: matchesFilter = task.status == .done
            }

            let query = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            let matchesSearch = query.isEmpty || "\(task.title) \(task.notes)".lowercased().contains(query)
            return matchesFilter && matchesSearch
        }
    }

    func task(id: UUID?) -> Task? {
        guard let id else { return nil }
        return tasks.first(where: { $0.id == id })
    }

    func binding(for taskID: UUID) -> Binding<Task>? {
        guard let index = tasks.firstIndex(where: { $0.id == taskID }) else { return nil }
        return Binding(
            get: { self.tasks[index] },
            set: { self.tasks[index] = $0 }
        )
    }

    func savePreferences(_ draft: Preferences) {
        preferences = draft
        showToast(level: .success, text: string("settings.saved"))
    }

    func makeTaskDraft(for task: Task?) -> TaskEditorDraft {
        TaskEditorDraft(
            title: task?.title ?? "",
            notes: task?.notes ?? "",
            priority: task?.priority ?? .medium,
            dueDate: task?.dueDate
        )
    }

    func submitTask(_ draft: TaskEditorDraft, editing taskID: UUID?) -> String? {
        let title = draft.title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard title.count >= 2 else {
            return format("validation.min_length", 2)
        }

        if let taskID, let index = tasks.firstIndex(where: { $0.id == taskID }) {
            tasks[index].title = title
            tasks[index].notes = draft.notes.trimmingCharacters(in: .whitespacesAndNewlines)
            tasks[index].priority = draft.priority
            tasks[index].dueDate = draft.dueDate
            tasks[index].updatedAt = .now
            showToast(level: .success, text: string("edit_task.success"))
        } else {
            let next = Task(
                id: UUID(),
                title: title,
                notes: draft.notes.trimmingCharacters(in: .whitespacesAndNewlines),
                status: .open,
                priority: draft.priority,
                dueDate: draft.dueDate,
                createdAt: .now,
                updatedAt: .now
            )
            tasks.insert(next, at: 0)
            selectedTaskID = next.id
            showToast(level: .success, text: string("create_task.success"))
        }

        return nil
    }

    func toggleTaskStatus(_ taskID: UUID) {
        guard let index = tasks.firstIndex(where: { $0.id == taskID }) else { return }
        tasks[index].status = tasks[index].status == .done ? .open : .done
        tasks[index].updatedAt = .now
        showToast(level: .success, text: string("task_detail.updated_feedback"))
    }

    func deleteTask(_ taskID: UUID) {
        tasks.removeAll { $0.id == taskID }
        if selectedTaskID == taskID {
            selectedTaskID = tasks.first?.id
        }
        showToast(level: .success, text: string("task_detail.deleted_feedback"))
    }

    func addRecurringRule(from draft: RecurringRuleDraft) -> [String: String] {
        var errors: [String: String] = [:]

        let trimmedName = draft.name.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedName.count < 4 {
            errors["name"] = format("validation.rule_name_min_length", 4)
        } else if trimmedName == "Default" {
            errors["name"] = string("validation.rule_name_reserved")
        } else if rules.contains(where: { $0.name.caseInsensitiveCompare(trimmedName) == .orderedSame }) {
            errors["name"] = string("validation.rule_name_taken")
        }

        if draft.confirmName.trimmingCharacters(in: .whitespacesAndNewlines) != trimmedName {
            errors["confirmName"] = string("validation.match_field")
        }

        guard let cadence = draft.cadence else {
            errors["cadence"] = string("validation.required")
            return errors
        }

        guard let interval = Int(draft.interval), interval >= 1 else {
            errors["interval"] = format("validation.min_value", 1)
            return errors
        }

        if interval > 30 {
            errors["interval"] = format("validation.max_value", 30)
        }

        if cadence == .weekly, draft.weekday == nil {
            errors["weekday"] = string("validation.required")
        }

        var monthDayValue: Int?
        if cadence == .monthly {
            guard let day = Int(draft.monthDay), day >= 1 else {
                errors["monthDay"] = format("validation.min_value", 1)
                return errors
            }
            if day > 28 {
                errors["monthDay"] = string("validation.month_day_max")
            } else {
                monthDayValue = day
            }
        }

        if draft.hasEndDate && draft.endDate < draft.startDate {
            errors["endDate"] = string("validation.end_date_after_start")
        }

        if preferences.remindersEnabled {
            let regex = try? NSRegularExpression(pattern: "^([01]\\d|2[0-3]):[0-5]\\d$")
            let range = NSRange(location: 0, length: draft.remindAt.utf16.count)
            let matches = regex?.firstMatch(in: draft.remindAt, options: [], range: range) != nil
            if !matches {
                errors["remindAt"] = string("validation.time_format")
            }
        }

        if draft.enableSummary && draft.summaryChannel == nil {
            errors["summaryChannel"] = string("validation.required")
        }

        guard errors.isEmpty else { return errors }

        let rule = RecurringRule(
            id: UUID(),
            name: trimmedName,
            cadence: cadence,
            interval: interval,
            weekday: draft.weekday,
            monthDay: monthDayValue,
            startDate: draft.startDate,
            endDate: draft.hasEndDate ? draft.endDate : nil,
            remindAt: preferences.remindersEnabled ? draft.remindAt : nil,
            summaryChannel: draft.enableSummary ? draft.summaryChannel : nil
        )
        rules.insert(rule, at: 0)
        showToast(level: .success, text: string("recurring_rule.success"))
        return [:]
    }

    func analyticsSnapshot() -> AnalyticsSnapshot {
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: .now)
        let completedToday = tasks.filter {
            $0.status == .done && $0.updatedAt >= startOfToday
        }.count
        let openTasks = tasks.filter { $0.status == .open }.count
        let overdueTasks = overdueTasks().count
        let completionRate = tasks.isEmpty ? 0 : Int(((Double(tasks.count - openTasks) / Double(tasks.count)) * 100).rounded())
        return AnalyticsSnapshot(
            completedToday: completedToday,
            openTasks: openTasks,
            overdueTasks: overdueTasks,
            completionRate: completionRate
        )
    }

    func trendSeries(period: AnalyticsPeriod) -> [TrendPoint] {
        let calendar = Calendar.current
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.dateFormat = period == .week ? "E" : "MMM d"
        let length: Int = switch period {
        case .week: 7
        case .month: 6
        case .quarter: 8
        }
        let strideDays: Int = period == .week ? 1 : 5

        return (0..<length).map { index in
            let offset = length - index - 1
            let pointDate = calendar.date(byAdding: .day, value: -(offset * strideDays), to: .now) ?? .now
            let completed = tasks.filter { $0.status == .done && $0.updatedAt <= pointDate }.count
            let created = tasks.filter { $0.createdAt <= pointDate }.count
            return TrendPoint(label: formatter.string(from: pointDate), completed: completed, created: created)
        }
    }

    func overdueTasks() -> [Task] {
        let startOfToday = Calendar.current.startOfDay(for: .now)
        return tasks.filter { task in
            task.status == .open && (task.dueDate.map { $0 < startOfToday } ?? false)
        }
    }

    func formatDate(_ date: Date?) -> String {
        guard let date else { return string("task_detail.no_due_date") }
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    func formatRelativeDueDate(_ date: Date?) -> String {
        guard let date else { return string("task_detail.no_due_date") }
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = locale
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: .now)
    }

    func label(for priority: TaskPriority) -> String { string("priority.\(priority.rawValue)") }
    func label(for status: TaskStatus) -> String { string("status.\(status.rawValue)") }
    func label(for weekday: Weekday) -> String { string("weekday.\(weekday.rawValue)") }

    func describe(rule: RecurringRule) -> String {
        switch rule.cadence {
        case .daily:
            return "\(string("recurring_rule.cadence_daily")) · \(formatDate(rule.startDate))"
        case .weekly:
            return "\(string("recurring_rule.cadence_weekly")) · \(label(for: rule.weekday ?? .mon))"
        case .monthly:
            return "\(string("recurring_rule.cadence_monthly")) · \(rule.monthDay ?? 1)"
        }
    }

    func showToast(level: ToastMessage.Level, text: String) {
        withAnimation(.spring(duration: 0.32)) {
            toast = ToastMessage(level: level, text: text)
        }

        _Concurrency.Task { [weak self] in
            try? await _Concurrency.Task.sleep(for: .seconds(2.5))
            guard let self else { return }
            await MainActor.run {
                withAnimation(.easeOut(duration: 0.2)) {
                    self.toast = nil
                }
            }
        }
    }

}
