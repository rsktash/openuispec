package uz.rsteam.taskflow.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import uz.rsteam.taskflow.model.Preferences
import uz.rsteam.taskflow.model.User
import uz.rsteam.taskflow.ui.components.Avatar

@Composable
fun SettingsScreen(
    currentUser: User,
    preferences: Preferences,
    onPreferencesChange: (Preferences) -> Unit,
    onEditProfile: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        ElevatedCard(onClick = onEditProfile) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Avatar(currentUser.name)
                Text(currentUser.name, fontWeight = FontWeight.SemiBold)
                Text(currentUser.email)
            }
        }

        Text("Preferences", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)

        ElevatedCard {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Default priority: ${preferences.defaultPriority.name}")
                Text("Notifications")
                Switch(checked = preferences.notificationsEnabled, onCheckedChange = {
                    onPreferencesChange(preferences.copy(notificationsEnabled = it))
                })
                Text("Reminders")
                Switch(checked = preferences.remindersEnabled, onCheckedChange = {
                    onPreferencesChange(preferences.copy(remindersEnabled = it))
                })
            }
        }
    }
}

@Composable
fun ProfileEditScreen(currentUser: User, onSave: (String, String) -> Unit) {
    val name = remember { mutableStateOf(currentUser.name) }
    val email = remember { mutableStateOf(currentUser.email) }

    Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Edit profile", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        OutlinedTextField(value = name.value, onValueChange = { name.value = it }, label = { Text("Name") })
        OutlinedTextField(value = email.value, onValueChange = { email.value = it }, label = { Text("Email") })
        Button(onClick = { onSave(name.value, email.value) }) { Text("Save") }
    }
}

@Composable
fun CalendarScreen() {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
        Text("Calendar", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("Coming in a future version")
    }
}
