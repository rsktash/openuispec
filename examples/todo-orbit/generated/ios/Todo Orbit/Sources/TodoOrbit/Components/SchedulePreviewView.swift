import SwiftUI

struct SchedulePreviewResult {
    enum State {
        case invalid
        case empty
        case ready
    }

    let state: State
    let dates: [Date]
}

struct SchedulePreviewView: View {
    let model: AppModel
    let title: String
    let result: SchedulePreviewResult

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("x_schedule_preview.detail")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            Text(title)
                .font(.title3.weight(.semibold))

            switch result.state {
            case .invalid:
                Text(model.string("recurring_preview.invalid"))
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(.red)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.red.opacity(0.08), in: CutCornerShape(cut: 12))
            case .empty:
                Text(model.string("recurring_preview.empty"))
                    .foregroundStyle(.secondary)
            case .ready:
                VStack(spacing: 10) {
                    ForEach(Array(result.dates.enumerated()), id: \.offset) { index, date in
                        HStack {
                            Text(index == 0 ? "Next" : "+\(index)")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(index == 0 ? .teal : .secondary)
                            Spacer()
                            Text(model.formatDate(date))
                                .font(.subheadline.weight(.semibold))
                        }
                        .padding(14)
                        .background(
                            CutCornerShape(cut: 12)
                                .fill(index == 0 ? Color.teal.opacity(0.08) : Color(uiColor: .secondarySystemBackground))
                        )
                    }
                }
            }
        }
        .orbitCard(fill: Color(uiColor: .systemBackground), stroke: Color.orange.opacity(0.22))
    }

    static func compute(from draft: RecurringRuleDraft) -> SchedulePreviewResult {
        guard let cadence = draft.cadence, let interval = Int(draft.interval), interval >= 1 else {
            return .init(state: .invalid, dates: [])
        }

        if draft.hasEndDate, draft.endDate < draft.startDate {
            return .init(state: .invalid, dates: [])
        }

        if cadence == .weekly, draft.weekday == nil {
            return .init(state: .invalid, dates: [])
        }

        if cadence == .monthly {
            guard let day = Int(draft.monthDay), (1...28).contains(day) else {
                return .init(state: .invalid, dates: [])
            }
        }

        let calendar = Calendar.current
        var dates: [Date] = []
        var cursor = draft.startDate
        let endDate = draft.hasEndDate ? draft.endDate : nil

        for _ in 0..<4 {
            let next: Date?
            switch cadence {
            case .daily:
                next = cursor
                cursor = calendar.date(byAdding: .day, value: interval, to: cursor) ?? cursor
            case .weekly:
                next = nextWeeklyDate(startingAt: cursor, weekday: draft.weekday!, interval: interval)
                cursor = calendar.date(byAdding: .day, value: interval * 7, to: next ?? cursor) ?? cursor
            case .monthly:
                next = nextMonthlyDate(startingAt: cursor, day: Int(draft.monthDay)!, interval: interval)
                cursor = calendar.date(byAdding: .month, value: interval, to: next ?? cursor) ?? cursor
            }

            guard let next else { break }
            if let endDate, next > endDate { break }
            dates.append(next)
        }

        return dates.isEmpty ? .init(state: .empty, dates: []) : .init(state: .ready, dates: dates)
    }

    private static func nextWeeklyDate(startingAt start: Date, weekday: Weekday, interval: Int) -> Date? {
        let calendar = Calendar.current
        var next = start
        while calendar.component(.weekday, from: next) != weekday.calendarIndex {
            guard let candidate = calendar.date(byAdding: .day, value: 1, to: next) else { return nil }
            next = candidate
        }
        return next
    }

    private static func nextMonthlyDate(startingAt start: Date, day: Int, interval: Int) -> Date? {
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month], from: start)
        components.day = day
        guard let initial = calendar.date(from: components) else { return nil }
        if initial >= start { return initial }
        return calendar.date(byAdding: .month, value: interval, to: initial)
    }
}
