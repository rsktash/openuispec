package uz.rsteam.todoorbit

import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
import androidx.compose.material.icons.outlined.Checklist
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.os.LocaleListCompat
import kotlinx.coroutines.launch
import uz.rsteam.todoorbit.ui.theme.TodoOrbitTheme
import java.time.LocalDate
import java.time.LocalDateTime

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class, ExperimentalLayoutApi::class)
@Composable
fun TodoOrbitGeneratedApp() {
    var tab by rememberSaveable { mutableStateOf(ScreenTab.Tasks) }
    var filter by rememberSaveable { mutableStateOf(TaskFilter.All) }
    var searchQuery by rememberSaveable { mutableStateOf("") }
    var analyticsPeriod by rememberSaveable { mutableStateOf(AnalyticsPeriod.Week) }
    var preferences by rememberSaveable(stateSaver = PreferencesStateSaver) { mutableStateOf(PreferencesState()) }
    var selectedTaskId by rememberSaveable { mutableStateOf(sampleTasks().first().id) }
    var overlay by remember { mutableStateOf<OverlayState?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val tasks = remember { mutableStateListOf(*sampleTasks().toTypedArray()) }
    val recurringRules = remember { mutableStateListOf<RecurringRuleModel>() }
    val createTaskSuccessMessage = stringResource(R.string.create_task_success)
    val editTaskSuccessMessage = stringResource(R.string.edit_task_success)
    val recurringRuleSuccessMessage = stringResource(R.string.recurring_rule_success)

    LaunchedEffect(preferences.locale) {
        AppCompatDelegate.setApplicationLocales(
            LocaleListCompat.forLanguageTags(preferences.locale.toLanguageTag())
        )
    }

    TodoOrbitTheme(darkTheme = preferences.themeMode == ThemeMode.Dark) {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            BoxWithConstraints {
                val useRail = maxWidth >= 900.dp
                val useSplitView = useRail && this@BoxWithConstraints.maxWidth >= 1200.dp
                val visibleTasks = remember(tasks.toList(), filter, searchQuery) {
                    tasks.filter { task ->
                        val matchesFilter = when (filter) {
                            TaskFilter.All -> true
                            TaskFilter.Open -> task.status == TaskStatus.Open
                            TaskFilter.Done -> task.status == TaskStatus.Done
                        }
                        val matchesSearch = listOf(task.title, task.notes).joinToString(" ").contains(searchQuery, ignoreCase = true)
                        matchesFilter && matchesSearch
                    }
                }
                val selectedTask = tasks.firstOrNull { it.id == selectedTaskId } ?: tasks.firstOrNull()
                val overview = analyticsOverview(tasks)
                val trendSeries = trendPoints(tasks, analyticsPeriod, preferences.locale)
                val overdueTasks = tasks.filter { it.status == TaskStatus.Open && it.dueDate?.isBefore(LocalDate.now()) == true }

                Scaffold(
                    topBar = {
                        TopAppBar(
                            title = {
                                Column {
                                    Text(stringResource(R.string.app_name), fontWeight = FontWeight.Bold)
                                    Text(
                                        text = when (tab) {
                                            ScreenTab.Tasks -> stringResource(R.string.app_path_home)
                                            ScreenTab.Analytics -> stringResource(R.string.app_path_analytics)
                                            ScreenTab.Settings -> stringResource(R.string.app_path_settings)
                                        },
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        )
                    },
                    bottomBar = {
                        if (!useRail) {
                            NavigationBar {
                                NavigationBarItem(
                                    selected = tab == ScreenTab.Tasks,
                                    onClick = { tab = ScreenTab.Tasks },
                                    icon = { Icon(Icons.Outlined.Checklist, contentDescription = null) },
                                    label = { Text(stringResource(R.string.nav_tasks)) }
                                )
                                NavigationBarItem(
                                    selected = tab == ScreenTab.Analytics,
                                    onClick = { tab = ScreenTab.Analytics },
                                    icon = { Icon(Icons.AutoMirrored.Outlined.TrendingUp, contentDescription = null) },
                                    label = { Text(stringResource(R.string.nav_analytics)) }
                                )
                                NavigationBarItem(
                                    selected = tab == ScreenTab.Settings,
                                    onClick = { tab = ScreenTab.Settings },
                                    icon = { Icon(Icons.Outlined.Settings, contentDescription = null) },
                                    label = { Text(stringResource(R.string.nav_settings)) }
                                )
                            }
                        }
                    },
                    snackbarHost = { SnackbarHost(snackbarHostState) }
                ) { innerPadding ->
                    Row(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
                        if (useRail) {
                            NavigationRail(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)) {
                                Spacer(Modifier.height(12.dp))
                                NavigationRailItem(
                                    selected = tab == ScreenTab.Tasks,
                                    onClick = { tab = ScreenTab.Tasks },
                                    icon = { Icon(Icons.Outlined.Checklist, contentDescription = null) },
                                    label = { Text(stringResource(R.string.nav_tasks)) }
                                )
                                NavigationRailItem(
                                    selected = tab == ScreenTab.Analytics,
                                    onClick = { tab = ScreenTab.Analytics },
                                    icon = { Icon(Icons.AutoMirrored.Outlined.TrendingUp, contentDescription = null) },
                                    label = { Text(stringResource(R.string.nav_analytics)) }
                                )
                                NavigationRailItem(
                                    selected = tab == ScreenTab.Settings,
                                    onClick = { tab = ScreenTab.Settings },
                                    icon = { Icon(Icons.Outlined.Settings, contentDescription = null) },
                                    label = { Text(stringResource(R.string.nav_settings)) }
                                )
                            }
                        }

                        Crossfade(targetState = tab, modifier = Modifier.fillMaxSize(), label = "tab-crossfade") { activeTab ->
                            when (activeTab) {
                                ScreenTab.Tasks -> {
                                    TasksScreen(
                                        tasks = visibleTasks,
                                        allTasks = tasks,
                                        filter = filter,
                                        searchQuery = searchQuery,
                                        selectedTask = selectedTask,
                                        locale = preferences.locale,
                                        useSplitView = useSplitView,
                                        onSearchChange = { searchQuery = it },
                                        onFilterChange = { filter = it },
                                        onSelectTask = { selectedTaskId = it.id },
                                        onToggleTask = { task ->
                                            val index = tasks.indexOfFirst { it.id == task.id }
                                            if (index >= 0) {
                                                tasks[index] = task.copy(
                                                    status = if (task.status == TaskStatus.Done) TaskStatus.Open else TaskStatus.Done,
                                                    updatedAt = LocalDateTime.now()
                                                )
                                            }
                                        },
                                        onCreateTask = { overlay = OverlayState.CreateTask },
                                        onEditTask = { overlay = OverlayState.EditTask(it.id) },
                                        onDeleteTask = {
                                            tasks.removeAll { task -> task.id == it.id }
                                            selectedTaskId = tasks.firstOrNull()?.id.orEmpty()
                                        },
                                        onMoreInfo = { overlay = OverlayState.TaskMeta(it.id) }
                                    )
                                }

                                ScreenTab.Analytics -> {
                                    AnalyticsScreen(
                                        period = analyticsPeriod,
                                        overview = overview,
                                        trendSeries = trendSeries,
                                        overdueTasks = overdueTasks,
                                        onPeriodChange = { analyticsPeriod = it },
                                        locale = preferences.locale
                                    )
                                }

                                ScreenTab.Settings -> {
                                    SettingsScreen(
                                        preferences = preferences,
                                        recurringRules = recurringRules,
                                        onPreferencesChange = { preferences = it },
                                        onOpenRecurringRule = { overlay = OverlayState.RecurringRule },
                                        locale = preferences.locale
                                    )
                                }
                            }
                        }
                    }
                }

                when (val currentOverlay = overlay) {
                    OverlayState.CreateTask -> {
                        TaskEditorSheet(
                            draft = TaskDraft(),
                            title = stringResource(R.string.create_task_title),
                            saveLabel = stringResource(R.string.create_task_save),
                            onDismiss = { overlay = null },
                            onSubmit = { draft ->
                                tasks.add(
                                    0,
                                    TaskModel(
                                        id = "task-${System.currentTimeMillis()}",
                                        title = draft.title.trim(),
                                        notes = draft.notes.trim(),
                                        status = TaskStatus.Open,
                                        priority = draft.priority,
                                        dueDate = draft.dueDate,
                                        createdAt = LocalDateTime.now(),
                                        updatedAt = LocalDateTime.now()
                                    )
                                )
                                selectedTaskId = tasks.first().id
                                overlay = null
                                scope.launch {
                                    snackbarHostState.showSnackbar(createTaskSuccessMessage)
                                }
                            }
                        )
                    }

                    is OverlayState.EditTask -> {
                        val task = tasks.firstOrNull { it.id == currentOverlay.taskId }
                        if (task != null) {
                            TaskEditorSheet(
                                draft = TaskDraft(
                                    title = task.title,
                                    notes = task.notes,
                                    priority = task.priority,
                                    dueDate = task.dueDate
                                ),
                                title = stringResource(R.string.edit_task_title),
                                saveLabel = stringResource(R.string.edit_task_save),
                                onDismiss = { overlay = null },
                                onSubmit = { draft ->
                                    val index = tasks.indexOfFirst { it.id == task.id }
                                    if (index >= 0) {
                                        tasks[index] = task.copy(
                                            title = draft.title.trim(),
                                            notes = draft.notes.trim(),
                                            priority = draft.priority,
                                            dueDate = draft.dueDate,
                                            updatedAt = LocalDateTime.now()
                                        )
                                    }
                                    overlay = null
                                    scope.launch {
                                        snackbarHostState.showSnackbar(editTaskSuccessMessage)
                                    }
                                }
                            )
                        }
                    }

                    OverlayState.RecurringRule -> {
                        RecurringRuleSheet(
                            preferences = preferences,
                            rules = recurringRules,
                            locale = preferences.locale,
                            onDismiss = { overlay = null },
                            onSubmit = { rule ->
                                recurringRules.add(0, rule)
                                overlay = null
                                scope.launch {
                                    snackbarHostState.showSnackbar(recurringRuleSuccessMessage)
                                }
                            }
                        )
                    }

                    is OverlayState.TaskMeta -> {
                        val task = tasks.firstOrNull { it.id == currentOverlay.taskId }
                        if (task != null) {
                            AlertDialog(
                                onDismissRequest = { overlay = null },
                                title = { Text(stringResource(R.string.task_detail_more_info)) },
                                text = {
                                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        LabelValue(
                                            stringResource(R.string.task_detail_status),
                                            stringResource(task.status.labelRes)
                                        )
                                        LabelValue(
                                            stringResource(R.string.task_detail_priority),
                                            stringResource(task.priority.labelRes)
                                        )
                                        LabelValue(
                                            stringResource(R.string.task_detail_created),
                                            formatAbsolute(task.createdAt.toLocalDate(), preferences.locale)
                                        )
                                        LabelValue(
                                            stringResource(R.string.task_detail_updated),
                                            formatAbsolute(task.updatedAt.toLocalDate(), preferences.locale)
                                        )
                                    }
                                },
                                confirmButton = {
                                    TextButton(onClick = { overlay = null }) {
                                        Text(stringResource(R.string.common_cancel))
                                    }
                                }
                            )
                        }
                    }

                    null -> Unit
                }
            }
        }
    }
}
