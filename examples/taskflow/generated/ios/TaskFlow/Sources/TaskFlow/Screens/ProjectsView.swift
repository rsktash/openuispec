import SwiftUI

struct ProjectsView: View {
    @Bindable var model: AppModel

    private let gridColumns = [
        GridItem(.adaptive(minimum: 220), spacing: 16)
    ]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: gridColumns, spacing: 16) {
                ForEach(model.projects) { project in
                    NavigationLink {
                        ProjectDetailView(model: model, projectID: project.id)
                    } label: {
                        ProjectCard(project: project, taskCount: model.tasks(for: project).count)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(24)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(model.localized("projects.title"))
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    model.presentedSheet = .newProject
                } label: {
                    Label(model.localized("projects.new_project"), systemImage: "plus.circle")
                }
            }
        }
    }
}

private struct ProjectCard: View {
    let project: Project
    let taskCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: project.icon)
                .font(.title2.weight(.semibold))
                .foregroundStyle(Color(hex: project.colorHex))
                .frame(width: 48, height: 48)
                .background(Color(hex: project.colorHex).opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 16))
            Text(project.name)
                .font(.headline)
                .multilineTextAlignment(.leading)
            Text(taskCount == 1 ? "1 task" : "\(taskCount) tasks")
                .font(.subheadline)
                .foregroundStyle(AppPalette.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .shadow(color: .black.opacity(0.05), radius: 12, y: 4)
    }
}
