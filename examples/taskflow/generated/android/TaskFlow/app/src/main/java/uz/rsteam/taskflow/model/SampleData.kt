package uz.rsteam.taskflow.model

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Star
import androidx.compose.ui.graphics.Color
import java.time.LocalDate
import java.time.LocalDateTime

object SampleData {
    val users = listOf(
        User("u1", "Amina Patel", "Amina", "amina@taskflow.app"),
        User("u2", "Jonas Reed", "Jonas", "jonas@taskflow.app"),
        User("u3", "Mika Chen", "Mika", "mika@taskflow.app")
    )

    val projects = listOf(
        Project("p1", "Product Launch", Color(0xFF5B4FE8), Icons.Outlined.Star, 3),
        Project("p2", "Website Refresh", Color(0xFF3B82D4), Icons.Outlined.Folder, 2),
        Project("p3", "Sprint Rituals", Color(0xFF2D9D5E), Icons.Outlined.CheckCircle, 2)
    )

    fun tasks(currentUser: User): List<Task> = listOf(
        Task(
            id = "t1",
            title = "Finalize launch checklist",
            description = "Confirm release notes, QA sign-off, and staged rollout timing.",
            status = TaskStatus.InProgress,
            priority = Priority.High,
            dueDate = LocalDate.now(),
            projectId = "p1",
            tags = listOf("launch", "ops"),
            createdAt = LocalDateTime.now().minusDays(4),
            updatedAt = LocalDateTime.now().minusHours(2),
            assignee = currentUser,
            attachment = MediaAttachment(
                source = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                mediaType = "video",
                title = "Launch teaser draft"
            )
        ),
        Task(
            id = "t2",
            title = "Draft homepage copy",
            description = "Need a stronger value proposition and one proof block for social trust.",
            status = TaskStatus.Todo,
            priority = Priority.Medium,
            dueDate = LocalDate.now().plusDays(2),
            projectId = "p2",
            tags = listOf("copy", "marketing"),
            createdAt = LocalDateTime.now().minusDays(2),
            updatedAt = LocalDateTime.now().minusHours(10),
            assignee = users[1]
        )
    )
}
