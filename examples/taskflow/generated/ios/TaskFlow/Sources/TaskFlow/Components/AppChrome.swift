import SwiftUI

struct AppChrome: View {
    @Bindable var model: AppModel
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        Group {
            if horizontalSizeClass == .compact {
                CompactChrome(model: model)
            } else {
                RegularChrome(model: model)
            }
        }
        .tint(AppPalette.brandPrimary)
        .sheet(item: $model.presentedSheet) { sheet in
            switch sheet {
            case .createTask:
                TaskEditorSheet(model: model, mode: .create)
            case let .editTask(taskID):
                TaskEditorSheet(model: model, mode: .edit(taskID))
            case .newProject:
                NewProjectSheet(model: model)
            case let .assignTask(taskID):
                AssignTaskSheet(model: model, taskID: taskID)
            }
        }
        .overlay(alignment: .top) {
            if let message = model.toastMessage {
                ToastView(message: message)
                    .padding(.top, 12)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .task {
                        try? await _Concurrency.Task.sleep(nanoseconds: 2_500_000_000)
                        withAnimation {
                            model.toastMessage = nil
                        }
                    }
            }
        }
    }
}

private struct CompactChrome: View {
    @Bindable var model: AppModel

    var body: some View {
        TabView(selection: $model.selectedSection) {
            NavigationStack {
                HomeView(model: model)
            }
            .tabItem {
                Label(model.localized("nav.tasks"), systemImage: "checklist")
            }
            .tag(AppSection.home)

            NavigationStack {
                ProjectsView(model: model)
            }
            .tabItem {
                Label(model.localized("nav.projects"), systemImage: "folder")
            }
            .tag(AppSection.projects)

            NavigationStack {
                CalendarView(model: model)
            }
            .tabItem {
                Label(model.localized("nav.calendar"), systemImage: "calendar")
            }
            .tag(AppSection.calendar)

            NavigationStack {
                SettingsView(model: model)
            }
            .tabItem {
                Label(model.localized("nav.settings"), systemImage: "gear")
            }
            .tag(AppSection.settings)
        }
    }
}

private struct RegularChrome: View {
    @Bindable var model: AppModel

    var body: some View {
        NavigationSplitView {
            List {
                ForEach(AppSection.allCases) { section in
                    Button {
                        model.selectedSection = section
                    } label: {
                        Label(title(for: section), systemImage: icon(for: section))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    .listRowBackground(model.selectedSection == section ? AppPalette.brandPrimary.opacity(0.12) : Color.clear)
                }
            }
            .navigationTitle("TaskFlow")
        } detail: {
            NavigationStack {
                switch model.selectedSection {
                case .home:
                    HomeView(model: model)
                case .projects:
                    ProjectsView(model: model)
                case .calendar:
                    CalendarView(model: model)
                case .settings:
                    SettingsView(model: model)
                }
            }
        }
    }

    private func title(for section: AppSection) -> String {
        switch section {
        case .home: model.localized("nav.tasks")
        case .projects: model.localized("nav.projects")
        case .calendar: model.localized("nav.calendar")
        case .settings: model.localized("nav.settings")
        }
    }

    private func icon(for section: AppSection) -> String {
        switch section {
        case .home: "checklist"
        case .projects: "folder"
        case .calendar: "calendar"
        case .settings: "gear"
        }
    }
}

private struct ToastView: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(AppPalette.brandPrimary)
            .clipShape(Capsule())
            .shadow(radius: 12, y: 4)
    }
}
