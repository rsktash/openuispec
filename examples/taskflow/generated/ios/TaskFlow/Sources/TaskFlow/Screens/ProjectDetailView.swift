import SwiftUI

struct ProjectDetailView: View {
    @Bindable var model: AppModel
    let projectID: UUID

    private var project: Project? {
        model.projects.first(where: { $0.id == projectID })
    }

    var body: some View {
        Group {
            if let project {
                List {
                    Section {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: project.icon)
                                    .foregroundStyle(Color(hex: project.colorHex))
                                Text(project.name)
                                    .font(.largeTitle.weight(.bold))
                            }
                            Text("\(model.tasks(for: project).count) tasks")
                                .foregroundStyle(AppPalette.textSecondary)
                        }
                        .padding(.vertical, 8)
                    }

                    Section {
                        if model.tasks(for: project).isEmpty {
                            ContentUnavailableView(
                                model.localized("project_detail.empty_title"),
                                systemImage: "checkmark.circle.fill",
                                description: Text(model.localized("project_detail.empty_body"))
                            )
                            .padding(.vertical, 24)
                        } else {
                            ForEach(model.tasks(for: project)) { task in
                                NavigationLink {
                                    TaskDetailView(model: model, taskID: task.id)
                                } label: {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(task.title)
                                        Text(task.dueDate?.formatted(.relative(presentation: .named)) ?? "No due date")
                                            .font(.subheadline)
                                            .foregroundStyle(AppPalette.textSecondary)
                                    }
                                }
                            }
                        }
                    }
                }
                .navigationTitle(project.name)
            } else {
                ContentUnavailableView("Project missing", systemImage: "folder.badge.questionmark")
            }
        }
    }
}
