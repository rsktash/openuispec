package com.social.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.social.app.R
import com.social.app.data.MockData
import com.social.app.ui.components.ContractListCard
import com.social.app.ui.components.ContractTextField
import com.social.app.ui.theme.Shapes
import com.social.app.ui.theme.Spacing

private data class ChatMessage(
    val body: String,
    val timestamp: String,
    val isMine: Boolean,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatDetailScreen(
    conversationId: String,
    onBackClick: () -> Unit,
) {
    var messageText by remember { mutableStateOf("") }
    val recipient = MockData.users.find { it.id == conversationId } ?: MockData.users[1]
    val messages =
        remember(conversationId) {
            if (conversationId == "u_4432") {
                emptyList()
            } else {
                listOf(
                    ChatMessage("Hey! Did you see the new Neo-Tokyo district?", "09:18", false),
                    ChatMessage("Yes. The AR overlays look much cleaner now.", "09:20", true),
                    ChatMessage("I’m heading there tomorrow for some shots.", "09:22", false),
                    ChatMessage("Send them over when you do.", "09:24", true),
                )
            }
        }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Spacing.SM),
                    ) {
                        Surface(
                            modifier = Modifier.size(36.dp),
                            shape = Shapes.RoundedCapPrimary,
                            color = MaterialTheme.colorScheme.surfaceVariant,
                        ) {
                            if (recipient.avatarUrl != null) {
                                AsyncImage(
                                    model = recipient.avatarUrl,
                                    contentDescription = recipient.displayName,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop,
                                )
                            }
                        }
                        androidx.compose.foundation.layout.Column {
                            Text(recipient.displayName, style = MaterialTheme.typography.headlineSmall)
                            Text(
                                text = "@${recipient.handle}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        bottomBar = {
            Surface(
                tonalElevation = 2.dp,
                modifier = Modifier.imePadding(),
            ) {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(Spacing.MD),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    ContractTextField(
                        value = messageText,
                        onValueChange = { messageText = it },
                        modifier = Modifier.weight(1f),
                        label = stringResource(R.string.chat_message_placeholder),
                        placeholder = stringResource(R.string.chat_message_placeholder),
                        singleLine = false,
                        maxLines = 4,
                        trailingAction = {
                            IconButton(
                                onClick = { messageText = "" },
                                enabled = messageText.isNotBlank(),
                                colors =
                                    IconButtonDefaults.iconButtonColors(
                                        contentColor = MaterialTheme.colorScheme.primary,
                                    ),
                            ) {
                                Icon(Icons.Default.Send, contentDescription = null)
                            }
                        },
                    )
                }
            }
        },
    ) { padding ->
        LazyColumn(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(padding),
            contentPadding = PaddingValues(Spacing.MD),
            verticalArrangement = Arrangement.spacedBy(Spacing.XS),
        ) {
            if (messages.isEmpty()) {
                item {
                    ContractListCard(
                        title = stringResource(R.string.chat_empty_thread),
                    )
                }
            } else {
                items(messages) { message ->
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = if (message.isMine) Alignment.CenterEnd else Alignment.CenterStart,
                    ) {
                        Surface(
                            color =
                                if (message.isMine) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.surfaceVariant
                                },
                            contentColor =
                                if (message.isMine) {
                                    MaterialTheme.colorScheme.onPrimary
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                },
                            shape = if (message.isMine) Shapes.RoundedCapPrimary else Shapes.RoundedCapSecondary,
                            modifier = Modifier.widthIn(max = 280.dp),
                        ) {
                            androidx.compose.foundation.layout.Column(
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                                verticalArrangement = Arrangement.spacedBy(Spacing.XS),
                            ) {
                                Text(
                                    text = message.body,
                                    style = MaterialTheme.typography.bodyLarge,
                                )
                                Text(
                                    text = message.timestamp,
                                    style = MaterialTheme.typography.labelSmall,
                                    color =
                                        if (message.isMine) {
                                            MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                                        } else {
                                            MaterialTheme.colorScheme.onSurfaceVariant
                                        },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
