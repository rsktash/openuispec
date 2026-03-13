/**
 * Emits TaskFlowApp.swift (entry point), AppRouter, Route, and Color+Hex utility.
 */

import type { IR } from "../ir/types.js";
import { fileHeader } from "./swift-utils.js";

export function emitAppEntry(ir: IR): string {
  let code = fileHeader("TaskFlowApp.swift");

  code += `
@main
struct ${ir.projectName}App: App {
    @State private var router = AppRouter()
    @State private var theme = AppTheme()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(router)
                .environment(theme)
                .preferredColorScheme(theme.preferredColorScheme)
        }
    }
}

struct ContentView: View {
    @Environment(AppRouter.self) private var router
    @State private var selectedTab = Tab.home

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeScreen()
            }
            .tabItem {
                Label(L10n.navTasks, systemImage: selectedTab == .home ? "checklist" : "checklist")
            }
            .tag(Tab.home)

            NavigationStack {
                ProjectsScreen()
            }
            .tabItem {
                Label(L10n.navProjects, systemImage: selectedTab == .projects ? "folder.fill" : "folder")
            }
            .tag(Tab.projects)

            NavigationStack {
                CalendarScreen()
            }
            .tabItem {
                Label(L10n.navCalendar, systemImage: selectedTab == .calendar ? "calendar" : "calendar")
            }
            .tag(Tab.calendar)

            NavigationStack {
                SettingsScreen()
            }
            .tabItem {
                Label(L10n.navSettings, systemImage: selectedTab == .settings ? "gear" : "gear")
            }
            .tag(Tab.settings)
        }
        .tint(Color.brandPrimary)
    }
}
`;
  return code;
}

export function emitRouter(): string {
  let code = fileHeader("AppRouter.swift");

  code += `
@Observable
final class AppRouter {
    var path = NavigationPath()

    func navigate(to route: Route) {
        path.append(route)
    }

    func goBack() {
        if !path.isEmpty {
            path.removeLast()
        }
    }

    func popToRoot() {
        path = NavigationPath()
    }
}
`;
  return code;
}

export function emitRoute(): string {
  let code = fileHeader("Route.swift");

  code += `
enum Tab: String, Hashable {
    case home
    case projects
    case calendar
    case settings
}

enum Route: Hashable {
    case taskDetail(taskId: String)
    case projectDetail(projectId: String)
    case profileEdit
    case createTask
    case editTask(taskId: String)
}
`;
  return code;
}

export function emitColorHex(): string {
  let code = fileHeader("Color+Hex.swift");

  code += `
extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        guard hexSanitized.count == 6 else { return nil }

        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)

        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}
`;
  return code;
}
