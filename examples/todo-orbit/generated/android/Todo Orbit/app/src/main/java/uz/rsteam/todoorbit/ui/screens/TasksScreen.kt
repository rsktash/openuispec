package uz.rsteam.todoorbit

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Sort
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TasksScreen(
    tasks: List<TaskModel>,
    allTasks: List<TaskModel>,
    filter: TaskFilter,
    searchQuery: String,
    selectedTask: TaskModel?,
    locale: UiLocale,
    useSplitView: Boolean,
    onSearchChange: (String) -> Unit,
    onFilterChange: (TaskFilter) -> Unit,
    onSelectTask: (TaskModel) -> Unit,
    onToggleTask: (TaskModel) -> Unit,
    onCreateTask: () -> Unit,
    onEditTask: (TaskModel) -> Unit,
    onDeleteTask: (TaskModel) -> Unit,
    onMoreInfo: (TaskModel) -> Unit
) {
    val counts = remember(allTasks) {
        mapOf(
            TaskFilter.All to allTasks.size,
            TaskFilter.Open to allTasks.count { it.status == TaskStatus.Open },
            TaskFilter.Done to allTasks.count { it.status == TaskStatus.Done }
        )
    }
    val detailPanePadding = 20.dp

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val listPaneWidth = if (useSplitView) maxWidth * 0.42f else maxWidth
        val detailPaneWidth = (maxWidth - listPaneWidth - detailPanePadding * 2).coerceAtLeast(0.dp)

        Row(modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                modifier = Modifier.width(listPaneWidth).fillMaxHeight(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(20.dp)
            ) {
                item {
                    HeroCard(
                        title = stringResource(R.string.home_title),
                        subtitle = homeSummaryText(counts[TaskFilter.Open] ?: 0, counts[TaskFilter.All] ?: 0)
                    )
                }
                item {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = onSearchChange,
                        modifier = Modifier.fillMaxWidth(),
                        leadingIcon = { Icon(Icons.Outlined.Sort, contentDescription = null) },
                        label = { Text(stringResource(R.string.home_search_label)) },
                        placeholder = { Text(stringResource(R.string.home_search_placeholder)) },
                        shape = MaterialTheme.shapes.medium
                    )
                }
                item {
                    androidx.compose.foundation.layout.FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TaskFilter.entries.forEach { current ->
                            FilterChip(
                                selected = current == filter,
                                onClick = { onFilterChange(current) },
                                label = {
                                    val label = when (current) {
                                        TaskFilter.All -> stringResource(R.string.home_filter_all)
                                        TaskFilter.Open -> stringResource(R.string.home_filter_open)
                                        TaskFilter.Done -> stringResource(R.string.home_filter_done)
                                    }
                                    Text("$label (${counts[current] ?: 0})")
                                }
                            )
                        }
                    }
                }
                if (tasks.isEmpty()) {
                    item {
                        EmptyCard(
                            stringResource(R.string.home_empty_title),
                            stringResource(R.string.home_empty_body)
                        )
                    }
                } else {
                    items(tasks, key = { it.id }) { task ->
                        TaskRow(
                            task = task,
                            selected = selectedTask?.id == task.id,
                            onSelect = { onSelectTask(task) },
                            onToggle = { onToggleTask(task) }
                        )
                    }
                }
                item { Spacer(Modifier.height(80.dp)) }
            }

            if (useSplitView && selectedTask != null) {
                TaskDetailPane(
                    modifier = Modifier.width(detailPaneWidth).fillMaxHeight().padding(detailPanePadding),
                    locale = locale,
                    task = selectedTask,
                    onEdit = { onEditTask(selectedTask) },
                    onToggle = { onToggleTask(selectedTask) },
                    onDelete = { onDeleteTask(selectedTask) },
                    onMoreInfo = { onMoreInfo(selectedTask) }
                )
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.BottomEnd) {
        Button(onClick = onCreateTask, modifier = Modifier.padding(24.dp), shape = MaterialTheme.shapes.medium) {
            Icon(Icons.Outlined.Add, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text(stringResource(R.string.home_new_task))
        }
    }
}

@Composable
fun TaskRow(
    task: TaskModel,
    selected: Boolean,
    onSelect: () -> Unit,
    onToggle: () -> Unit
) {
    val containerColor =
        if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface

    OutlinedCard(
        modifier = Modifier.animateContentSize(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.outlinedCardColors(containerColor = containerColor),
        onClick = onSelect
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Checkbox(checked = task.status == TaskStatus.Done, onCheckedChange = { onToggle() })
            Column(modifier = Modifier.fillMaxWidth(0.85f)) {
                Text(task.title, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    text = task.dueDate?.let { relativeDateText(it) } ?: stringResource(R.string.task_detail_no_due_date),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Box(modifier = Modifier.size(12.dp).background(task.priority.color, CircleShape))
        }
    }
}

@OptIn(ExperimentalFoundationApi::class, ExperimentalLayoutApi::class)
@Composable
fun TaskDetailPane(
    modifier: Modifier = Modifier,
    locale: UiLocale,
    task: TaskModel,
    onEdit: () -> Unit,
    onToggle: () -> Unit,
    onDelete: () -> Unit,
    onMoreInfo: () -> Unit
) {
    var confirmDelete by remember { mutableStateOf(false) }

    ElevatedCard(modifier = modifier, shape = MaterialTheme.shapes.large) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(20.dp)
        ) {
            item {
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth(0.72f)) {
                        Text(
                            stringResource(R.string.task_detail_title),
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(task.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        Text(
                            task.dueDate?.let { formatAbsolute(it, locale) } ?: stringResource(R.string.task_detail_no_due_date),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    AssistChip(
                        onClick = {},
                        label = { Text(stringResource(task.status.labelRes)) },
                        leadingIcon = { Icon(Icons.Outlined.CheckCircle, contentDescription = null) }
                    )
                }
            }
            item {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    modifier = Modifier.height(220.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    userScrollEnabled = false
                ) {
                    item { StatCard(stringResource(R.string.task_detail_status), stringResource(task.status.labelRes)) }
                    item { StatCard(stringResource(R.string.task_detail_priority), stringResource(task.priority.labelRes)) }
                    item { StatCard(stringResource(R.string.task_detail_created), formatAbsolute(task.createdAt.toLocalDate(), locale)) }
                    item { StatCard(stringResource(R.string.task_detail_updated), formatAbsolute(task.updatedAt.toLocalDate(), locale)) }
                }
            }
            if (task.notes.isNotBlank()) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.task_detail_notes), style = MaterialTheme.typography.titleMedium)
                        Text(task.notes)
                    }
                }
            }
            item {
                androidx.compose.foundation.layout.FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(onClick = onEdit, shape = MaterialTheme.shapes.medium) {
                        Icon(Icons.Outlined.Edit, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.task_detail_edit))
                    }
                    OutlinedButton(onClick = onToggle, shape = MaterialTheme.shapes.medium) {
                        Text(stringResource(R.string.task_detail_toggle_status))
                    }
                    OutlinedButton(onClick = onMoreInfo, shape = MaterialTheme.shapes.medium) {
                        Icon(Icons.Outlined.Info, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.task_detail_more_info))
                    }
                    OutlinedButton(onClick = { confirmDelete = true }, shape = MaterialTheme.shapes.medium) {
                        Icon(Icons.Outlined.Delete, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.task_detail_delete))
                    }
                }
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text(stringResource(R.string.task_detail_delete_title)) },
            text = { Text(stringResource(R.string.task_detail_delete_message)) },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }) {
                    Text(stringResource(R.string.common_cancel))
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmDelete = false
                        onDelete()
                    }
                ) {
                    Text(stringResource(R.string.common_delete))
                }
            }
        )
    }
}

@Composable
private fun homeSummaryText(open: Int, total: Int): String {
    return if (open == 0) {
        stringResource(R.string.home_summary_done)
    } else {
        pluralStringResource(R.plurals.home_summary_open, open, open, total)
    }
}

@Composable
private fun relativeDateText(date: LocalDate): String {
    val days = ChronoUnit.DAYS.between(LocalDate.now(), date)
    return when {
        days == 0L -> stringResource(R.string.common_today)
        days > 0L -> pluralStringResource(R.plurals.common_in_days, days.toInt(), days.toInt())
        else -> pluralStringResource(R.plurals.common_days_ago, (-days).toInt(), (-days).toInt())
    }
}
