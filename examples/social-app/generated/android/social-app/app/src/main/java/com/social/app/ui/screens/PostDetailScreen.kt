package com.social.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
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
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.social.app.R
import com.social.app.data.MockData
import com.social.app.ui.components.ActionTriggerButton
import com.social.app.ui.components.ActionTriggerVariant
import com.social.app.ui.components.ContractListCard
import com.social.app.ui.components.ContractSectionHeader
import com.social.app.ui.components.ContractSnackbarHost
import com.social.app.ui.components.ContractTextField
import com.social.app.ui.theme.Shapes
import com.social.app.ui.theme.Spacing
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private data class CommentItem(
    val authorId: String,
    val authorName: String,
    val authorAvatar: String?,
    val body: String,
    val timestamp: String,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostDetailScreen(
    postId: String,
    onBackClick: () -> Unit,
    onUserClick: (String) -> Unit,
) {
    val post = MockData.posts.find { it.id == postId } ?: MockData.posts[0]
    val comments =
        remember(postId) {
            listOf(
                CommentItem(
                    authorId = "u_9921",
                    authorName = "Elara Vance",
                    authorAvatar = MockData.users.find { it.id == "u_9921" }?.avatarUrl,
                    body = "The framing on this is excellent. That early-morning light is doing a lot of work.",
                    timestamp = "18m ago",
                ),
                CommentItem(
                    authorId = "u_4432",
                    authorName = "Kai Nakamura",
                    authorAvatar = MockData.users.find { it.id == "u_4432" }?.avatarUrl,
                    body = "You captured the quiet before the rush really well.",
                    timestamp = "42m ago",
                ),
                CommentItem(
                    authorId = "user_me",
                    authorName = "Rustam Abdurahmonov",
                    authorAvatar = MockData.users.find { it.id == "user_me" }?.avatarUrl,
                    body = "Appreciate it. The empty room was the whole reason I stopped in.",
                    timestamp = "1h ago",
                ),
            )
        }
    var commentText by remember { mutableStateOf("") }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val commentSentLabel = stringResource(R.string.post_comment_sent)

    Scaffold(
        snackbarHost = { ContractSnackbarHost(hostState = snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(post.authorName) },
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
                        value = commentText,
                        onValueChange = { commentText = it },
                        modifier = Modifier.weight(1f),
                        label = stringResource(R.string.post_comment_placeholder),
                        placeholder = stringResource(R.string.post_comment_placeholder),
                        singleLine = false,
                        maxLines = 4,
                        trailingAction = {
                            IconButton(
                                onClick = {
                                    commentText = ""
                                    scope.launch {
                                        snackbarHostState.currentSnackbarData?.dismiss()
                                        snackbarHostState.showSnackbar(message = commentSentLabel)
                                    }
                                    scope.launch {
                                        delay(3000)
                                        snackbarHostState.currentSnackbarData?.dismiss()
                                    }
                                },
                                enabled = commentText.isNotBlank(),
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
            contentPadding = PaddingValues(bottom = Spacing.MD),
            verticalArrangement = Arrangement.spacedBy(Spacing.SM),
        ) {
            item {
                Surface(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = Spacing.MD, vertical = Spacing.SM)
                            .clickable { onUserClick(post.authorId) },
                    shape = Shapes.HeroShape,
                    color = MaterialTheme.colorScheme.surfaceVariant,
                ) {
                    Column(
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .padding(Spacing.LG),
                        verticalArrangement = Arrangement.spacedBy(Spacing.MD),
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(Spacing.SM),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Surface(
                                modifier = Modifier.size(52.dp),
                                shape = Shapes.RoundedCapPrimary,
                                color = MaterialTheme.colorScheme.surface,
                            ) {
                                if (post.authorAvatar != null) {
                                    AsyncImage(
                                        model = post.authorAvatar,
                                        contentDescription = post.authorName,
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop,
                                    )
                                }
                            }
                            Column {
                                Text(post.authorName, style = MaterialTheme.typography.headlineLarge)
                                Text(
                                    text = "@${post.authorHandle}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }

                        Text(
                            text = post.body,
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurface,
                        )

                        if (post.mediaUrl != null) {
                            AsyncImage(
                                model = post.mediaUrl,
                                contentDescription = null,
                                modifier =
                                    Modifier
                                        .fillMaxWidth()
                                        .heightIn(max = 400.dp),
                                contentScale = ContentScale.Crop,
                            )
                        }

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(Spacing.LG),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(Spacing.XS),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(Icons.Outlined.FavoriteBorder, contentDescription = null, modifier = Modifier.size(20.dp))
                                Text(post.likeCount.toString(), style = MaterialTheme.typography.labelLarge)
                            }
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(Spacing.XS),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(Icons.Outlined.ChatBubbleOutline, contentDescription = null, modifier = Modifier.size(20.dp))
                                Text(post.commentCount.toString(), style = MaterialTheme.typography.labelLarge)
                            }
                        }
                    }
                }
            }

            item {
                ActionTriggerButton(
                    text = stringResource(R.string.post_like_action),
                    onClick = {},
                    modifier = Modifier.padding(horizontal = Spacing.MD),
                    variant = ActionTriggerVariant.Secondary,
                    icon = { Icon(Icons.Outlined.FavoriteBorder, contentDescription = null) },
                )
            }

            item {
                ContractSectionHeader(stringResource(R.string.post_comments_header))
            }

            if (comments.isEmpty()) {
                item {
                    ContractListCard(
                        title = stringResource(R.string.post_no_comments),
                        modifier = Modifier.padding(horizontal = Spacing.MD),
                    )
                }
            } else {
                items(comments) { comment ->
                    ContractListCard(
                        title = comment.authorName,
                        body = comment.body,
                        trailing = comment.timestamp,
                        avatarUrl = comment.authorAvatar,
                        modifier = Modifier.padding(horizontal = Spacing.MD),
                        onClick = { onUserClick(comment.authorId) },
                    )
                }
            }
        }
    }
}
