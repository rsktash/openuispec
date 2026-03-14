import SwiftUI

struct CutCornerShape: Shape {
    var cut: CGFloat = 18

    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: cut, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - cut))
        path.addLine(to: CGPoint(x: rect.maxX - cut, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + cut))
        path.closeSubpath()
        return path
    }
}

struct OrbitCardModifier: ViewModifier {
    let fill: Color
    let stroke: Color
    let lineWidth: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(20)
            .background(
                CutCornerShape(cut: 16)
                    .fill(fill)
            )
            .overlay(
                CutCornerShape(cut: 16)
                    .stroke(stroke, lineWidth: lineWidth)
            )
    }
}

extension View {
    func orbitCard(
        fill: Color = Color(uiColor: .secondarySystemBackground),
        stroke: Color = Color.teal.opacity(0.24),
        lineWidth: CGFloat = 1
    ) -> some View {
        modifier(OrbitCardModifier(fill: fill, stroke: stroke, lineWidth: lineWidth))
    }
}

struct OrbitPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .background(
                CutCornerShape(cut: 14)
                    .fill(
                        LinearGradient(
                            colors: [Color.teal, Color(red: 0.07, green: 0.52, blue: 0.48)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct OrbitGhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.semibold))
            .foregroundStyle(Color.primary)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                CutCornerShape(cut: 14)
                    .fill(Color(uiColor: .secondarySystemBackground))
            )
            .overlay(
                CutCornerShape(cut: 14)
                    .stroke(Color.teal.opacity(configuration.isPressed ? 0.34 : 0.18), lineWidth: 1.5)
            )
            .scaleEffect(configuration.isPressed ? 0.99 : 1)
    }
}

struct PriorityDot: View {
    let priority: TaskPriority

    var body: some View {
        Circle()
            .fill(priority.tint)
            .frame(width: 12, height: 12)
    }
}

struct ToastOverlay: View {
    let toast: ToastMessage

    var tint: Color {
        switch toast.level {
        case .success: .green
        case .warning: .orange
        case .error: .red
        }
    }

    var body: some View {
        Text(toast.text)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .background(
                CutCornerShape(cut: 14)
                    .fill(tint)
            )
            .shadow(color: .black.opacity(0.18), radius: 22, y: 10)
            .padding(.bottom, 18)
    }
}
