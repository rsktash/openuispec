import SwiftUI

@main
struct TodoOrbitApp: App {
    @StateObject private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView(model: model)
                .preferredColorScheme(model.preferences.theme.colorScheme)
                .environment(\.locale, model.locale)
                .overlay(alignment: .bottom) {
                    if let toast = model.toast {
                        ToastOverlay(toast: toast)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
        }
    }
}

private struct RootView: View {
    @ObservedObject var model: AppModel

    var body: some View {
        TabView {
            NavigationStack {
                TasksHomeView(model: model)
            }
            .tabItem {
                Label(model.string("nav.tasks"), systemImage: "checklist")
            }

            NavigationStack {
                AnalyticsView(model: model)
            }
            .tabItem {
                Label(model.string("nav.analytics"), systemImage: "chart.line.uptrend.xyaxis")
            }

            NavigationStack {
                SettingsView(model: model)
            }
            .tabItem {
                Label(model.string("nav.settings"), systemImage: "gear")
            }
        }
        .tint(.teal)
    }
}
