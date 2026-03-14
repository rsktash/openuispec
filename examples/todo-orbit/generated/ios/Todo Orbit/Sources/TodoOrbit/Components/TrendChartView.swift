import Charts
import SwiftUI

struct TrendChartView: View {
    let title: String
    let emptyMessage: String
    let points: [TrendPoint]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("x_task_trend_chart.detail")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            Text(title)
                .font(.title3.weight(.semibold))

            if points.isEmpty {
                Text(emptyMessage)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 40)
            } else {
                Chart(points) { point in
                    LineMark(
                        x: .value("Label", point.label),
                        y: .value("Created", point.created)
                    )
                    .foregroundStyle(.orange)
                    .interpolationMethod(.catmullRom)

                    LineMark(
                        x: .value("Label", point.label),
                        y: .value("Completed", point.completed)
                    )
                    .foregroundStyle(.teal)
                    .interpolationMethod(.catmullRom)

                    AreaMark(
                        x: .value("Label", point.label),
                        y: .value("Completed", point.completed)
                    )
                    .foregroundStyle(.teal.opacity(0.08))
                }
                .frame(height: 280)

                HStack(spacing: 18) {
                    legend(.teal, title: "Completed")
                    legend(.orange, title: "Created")
                }
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
        }
        .orbitCard(fill: Color(uiColor: .systemBackground), stroke: Color.teal.opacity(0.18))
    }

    private func legend(_ color: Color, title: String) -> some View {
        HStack(spacing: 8) {
            Circle()
                .fill(color)
                .frame(width: 10, height: 10)
            Text(title)
        }
    }
}
