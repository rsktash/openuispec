package com.social.app.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import com.social.app.R
import com.social.app.data.MockData
import com.social.app.ui.components.ChipOption
import com.social.app.ui.components.ContractChipRow
import com.social.app.ui.components.ContractListCard
import com.social.app.ui.components.PostItem
import com.social.app.ui.components.StoryItem
import com.social.app.ui.theme.Spacing
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.map

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun HomeFeedScreen(
    onPostClick: (String) -> Unit,
    onUserClick: (String) -> Unit,
) {
    var selectedFilter by remember { mutableStateOf("all") }
    val storyListState = rememberLazyListState()
    val feedListState = rememberLazyListState()
    val filteredPosts =
        remember(selectedFilter) {
            when (selectedFilter) {
                "following" -> MockData.posts.filter { it.authorId != "user_me" }
                "popular" -> MockData.posts.filter { it.likeCount >= 1000 }
                else -> MockData.posts
            }
        }
    var visiblePostCount by remember(selectedFilter) { mutableIntStateOf(minOf(2, filteredPosts.size)) }

    LaunchedEffect(selectedFilter, filteredPosts.size) {
        visiblePostCount = minOf(2, filteredPosts.size)
    }

    LaunchedEffect(feedListState, filteredPosts.size, visiblePostCount) {
        snapshotFlow { feedListState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: -1 }
            .map { lastVisibleIndex -> lastVisibleIndex >= feedListState.layoutInfo.totalItemsCount - 2 }
            .distinctUntilChanged()
            .filter { it }
            .collect {
                if (visiblePostCount < filteredPosts.size) {
                    visiblePostCount = minOf(visiblePostCount + 1, filteredPosts.size)
                }
            }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(stringResource(R.string.nav_home)) },
                colors =
                    TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
            )
        },
    ) { padding ->
        LazyColumn(
            state = feedListState,
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(padding),
            contentPadding = PaddingValues(bottom = Spacing.LG),
        ) {
            item {
                LazyRow(
                    state = storyListState,
                    flingBehavior = rememberSnapFlingBehavior(lazyListState = storyListState),
                    contentPadding = PaddingValues(horizontal = Spacing.MD),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.SM),
                    modifier = Modifier.padding(vertical = Spacing.MD),
                ) {
                    items(MockData.stories) { story ->
                        val linkedPostId = MockData.posts.find { it.authorId == story.authorId }?.id ?: MockData.posts.first().id
                        StoryItem(
                            name = story.authorName,
                            imageUrl = story.previewUrl,
                            onClick = { onPostClick(linkedPostId) },
                        )
                    }
                }
            }

            item {
                ContractChipRow(
                    options =
                        listOf(
                            ChipOption("all", stringResource(R.string.home_filter_all)),
                            ChipOption("following", stringResource(R.string.home_filter_following)),
                            ChipOption("popular", stringResource(R.string.home_filter_popular)),
                        ),
                    selectedValue = selectedFilter,
                    onSelect = { selectedFilter = it.value },
                )
                Spacer(modifier = Modifier.height(Spacing.MD))
            }

            if (filteredPosts.isEmpty()) {
                item {
                    ContractListCard(
                        title = stringResource(R.string.home_empty_feed),
                        modifier = Modifier.padding(horizontal = Spacing.MD),
                    )
                }
            } else {
                items(filteredPosts.take(visiblePostCount), key = { it.id }) { post ->
                    PostItem(
                        authorName = post.authorName,
                        authorHandle = post.authorHandle,
                        authorAvatar = post.authorAvatar,
                        body = post.body,
                        likeCount = post.likeCount,
                        commentCount = post.commentCount,
                        timestamp = post.timestamp,
                        mediaUrl = post.mediaUrl,
                        onAuthorClick = { onUserClick(post.authorId) },
                        onLikeClick = {},
                        onCommentClick = { onPostClick(post.id) },
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun HomeFeedScreenPreview() {
    MaterialTheme {
        HomeFeedScreen(
            onPostClick = {},
            onUserClick = {},
        )
    }
}
