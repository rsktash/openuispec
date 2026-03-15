package uz.rsteam.taskflow.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import uz.rsteam.taskflow.model.Project
import uz.rsteam.taskflow.model.Task
import uz.rsteam.taskflow.model.TaskFilter
import uz.rsteam.taskflow.model.TaskStatus
import uz.rsteam.taskflow.model.User
import uz.rsteam.taskflow.ui.components.EmptyStateCard
import uz.rsteam.taskflow.ui.components.PriorityDot
import java.time.LocalDate

@Composable
fun HomeScreen(
    currentUser: User,
    projects: List<Project>,
    tasks: List<Task>,
    activeFilter: TaskFilter,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onFilterChange: (TaskFilter) -> Unit,
    onSelectTask: (String) -> Unit,
    onCreateTask: () -> Unit
) {
    val filteredTasks = tasks.filter { task ->
        val filterMatch = when (activeFilter) {
            TaskFilter.All -> true
            TaskFilter.Today -> task.dueDate == LocalDate.now()
            TaskFilter.Upcoming -> task.dueDate?.isAfter(LocalDate.now()) == true
            TaskFilter.Done -> task.status == TaskStatus.Done
        }
        val haystack = (task.title + " " + (task.description ?: "") + " " + task.tags.joinToString(" ") + " " + (projects.firstOrNull { it.id == task.projectId }?.name ?: ""))
        filterMatch && haystack.contains(searchQuery, ignoreCase = true)
    }

    LazyColumn(contentPadding = PaddingValues(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Good day, ${currentUser.firstName}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("${filteredTasks.size} tasks visible", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchChange,
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
                placeholder = { Text("Search tasks") }
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TaskFilter.entries.forEach { filter ->
                    FilterChip(selected = filter == activeFilter, onClick = { onFilterChange(filter) }, label = { Text(filter.name) })
                }
            }
        }
        item {
            Button(onClick = onCreateTask) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("New task")
            }
        }

        if (filteredTasks.isEmpty()) {
            item { EmptyStateCard(title = "All caught up!", body = "No tasks match this filter") }
        } else {
            items(filteredTasks, key = { it.id }) { task ->
                ElevatedCard(onClick = { onSelectTask(task.id) }) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(task.title, fontWeight = FontWeight.SemiBold)
                            Text(task.tags.joinToString(", "), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        PriorityDot(task.priority.color)
                    }
                }
            }
        }
        item { Spacer(Modifier.height(80.dp)) }
    }
}
