package uz.rsteam.taskflow

import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import uz.rsteam.taskflow.model.NewProjectDraft
import uz.rsteam.taskflow.model.Priority
import uz.rsteam.taskflow.model.Project
import uz.rsteam.taskflow.model.Route
import uz.rsteam.taskflow.model.SampleData
import uz.rsteam.taskflow.model.SheetState
import uz.rsteam.taskflow.model.Task
import uz.rsteam.taskflow.model.TaskEditorDraft
import uz.rsteam.taskflow.model.TaskFilter
import uz.rsteam.taskflow.model.TaskStatus
import uz.rsteam.taskflow.model.TopLevelScreen
import uz.rsteam.taskflow.ui.screens.CalendarScreen
import uz.rsteam.taskflow.ui.screens.HomeScreen
import uz.rsteam.taskflow.ui.screens.ProfileEditScreen
import uz.rsteam.taskflow.ui.screens.ProjectDetailScreen
import uz.rsteam.taskflow.ui.screens.ProjectsScreen
import uz.rsteam.taskflow.ui.screens.SettingsScreen
import uz.rsteam.taskflow.ui.screens.TaskDetailScreen
import uz.rsteam.taskflow.ui.sheets.AssignUserSheet
import uz.rsteam.taskflow.ui.sheets.NewProjectSheet
import uz.rsteam.taskflow.ui.sheets.TaskEditorSheet
import uz.rsteam.taskflow.ui.theme.TaskFlowTheme
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Composable
fun TaskFlowApp() {
    val users = remember { SampleData.users }
    val currentUser = users.first()
    val projects = remember { mutableStateListOf<Project>().apply { addAll(SampleData.projects) } }
    val tasks = remember { mutableStateListOf<Task>().apply { addAll(SampleData.tasks(currentUser)) } }

    var route by remember { mutableStateOf<Route>(Route.TopLevel(TopLevelScreen.Home)) }
    var sheetState by remember { mutableStateOf<SheetState?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var activeFilter by remember { mutableStateOf(TaskFilter.Today) }

    TaskFlowTheme {
        BoxWithConstraints {
            val compact = maxWidth < 600.dp
            val primaryColor = MaterialTheme.colorScheme.primary
            val selectedTopLevel = when (val r = route) {
                is Route.TopLevel -> r.screen
                is Route.ProjectDetail -> TopLevelScreen.Projects
                is Route.ProfileEdit -> TopLevelScreen.Settings
                is Route.TaskDetail -> TopLevelScreen.Home
            }

            Scaffold(
                containerColor = MaterialTheme.colorScheme.background,
                bottomBar = {
                    if (compact) {
                        NavigationBar {
                            TopLevelScreen.entries.forEach { item ->
                                NavigationBarItem(
                                    selected = item == selectedTopLevel,
                                    onClick = { route = Route.TopLevel(item) },
                                    icon = {
                                        Icon(
                                            when (item) {
                                                TopLevelScreen.Home -> Icons.Outlined.Home
                                                TopLevelScreen.Projects -> Icons.Outlined.Folder
                                                TopLevelScreen.Calendar -> Icons.Outlined.CalendarMonth
                                                TopLevelScreen.Settings -> Icons.Outlined.Settings
                                            },
                                            contentDescription = null
                                        )
                                    },
                                    label = { Text(textFor(item)) }
                                )
                            }
                        }
                    }
                },
                floatingActionButton = {
                    if (selectedTopLevel == TopLevelScreen.Home) {
                        FloatingActionButton(onClick = { sheetState = SheetState.CreateTask }) {
                            Text("+")
                        }
                    }
                }
            ) { innerPadding ->
                Row(modifier = Modifier.fillMaxSize()) {
                    if (!compact) {
                        NavigationRail(modifier = Modifier.fillMaxHeight().navigationBarsPadding()) {
                            TopLevelScreen.entries.forEach { item ->
                                NavigationRailItem(
                                    selected = item == selectedTopLevel,
                                    onClick = { route = Route.TopLevel(item) },
                                    icon = {
                                        Icon(
                                            when (item) {
                                                TopLevelScreen.Home -> Icons.Outlined.Home
                                                TopLevelScreen.Projects -> Icons.Outlined.Folder
                                                TopLevelScreen.Calendar -> Icons.Outlined.CalendarMonth
                                                TopLevelScreen.Settings -> Icons.Outlined.Settings
                                            },
                                            contentDescription = null
                                        )
                                    },
                                    label = { Text(textFor(item)) }
                                )
                            }
                        }
                    }

                    when (val currentRoute = route) {
                        is Route.TopLevel -> when (currentRoute.screen) {
                            TopLevelScreen.Home -> HomeScreen(
                                currentUser = currentUser,
                                projects = projects,
                                tasks = tasks,
                                activeFilter = activeFilter,
                                searchQuery = searchQuery,
                                onSearchChange = { searchQuery = it },
                                onFilterChange = { activeFilter = it },
                                onSelectTask = { route = Route.TaskDetail(it) },
                                onCreateTask = { sheetState = SheetState.CreateTask }
                            )
                            TopLevelScreen.Projects -> ProjectsScreen(
                                projects = projects.map { it.copy(taskCount = tasks.count { t -> t.projectId == it.id }) },
                                onOpenProject = { route = Route.ProjectDetail(it) },
                                onNewProject = { sheetState = SheetState.NewProject }
                            )
                            TopLevelScreen.Calendar -> CalendarScreen()
                            TopLevelScreen.Settings -> SettingsScreen(
                                currentUser = currentUser,
                                preferences = uz.rsteam.taskflow.model.Preferences(),
                                onPreferencesChange = {},
                                onEditProfile = { route = Route.ProfileEdit }
                            )
                        }
                        is Route.TaskDetail -> {
                            val task = tasks.firstOrNull { it.id == currentRoute.taskId }
                            if (task != null) {
                                TaskDetailScreen(
                                    task = task,
                                    project = projects.firstOrNull { it.id == task.projectId },
                                    onEdit = { sheetState = SheetState.EditTask(task.id) },
                                    onToggleStatus = {
                                        val idx = tasks.indexOfFirst { it.id == task.id }
                                        if (idx >= 0) tasks[idx] = task.copy(
                                            status = if (task.status == TaskStatus.Done) TaskStatus.Todo else TaskStatus.Done,
                                            updatedAt = LocalDateTime.now()
                                        )
                                    },
                                    onDelete = {
                                        tasks.removeAll { it.id == task.id }
                                        route = Route.TopLevel(TopLevelScreen.Home)
                                    },
                                    onProjectClick = { task.projectId?.let { route = Route.ProjectDetail(it) } },
                                    onAssign = { sheetState = SheetState.AssignTask(task.id) }
                                )
                            }
                        }
                        is Route.ProjectDetail -> {
                            val project = projects.firstOrNull { it.id == currentRoute.projectId }
                            if (project != null) {
                                ProjectDetailScreen(project = project, tasks = tasks.filter { it.projectId == project.id }, onOpenTask = {
                                    route = Route.TaskDetail(it)
                                })
                            }
                        }
                        Route.ProfileEdit -> ProfileEditScreen(currentUser = currentUser) { _, _ ->
                            route = Route.TopLevel(TopLevelScreen.Settings)
                        }
                    }
                }
            }

            when (val sheet = sheetState) {
                SheetState.CreateTask -> TaskEditorSheet(
                    title = "New task",
                    initial = TaskEditorDraft(priority = Priority.Medium),
                    onDismiss = { sheetState = null },
                    onSubmit = { draft ->
                        tasks.add(0, toTask(draft, currentUser))
                        sheetState = null
                    }
                )
                is SheetState.EditTask -> {
                    val task = tasks.firstOrNull { it.id == sheet.taskId }
                    if (task != null) {
                        TaskEditorSheet(
                            title = "Edit task",
                            initial = TaskEditorDraft(
                                title = task.title,
                                description = task.description ?: "",
                                projectId = task.projectId,
                                priority = task.priority,
                                dueDate = task.dueDate?.toString() ?: "",
                                tags = task.tags.joinToString(", "),
                                assignToSelf = task.assignee?.id == currentUser.id
                            ),
                            onDismiss = { sheetState = null },
                            onSubmit = { draft ->
                                val idx = tasks.indexOfFirst { it.id == task.id }
                                if (idx >= 0) tasks[idx] = task.copy(
                                    title = draft.title,
                                    description = draft.description.ifBlank { null },
                                    priority = draft.priority,
                                    dueDate = draft.dueDate.toLocalDateOrNull(),
                                    projectId = draft.projectId,
                                    tags = draft.tags.toTags(),
                                    assignee = if (draft.assignToSelf) currentUser else null,
                                    updatedAt = LocalDateTime.now()
                                )
                                sheetState = null
                            }
                        )
                    }
                }
                SheetState.NewProject -> NewProjectSheet(
                    onDismiss = { sheetState = null },
                    onCreate = { draft: NewProjectDraft ->
                        projects.add(Project(UUID.randomUUID().toString(), draft.name.trim(), primaryColor, Icons.Outlined.Folder, 0))
                        sheetState = null
                    }
                )
                is SheetState.AssignTask -> AssignUserSheet(users = users, onDismiss = { sheetState = null }) { user ->
                    val idx = tasks.indexOfFirst { it.id == sheet.taskId }
                    if (idx >= 0) tasks[idx] = tasks[idx].copy(assignee = user, updatedAt = LocalDateTime.now())
                    sheetState = null
                }
                null -> Unit
            }
        }
    }
}

private fun textFor(screen: TopLevelScreen) = when (screen) {
    TopLevelScreen.Home -> "Tasks"
    TopLevelScreen.Projects -> "Projects"
    TopLevelScreen.Calendar -> "Calendar"
    TopLevelScreen.Settings -> "Settings"
}

private fun toTask(draft: TaskEditorDraft, currentUser: uz.rsteam.taskflow.model.User): Task = Task(
    id = UUID.randomUUID().toString(),
    title = draft.title.trim(),
    description = draft.description.trim().ifBlank { null },
    status = TaskStatus.Todo,
    priority = draft.priority,
    dueDate = draft.dueDate.toLocalDateOrNull(),
    projectId = draft.projectId,
    tags = draft.tags.toTags(),
    createdAt = LocalDateTime.now(),
    updatedAt = LocalDateTime.now(),
    assignee = if (draft.assignToSelf) currentUser else null
)

private fun String.toLocalDateOrNull(): LocalDate? = runCatching { LocalDate.parse(this) }.getOrNull()
private fun String.toTags(): List<String> = split(",").map { it.trim() }.filter { it.isNotBlank() }
