package uz.rsteam.taskflow.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Button
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import uz.rsteam.taskflow.model.Project
import uz.rsteam.taskflow.model.Task
import uz.rsteam.taskflow.ui.components.EmptyStateCard

@Composable
fun ProjectsScreen(projects: List<Project>, onOpenProject: (String) -> Unit, onNewProject: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Projects", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Button(onClick = onNewProject) { Text("New project") }
        if (projects.isEmpty()) {
            EmptyStateCard("No projects yet", "Create a project to organize your tasks")
        } else {
            LazyVerticalGrid(columns = GridCells.Fixed(2), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(projects, key = { it.id }) { project ->
                    ElevatedCard(onClick = { onOpenProject(project.id) }) {
                        Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(project.name, fontWeight = FontWeight.SemiBold)
                            Text("${project.taskCount} tasks")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProjectDetailScreen(project: Project, tasks: List<Task>, onOpenTask: (String) -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(project.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        if (tasks.isEmpty()) {
            EmptyStateCard("No tasks in this project", "Add a task to get started")
        } else {
            tasks.forEach { task ->
                ElevatedCard(onClick = { onOpenTask(task.id) }) {
                    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                        Text(task.title, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}
