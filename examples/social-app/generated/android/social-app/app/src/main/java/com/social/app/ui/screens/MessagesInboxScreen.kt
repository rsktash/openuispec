package com.social.app.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.social.app.R
import com.social.app.data.MockData
import com.social.app.ui.components.ContractListCard
import com.social.app.ui.components.ContractTextField
import com.social.app.ui.theme.Spacing

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessagesInboxScreen(
    onConversationClick: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(stringResource(R.string.nav_messages)) },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            item {
                ContractTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier
                        .padding(Spacing.MD),
                    label = stringResource(R.string.messages_search_placeholder),
                    placeholder = stringResource(R.string.messages_search_placeholder),
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                )
            }

            val participants = MockData.users.filter { it.id != "user_me" }
            if (participants.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(Spacing.XL), contentAlignment = Alignment.Center) {
                        Text(stringResource(R.string.messages_empty_inbox), style = MaterialTheme.typography.bodyLarge)
                    }
                }
            } else {
                items(participants) { user ->
                    ContractListCard(
                        title = user.displayName,
                        subtitle = user.bio ?: user.handle,
                        trailing = if (user.id == "u_9921") "1" else null,
                        avatarUrl = user.avatarUrl,
                        modifier = Modifier.padding(horizontal = Spacing.MD, vertical = Spacing.XS),
                        onClick = { onConversationClick(user.id) },
                    )
                }
            }
        }
    }
}
