package com.social.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.social.app.R
import com.social.app.data.MockData
import com.social.app.ui.components.ChipOption
import com.social.app.ui.components.CompactResultRow
import com.social.app.ui.components.ContractChipRow
import com.social.app.ui.components.ContractTextField
import com.social.app.ui.components.PostItem
import com.social.app.ui.theme.Spacing

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchResultsScreen(
    query: String,
    initialTab: String = "posts",
    onBackClick: () -> Unit,
    onPostClick: (String) -> Unit,
    onUserClick: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf(query) }
    var activeTab by remember { mutableStateOf(initialTab) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.search_placeholder)) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            verticalArrangement = Arrangement.spacedBy(Spacing.SM),
        ) {
            item {
                ContractTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.padding(horizontal = Spacing.MD, vertical = Spacing.SM),
                    label = stringResource(R.string.search_placeholder),
                    placeholder = stringResource(R.string.search_placeholder),
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                )
            }

            item {
                ContractChipRow(
                    options =
                        listOf(
                            ChipOption("posts", stringResource(R.string.search_tab_posts)),
                            ChipOption("people", stringResource(R.string.search_tab_people)),
                            ChipOption("tags", stringResource(R.string.search_tab_tags)),
                        ),
                    selectedValue = activeTab,
                    onSelect = { activeTab = it.value },
                )
            }

            when (activeTab) {
                "posts" -> {
                    if (MockData.posts.isEmpty()) {
                        item {
                            Text(
                                text = stringResource(R.string.search_no_results),
                                modifier = Modifier.padding(horizontal = Spacing.MD, vertical = Spacing.XL),
                            )
                        }
                    } else {
                        items(MockData.posts) { post ->
                            PostItem(
                                authorName = post.authorName,
                                authorHandle = post.authorHandle,
                                authorAvatar = post.authorAvatar,
                                body = post.body,
                                likeCount = post.likeCount,
                                commentCount = post.commentCount,
                                timestamp = post.timestamp,
                                mediaUrl = post.mediaUrl,
                                onClick = { onPostClick(post.id) },
                                onLikeClick = {},
                                onCommentClick = { onPostClick(post.id) },
                                onAuthorClick = { onUserClick(post.authorId) }
                            )
                        }
                    }
                }
                "people" -> {
                    val people = MockData.users
                    if (people.isEmpty()) {
                        item {
                            Text(
                                text = stringResource(R.string.search_no_results),
                                modifier = Modifier.padding(horizontal = Spacing.MD, vertical = Spacing.XL),
                            )
                        }
                    } else {
                        items(people) { user ->
                            val linkedPostId = MockData.posts.find { it.authorId == user.id }?.id ?: MockData.posts.firstOrNull()?.id
                            CompactResultRow(
                                title = user.displayName,
                                subtitle = "@${user.handle}",
                                avatarUrl = user.avatarUrl,
                                onClick = { linkedPostId?.let(onPostClick) },
                            )
                        }
                    }
                }
                "tags" -> {
                    val tags = MockData.trends
                    if (tags.isEmpty()) {
                        item {
                            Text(
                                text = stringResource(R.string.search_no_results),
                                modifier = Modifier.padding(horizontal = Spacing.MD, vertical = Spacing.XL),
                            )
                        }
                    } else {
                        items(tags) { trend ->
                            val linkedPostId = MockData.posts.firstOrNull()?.id
                            CompactResultRow(
                                title = "#${trend.label}",
                                subtitle = trend.postCount.toString(),
                                avatarUrl = null,
                                onClick = { linkedPostId?.let(onPostClick) },
                            )
                        }
                    }
                }
            }
        }
    }
}
