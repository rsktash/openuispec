package com.social.app.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.social.app.R
import com.social.app.data.MockData
import com.social.app.ui.components.ContractListCard
import com.social.app.ui.theme.Spacing

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onNotificationRead: (String) -> Unit,
) {
    val unreadIds = remember { mutableStateListOf(*MockData.notifications.map { it.id }.toTypedArray()) }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(stringResource(R.string.nav_notifications)) },
                colors =
                    TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
            )
        },
    ) { padding ->
        if (MockData.notifications.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(text = stringResource(R.string.notifications_empty), style = MaterialTheme.typography.bodyLarge)
            }
        } else {
            LazyColumn(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .padding(padding),
            ) {
                items(MockData.notifications) { notification ->
                    val isUnread = notification.id in unreadIds
                    ContractListCard(
                        title = notification.actorName,
                        subtitle = notification.message,
                        trailing = notification.timestamp,
                        avatarUrl = notification.actorAvatar,
                        modifier = Modifier.padding(horizontal = Spacing.MD, vertical = Spacing.XS),
                        onClick = {
                            if (isUnread) {
                                unreadIds.remove(notification.id)
                                onNotificationRead(notification.id)
                            }
                        },
                    )
                }
            }
        }
    }
}
