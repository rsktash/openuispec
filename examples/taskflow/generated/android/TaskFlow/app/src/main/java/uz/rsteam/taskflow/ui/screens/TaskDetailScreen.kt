package uz.rsteam.taskflow.ui.screens

import android.net.Uri
import android.widget.MediaController
import android.widget.VideoView
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Label
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import uz.rsteam.taskflow.model.Project
import uz.rsteam.taskflow.model.Task
import uz.rsteam.taskflow.ui.components.DetailRow
import uz.rsteam.taskflow.ui.components.SectionCard
import uz.rsteam.taskflow.ui.components.StatCard
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

@Composable
fun TaskDetailScreen(
    task: Task,
    project: Project?,
    onEdit: () -> Unit,
    onToggleStatus: () -> Unit,
    onDelete: () -> Unit,
    onProjectClick: () -> Unit,
    onAssign: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(task.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)

        SectionCard("Overview") {
            StatCard("Status", task.status.name)
            Spacer(Modifier.height(8.dp))
            StatCard("Priority", task.priority.name)
        }

        task.description?.let {
            SectionCard("Description") { Text(it) }
        }

        task.attachment?.let {
            SectionCard("Media") {
                Text(it.title, fontWeight = FontWeight.SemiBold)
                if (it.mediaType == "video") InlineVideoPlayer(it.source)
            }
        }

        SectionCard("Details") {
            DetailRow(Icons.Outlined.Folder, "Project", project?.name ?: "Unknown", onProjectClick)
            DetailRow(Icons.Outlined.Person, "Assignee", task.assignee?.name ?: "Unassigned", onAssign)
            DetailRow(Icons.AutoMirrored.Outlined.Label, "Tags", task.tags.joinToString(", ").ifBlank { "—" })
            DetailRow(Icons.Outlined.Schedule, "Created", task.createdAt.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM)))
        }

        Button(onClick = onEdit, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.Edit, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Edit task")
        }
        OutlinedButton(onClick = onToggleStatus, modifier = Modifier.fillMaxWidth()) {
            Text(if (task.status.name == "Done") "Reopen task" else "Mark complete")
        }
        OutlinedButton(onClick = onDelete, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.Delete, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Delete task")
        }
    }
}

@Composable
private fun InlineVideoPlayer(url: String) {
    val context = LocalContext.current
    AndroidView(
        modifier = Modifier.fillMaxWidth().height(220.dp),
        factory = {
            VideoView(context).apply {
                setVideoURI(Uri.parse(url))
                setMediaController(MediaController(context).also { controller -> controller.setAnchorView(this) })
            }
        },
        update = { if (!it.isPlaying) it.seekTo(1) }
    )
}
