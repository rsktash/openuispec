package com.social.app.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.res.stringResource
import com.social.app.R
import com.social.app.data.MockData
import com.social.app.ui.components.ActionTriggerVariant
import com.social.app.ui.components.ContractListCard
import com.social.app.ui.components.ContractSectionHeader
import com.social.app.ui.components.PostItem
import com.social.app.ui.components.ProfileHeroCard
import com.social.app.ui.theme.Spacing

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserProfileScreen(
    userId: String,
    onBackClick: () -> Unit,
    onPostClick: (String) -> Unit
) {
    val user = MockData.users.find { it.id == userId } ?: MockData.users[1]
    val userPosts = MockData.posts.filter { it.authorId == user.id }
    var isFollowing by remember(user.id) { mutableStateOf(user.isFollowed) }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = { Text(user.displayName) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            item {
                ProfileHeroCard(
                    title = user.displayName,
                    subtitle = "@${user.handle}",
                    body = user.bio,
                    avatarUrl = user.avatarUrl,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(Spacing.MD),
                    actionLabel =
                        if (isFollowing) {
                            stringResource(R.string.profile_following)
                        } else {
                            stringResource(R.string.profile_follow_button)
                        },
                    actionVariant = if (isFollowing) ActionTriggerVariant.Secondary else ActionTriggerVariant.Primary,
                    onActionClick = { isFollowing = !isFollowing },
                )
            }

            item {
                ContractSectionHeader(stringResource(R.string.profile_posts_header))
            }

            if (userPosts.isEmpty()) {
                item {
                    Box(
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .padding(horizontal = Spacing.MD, vertical = Spacing.SM),
                        contentAlignment = Alignment.Center,
                    ) {
                        ContractListCard(
                            title = stringResource(R.string.profile_no_posts_user),
                        )
                    }
                }
            } else {
                items(userPosts) { post ->
                    PostItem(
                        authorName = post.authorName,
                        authorHandle = post.authorHandle,
                        authorAvatar = post.authorAvatar,
                        body = post.body,
                        likeCount = post.likeCount,
                        commentCount = post.commentCount,
                        timestamp = post.timestamp,
                        mediaUrl = post.mediaUrl,
                        onLikeClick = {},
                        onAuthorClick = {},
                        onCommentClick = { onPostClick(post.id) },
                    )
                }
            }
        }
    }
}
