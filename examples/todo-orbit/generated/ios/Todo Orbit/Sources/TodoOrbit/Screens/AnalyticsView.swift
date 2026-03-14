import SwiftUI

struct AnalyticsView: View {
    @ObservedObject var model: AppModel
    @State private var period: AnalyticsPeriod = .week

    private let grid = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        let snapshot = model.analyticsSnapshot()
        let points = model.trendSeries(period: period)
        let overdue = model.overdueTasks()

        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("screens/analytics")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                    Text(model.string("analytics.title"))
                        .font(.largeTitle.weight(.bold))
                    Text(model.string("analytics.subtitle"))
                        .foregroundStyle(.secondary)
                }

                Picker("Period", selection: $period) {
                    ForEach(AnalyticsPeriod.allCases) { period in
                        Text(model.string("analytics.period_\(period.rawValue)")).tag(period)
                    }
                }
                .pickerStyle(.segmented)

                LazyVGrid(columns: grid, spacing: 12) {
                    statCard(model.string("analytics.completed_today"), value: "\(snapshot.completedToday)")
                    statCard(model.string("analytics.open_tasks"), value: "\(snapshot.openTasks)")
                    statCard(model.string("analytics.overdue_tasks"), value: "\(snapshot.overdueTasks)")
                    statCard(model.string("analytics.completion_rate"), value: "\(snapshot.completionRate)%")
                }

                TrendChartView(
                    title: model.string("analytics.title"),
                    emptyMessage: model.string("analytics.empty_trend"),
                    points: points
                )

                VStack(alignment: .leading, spacing: 14) {
                    Text(model.string("analytics.overdue_section"))
                        .font(.title3.weight(.semibold))
                    Text(model.string("analytics.overdue_subtitle"))
                        .foregroundStyle(.secondary)

                    if overdue.isEmpty {
                        Text(model.string("analytics.empty_overdue_body"))
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(overdue) { task in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(task.title)
                                        .font(.headline)
                                    Text(model.label(for: task.priority))
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(model.formatDate(task.dueDate))
                                    .font(.subheadline.weight(.semibold))
                            }
                            .padding(.vertical, 10)
                            Divider()
                        }
                    }
                }
                .orbitCard()
            }
            .padding()
        }
        .navigationTitle(model.string("nav.analytics"))
    }

    private func statCard(_ title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title.weight(.bold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .orbitCard()
    }
}
