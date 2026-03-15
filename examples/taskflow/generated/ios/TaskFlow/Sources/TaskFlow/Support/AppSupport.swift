import SwiftUI

extension Color {
    init(hex: String) {
        let value = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: value).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch value.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 91, 79, 232)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

enum AppPalette {
    static let brandPrimary = Color(hex: "#5B4FE8")
    static let brandSecondary = Color(hex: "#E8634F")
    static let surfaceSecondary = Color(hex: "#F7F6F3")
    static let surfaceTertiary = Color(hex: "#EFEEE8")
    static let textSecondary = Color(hex: "#6B6966")
    static let textTertiary = Color(hex: "#9C9A94")
    static let border = Color(hex: "#E5E3DE")
    static let success = Color(hex: "#2D9D5E")
    static let warning = Color(hex: "#D4920E")
    static let danger = Color(hex: "#D43B3B")
    static let info = Color(hex: "#3B82D4")
}
