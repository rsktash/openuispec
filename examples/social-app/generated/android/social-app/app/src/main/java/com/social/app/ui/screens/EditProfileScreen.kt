package com.social.app.ui.screens
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.social.app.R
import com.social.app.data.MockData
import com.social.app.ui.components.ActionTriggerButton
import com.social.app.ui.components.ActionTriggerVariant
import com.social.app.ui.components.ContractSnackbarHost
import com.social.app.ui.components.ContractTextField
import com.social.app.ui.theme.Shapes
import com.social.app.ui.theme.Spacing
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    onBackClick: () -> Unit
) {
    val user = MockData.users.find { it.id == "user_me" } ?: MockData.users[0]

    var displayName by remember { mutableStateOf(user.displayName) }
    var handle by remember { mutableStateOf(user.handle) }
    var bio by remember { mutableStateOf(user.bio ?: "") }
    var website by remember { mutableStateOf("https://rustam.design") }
    val savedMessage = stringResource(R.string.edit_profile_saved)
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    Scaffold(
        snackbarHost = {
            ContractSnackbarHost(hostState = snackbarHostState)
        },
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.profile_edit_button)) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(Spacing.MD),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(Spacing.MD),
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth(),
                shape = Shapes.CardShape,
                color = MaterialTheme.colorScheme.surfaceVariant,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(Spacing.LG),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(Spacing.SM),
                ) {
                    Box(
                        modifier = Modifier.size(120.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        AsyncImage(
                            model = user.avatarUrl,
                            contentDescription = user.displayName,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop,
                        )
                        Surface(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .size(32.dp),
                            shape = Shapes.RoundedCapPrimary,
                            color = MaterialTheme.colorScheme.primary,
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.CameraAlt,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onPrimary,
                                )
                            }
                        }
                    }
                    Text(
                        text = stringResource(R.string.edit_profile_avatar),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            ContractTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = stringResource(R.string.edit_profile_display_name),
            )
            ContractTextField(
                value = handle,
                onValueChange = { handle = it },
                label = stringResource(R.string.edit_profile_handle),
            )
            ContractTextField(
                value = bio,
                onValueChange = { bio = it.take(160) },
                label = stringResource(R.string.edit_profile_bio),
                singleLine = false,
                maxLines = 5,
            )
            ContractTextField(
                value = website,
                onValueChange = { website = it },
                label = stringResource(R.string.edit_profile_website),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            )

            ActionTriggerButton(
                text = stringResource(R.string.edit_profile_save),
                onClick = {
                    scope.launch {
                        snackbarHostState.currentSnackbarData?.dismiss()
                        snackbarHostState.showSnackbar(message = savedMessage)
                    }
                    scope.launch {
                        delay(3000)
                        snackbarHostState.currentSnackbarData?.dismiss()
                        onBackClick()
                    }
                },
                variant = ActionTriggerVariant.Primary,
                fullWidth = true,
            )
        }
    }
}
