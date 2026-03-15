package uz.rsteam.taskflow.ui.sheets

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import uz.rsteam.taskflow.model.NewProjectDraft
import uz.rsteam.taskflow.model.Priority
import uz.rsteam.taskflow.model.TaskEditorDraft
import uz.rsteam.taskflow.model.User

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskEditorSheet(
    title: String,
    initial: TaskEditorDraft,
    onDismiss: () -> Unit,
    onSubmit: (TaskEditorDraft) -> Unit
) {
    val draft = remember { mutableStateOf(initial) }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title)
            OutlinedTextField(value = draft.value.title, onValueChange = { draft.value = draft.value.copy(title = it) }, label = { Text("Title") })
            OutlinedTextField(value = draft.value.description, onValueChange = { draft.value = draft.value.copy(description = it) }, label = { Text("Description") })
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(onClick = { onSubmit(draft.value) }, modifier = Modifier.weight(1f), enabled = draft.value.title.trim().length >= 3) {
                    Text("Save")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewProjectSheet(onDismiss: () -> Unit, onCreate: (NewProjectDraft) -> Unit) {
    val draft = remember { mutableStateOf(NewProjectDraft()) }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("New project")
            OutlinedTextField(value = draft.value.name, onValueChange = { draft.value = draft.value.copy(name = it) }, label = { Text("Project name") })
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(onClick = { onCreate(draft.value) }, modifier = Modifier.weight(1f), enabled = draft.value.name.isNotBlank()) { Text("Create") }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssignUserSheet(users: List<User>, onDismiss: () -> Unit, onAssign: (User) -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Assign to")
            users.forEach { user ->
                Button(onClick = { onAssign(user) }, modifier = Modifier.fillMaxWidth()) {
                    Text(user.name)
                }
            }
            Button(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) { Text("Cancel") }
        }
    }
}
