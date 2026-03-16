package com.social.app.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
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
import com.social.app.ui.components.ContractChipRow
import com.social.app.ui.components.ContractListCard
import com.social.app.ui.components.ContractSectionHeader
import com.social.app.ui.components.ContractTextField
import com.social.app.ui.components.CreatorSuggestionCard
import com.social.app.ui.theme.Spacing

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun DiscoverScreen(
    onUserClick: (String) -> Unit,
    onSearchClick: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    val creatorListState = rememberLazyListState()

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(stringResource(R.string.nav_discover)) },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(bottom = Spacing.LG)
        ) {
            item {
                ContractTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier
                        .padding(Spacing.MD),
                    label = stringResource(R.string.discover_search_placeholder),
                    placeholder = stringResource(R.string.discover_search_placeholder),
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    trailingAction = {
                        IconButton(onClick = { onSearchClick(searchQuery) }) {
                            Icon(Icons.Default.Search, contentDescription = null)
                        }
                    },
                )
            }

            item {
                ContractSectionHeader(stringResource(R.string.discover_trending))
            }

            items(MockData.trends) { trend ->
                ContractListCard(
                    title = trend.label,
                    subtitle = trend.postCount.toString(),
                    modifier = Modifier.padding(horizontal = Spacing.MD, vertical = Spacing.XS),
                    onClick = { onSearchClick(trend.label) },
                )
            }

            item {
                ContractSectionHeader(stringResource(R.string.discover_popular_tags))
            }

            item {
                ContractChipRow(
                    options =
                        MockData.trends.map { trend ->
                            ChipOption(
                                value = trend.id,
                                label = "#${trend.label}",
                            )
                        },
                    selectedValue = "",
                    onSelect = { option -> onSearchClick(option.label.removePrefix("#")) },
                )
            }

            item {
                ContractSectionHeader(stringResource(R.string.discover_suggested_creators))
            }

            item {
                LazyRow(
                    state = creatorListState,
                    flingBehavior = rememberSnapFlingBehavior(lazyListState = creatorListState),
                    contentPadding = PaddingValues(horizontal = Spacing.MD),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.SM),
                    modifier = Modifier.padding(bottom = Spacing.LG),
                ) {
                    items(MockData.users.filter { it.id != "user_me" }) { user ->
                        CreatorSuggestionCard(
                            user = user,
                            onClick = { onUserClick(user.id) },
                        )
                    }
                }
            }
        }
    }
}
