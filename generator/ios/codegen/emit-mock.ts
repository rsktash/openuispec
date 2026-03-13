/**
 * Emits TaskFlowService protocol and MockService with sample data.
 */

import type { IR } from "../ir/types.js";
import { fileHeader } from "./swift-utils.js";

export function emitServiceProtocol(ir: IR): string {
  let code = fileHeader("TaskFlowService.swift");
  code += `import Foundation\n\n`;

  code += `protocol TaskFlowService {\n`;
  code += `    func fetchTasks(filter: String?, sort: String?, search: String?) async throws -> [Task]\n`;
  code += `    func fetchTask(id: String) async throws -> Task\n`;
  code += `    func createTask(_ task: Task) async throws -> Task\n`;
  code += `    func updateTask(id: String, _ task: Task) async throws -> Task\n`;
  code += `    func deleteTask(id: String) async throws\n`;
  code += `    func toggleTaskStatus(id: String) async throws -> Task\n`;
  code += `    func fetchProjects() async throws -> [Project]\n`;
  code += `    func fetchProject(id: String) async throws -> Project\n`;
  code += `    func createProject(_ project: Project) async throws -> Project\n`;
  code += `    func fetchUsers(search: String?) async throws -> [User]\n`;
  code += `    func fetchCurrentUser() async throws -> User\n`;
  code += `    func fetchTaskCounts() async throws -> TaskCounts\n`;
  code += `}\n\n`;

  code += `struct TaskCounts: Hashable {\n`;
  code += `    var all: Int\n`;
  code += `    var today: Int\n`;
  code += `    var upcoming: Int\n`;
  code += `    var done: Int\n`;
  code += `}\n`;

  return code;
}

export function emitMockService(ir: IR): string {
  let code = fileHeader("MockService.swift");
  code += `import Foundation\n\n`;

  code += `final class MockService: TaskFlowService {\n`;
  code += `    static let shared = MockService()\n\n`;

  // Sample data
  code += `    private let sampleProjects: [Project] = [\n`;
  code += `        Project(id: "p1", name: "Product Launch", color: "#5B4FE8", icon: "rocket", taskCount: 5),\n`;
  code += `        Project(id: "p2", name: "Marketing", color: "#E8634F", icon: "briefcase", taskCount: 3),\n`;
  code += `        Project(id: "p3", name: "Engineering", color: "#2D9D5E", icon: "gear", taskCount: 8),\n`;
  code += `    ]\n\n`;

  code += `    private let sampleUser = User(\n`;
  code += `        id: "u1",\n`;
  code += `        name: "Alex Johnson",\n`;
  code += `        firstName: "Alex",\n`;
  code += `        avatar: nil,\n`;
  code += `        email: "alex@taskflow.app"\n`;
  code += `    )\n\n`;

  code += `    private var sampleTasks: [Task] {\n`;
  code += `        [\n`;
  code += `            Task(id: "t1", title: "Design onboarding flow", description: "Create wireframes for the new user onboarding experience", status: "in_progress", priority: "high", dueDate: Date().addingTimeInterval(86400), projectId: "p1", assignee: sampleUser, tags: ["design", "ux"], createdAt: Date(), updatedAt: Date()),\n`;
  code += `            Task(id: "t2", title: "Write API documentation", description: "Document all REST endpoints", status: "todo", priority: "medium", dueDate: Date().addingTimeInterval(172800), projectId: "p3", assignee: nil, tags: ["docs"], createdAt: Date(), updatedAt: Date()),\n`;
  code += `            Task(id: "t3", title: "Fix login bug", description: nil, status: "todo", priority: "urgent", dueDate: Date(), projectId: "p3", assignee: sampleUser, tags: ["bug"], createdAt: Date(), updatedAt: Date()),\n`;
  code += `            Task(id: "t4", title: "Update brand colors", description: "Align with new brand guidelines", status: "done", priority: "low", dueDate: nil, projectId: "p2", assignee: nil, tags: ["design"], createdAt: Date(), updatedAt: Date()),\n`;
  code += `            Task(id: "t5", title: "Prepare launch checklist", description: "Compile all pre-launch requirements", status: "todo", priority: "high", dueDate: Date().addingTimeInterval(259200), projectId: "p1", assignee: sampleUser, tags: ["planning"], createdAt: Date(), updatedAt: Date()),\n`;
  code += `        ]\n`;
  code += `    }\n\n`;

  // Protocol methods
  code += `    func fetchTasks(filter: String?, sort: String?, search: String?) async throws -> [Task] {\n`;
  code += `        sampleTasks\n`;
  code += `    }\n\n`;

  code += `    func fetchTask(id: String) async throws -> Task {\n`;
  code += `        sampleTasks.first { $0.id == id } ?? sampleTasks[0]\n`;
  code += `    }\n\n`;

  code += `    func createTask(_ task: Task) async throws -> Task { task }\n\n`;
  code += `    func updateTask(id: String, _ task: Task) async throws -> Task { task }\n\n`;
  code += `    func deleteTask(id: String) async throws {}\n\n`;

  code += `    func toggleTaskStatus(id: String) async throws -> Task {\n`;
  code += `        var task = try await fetchTask(id: id)\n`;
  code += `        task.status = task.status == "done" ? "todo" : "done"\n`;
  code += `        return task\n`;
  code += `    }\n\n`;

  code += `    func fetchProjects() async throws -> [Project] { sampleProjects }\n\n`;
  code += `    func fetchProject(id: String) async throws -> Project {\n`;
  code += `        sampleProjects.first { $0.id == id } ?? sampleProjects[0]\n`;
  code += `    }\n\n`;

  code += `    func createProject(_ project: Project) async throws -> Project { project }\n\n`;

  code += `    func fetchUsers(search: String?) async throws -> [User] { [sampleUser] }\n\n`;

  code += `    func fetchCurrentUser() async throws -> User { sampleUser }\n\n`;

  code += `    func fetchTaskCounts() async throws -> TaskCounts {\n`;
  code += `        TaskCounts(all: 5, today: 3, upcoming: 2, done: 1)\n`;
  code += `    }\n`;

  code += `}\n`;

  return code;
}
