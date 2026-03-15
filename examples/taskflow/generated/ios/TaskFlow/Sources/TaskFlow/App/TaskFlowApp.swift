import SwiftUI

@main
struct TaskFlowApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            AppChrome(model: model)
                .preferredColorScheme(colorScheme(for: model.preferences.theme))
        }
    }

    private func colorScheme(for theme: ThemePreference) -> ColorScheme? {
        switch theme {
        case .system:
            nil
        case .light, .warm:
            .light
        case .dark:
            .dark
        }
    }
}
