package uz.rsteam.taskflow.model

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import uz.rsteam.taskflow.R
import java.time.LocalDate
import java.time.LocalDateTime

enum class TopLevelScreen(val titleRes: Int) {
    Home(R.string.nav_tasks),
    Projects(R.string.nav_projects),
    Calendar(R.string.nav_calendar),
    Settings(R.string.nav_settings)
}

sealed interface Route {
    data class TopLevel(val screen: TopLevelScreen) : Route
    data class TaskDetail(val taskId: String) : Route
    data class ProjectDetail(val projectId: String) : Route
    data object ProfileEdit : Route
}

sealed interface SheetState {
    data object CreateTask : SheetState
    data class EditTask(val taskId: String) : SheetState
    data object NewProject : SheetState
    data class AssignTask(val taskId: String) : SheetState
}

enum class TaskFilter(val labelRes: Int) {
    All(R.string.home_filter_all),
    Today(R.string.home_filter_today),
    Upcoming(R.string.home_filter_upcoming),
    Done(R.string.home_filter_done)
}

enum class TaskStatus(val labelRes: Int) {
    Todo(R.string.status_todo),
    InProgress(R.string.status_in_progress),
    Done(R.string.status_done)
}

enum class Priority(val labelRes: Int, val color: Color) {
    Low(R.string.priority_low, Color(0xFF9CA3AF)),
    Medium(R.string.priority_medium, Color(0xFF3B82D4)),
    High(R.string.priority_high, Color(0xFFD4920E)),
    Urgent(R.string.priority_urgent, Color(0xFFD43B3B))
}

data class User(
    val id: String,
    val name: String,
    val firstName: String,
    val email: String
)

data class Project(
    val id: String,
    val name: String,
    val color: Color,
    val icon: ImageVector,
    val taskCount: Int
)

data class MediaAttachment(
    val source: String,
    val mediaType: String,
    val title: String
)

data class Task(
    val id: String,
    val title: String,
    val description: String?,
    val status: TaskStatus,
    val priority: Priority,
    val dueDate: LocalDate?,
    val projectId: String?,
    val tags: List<String>,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime,
    val assignee: User?,
    val attachment: MediaAttachment? = null
)

data class Preferences(
    val defaultPriority: Priority = Priority.Medium,
    val notificationsEnabled: Boolean = true,
    val remindersEnabled: Boolean = true
)

data class TaskEditorDraft(
    val title: String = "",
    val description: String = "",
    val projectId: String? = null,
    val priority: Priority = Priority.Medium,
    val dueDate: String = "",
    val tags: String = "",
    val assignToSelf: Boolean = true
)

data class NewProjectDraft(
    val name: String = "",
    val colorName: String = "Indigo",
    val iconName: String = "Folder"
)
