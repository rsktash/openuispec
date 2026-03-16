package com.social.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.arkivanov.decompose.extensions.compose.subscribeAsState
import com.social.app.R
import com.social.app.data.preferences.PreferencesRepository
import com.arkivanov.mvikotlin.core.store.StoreFactory
import com.social.app.data.MockData
import com.social.app.ui.navigation.RootComponent
import com.social.app.ui.screens.ChatDetailScreen
import com.social.app.ui.screens.CreatePostScreen
import com.social.app.ui.screens.DiscoverScreen
import com.social.app.ui.screens.EditProfileScreen
import com.social.app.ui.screens.HomeFeedScreen
import com.social.app.ui.screens.MessagesInboxScreen
import com.social.app.ui.screens.NotificationsScreen
import com.social.app.ui.screens.PostDetailScreen
import com.social.app.ui.screens.ProfileSelfScreen
import com.social.app.ui.screens.SearchResultsScreen
import com.social.app.ui.screens.SettingsScreen
import com.social.app.ui.screens.UserProfileScreen
import com.social.app.ui.components.ContractSnackbarHost
import com.social.app.ui.theme.Shapes
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class MainDestination {
    Home,
    Discover,
    Notifications,
    Profile,
}

private data class NavItem(
    val destination: MainDestination?,
    val labelRes: Int,
    val icon: @Composable () -> Unit,
    val onClick: () -> Unit,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainShell(
    root: RootComponent,
    preferencesRepository: PreferencesRepository,
    storeFactory: StoreFactory,
) {
    val stack by root.stack.subscribeAsState()
    val activeChild = stack.active.instance
    val previousChild = stack.backStack.lastOrNull()?.instance
    val mainChild =
        if (activeChild is RootComponent.Child.CreatePost && previousChild != null) previousChild else activeChild

    val isExpanded = LocalConfiguration.current.screenWidthDp >= 1025
    var unreadCount by remember { mutableIntStateOf(MockData.notifications.size) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val createPostSuccessMessage = stringResource(R.string.create_post_success)
    val activeDestination = activeDestinationFor(mainChild)
    val primaryScreen =
        mainChild is RootComponent.Child.Home ||
            mainChild is RootComponent.Child.Discover ||
            mainChild is RootComponent.Child.Notifications ||
            mainChild is RootComponent.Child.Profile

    val navItems = listOf(
        NavItem(
            destination = MainDestination.Home,
            labelRes = R.string.nav_home,
            icon = { Icon(Icons.Default.Home, contentDescription = null) },
            onClick = root::onHomeTabClicked,
        ),
        NavItem(
            destination = MainDestination.Discover,
            labelRes = R.string.nav_discover,
            icon = { Icon(Icons.Default.Explore, contentDescription = null) },
            onClick = root::onDiscoverTabClicked,
        ),
        NavItem(
            destination = null,
            labelRes = R.string.nav_create,
            icon = { Icon(Icons.Default.AddCircle, contentDescription = null) },
            onClick = root::onCreatePostClicked,
        ),
        NavItem(
            destination = MainDestination.Notifications,
            labelRes = R.string.nav_notifications,
            icon = {
                BadgedBox(
                    badge = {
                        if (unreadCount > 0) {
                            Badge {
                                Text(unreadCount.toString())
                            }
                        }
                    },
                ) {
                    Icon(Icons.Default.Notifications, contentDescription = null)
                }
            },
            onClick = root::onNotificationsTabClicked,
        ),
        NavItem(
            destination = MainDestination.Profile,
            labelRes = R.string.nav_profile,
            icon = { Icon(Icons.Default.Person, contentDescription = null) },
            onClick = root::onProfileTabClicked,
        ),
    )

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        snackbarHost = {
            ContractSnackbarHost(hostState = snackbarHostState)
        },
        bottomBar = {
            if (primaryScreen && !isExpanded) {
                CompactTabBar(
                    items = navItems,
                    activeDestination = activeDestination,
                )
            }
        },
    ) { padding ->
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            if (primaryScreen && isExpanded) {
                ExpandedSidebar(
                    items = navItems,
                    activeDestination = activeDestination,
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .weight(1f),
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.surface,
                ) {
                    RenderChild(
                        child = mainChild,
                        root = root,
                        preferencesRepository = preferencesRepository,
                        storeFactory = storeFactory,
                        onNotificationRead = {
                            unreadCount = (unreadCount - 1).coerceAtLeast(0)
                        },
                    )
                }
            }
        }

        if (activeChild is RootComponent.Child.CreatePost) {
            ModalBottomSheet(
                onDismissRequest = root::onBackClicked,
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                dragHandle = { BottomSheetDefaults.DragHandle() },
                shape = Shapes.SheetShape,
            ) {
                CreatePostScreen(
                    onDismiss = root::onBackClicked,
                    onPublish = { _, _ ->
                        scope.launch {
                            snackbarHostState.currentSnackbarData?.dismiss()
                            snackbarHostState.showSnackbar(message = createPostSuccessMessage)
                        }
                        scope.launch {
                            delay(3000)
                            snackbarHostState.currentSnackbarData?.dismiss()
                        }
                        root.onBackClicked()
                    },
                )
            }
        }
    }
}

@Composable
private fun CompactTabBar(
    items: List<NavItem>,
    activeDestination: MainDestination?,
) {
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        items.forEach { item ->
            NavigationBarItem(
                selected = item.destination != null && item.destination == activeDestination,
                onClick = item.onClick,
                icon = item.icon,
                label = { Text(stringResource(item.labelRes)) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.primary,
                    selectedTextColor = MaterialTheme.colorScheme.primary,
                    indicatorColor = MaterialTheme.colorScheme.surfaceVariant,
                ),
            )
        }
    }
}

@Composable
private fun ExpandedSidebar(
    items: List<NavItem>,
    activeDestination: MainDestination?,
) {
    NavigationRail(
        modifier = Modifier.fillMaxHeight(),
        containerColor = MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .padding(vertical = 16.dp, horizontal = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items.forEach { item ->
                val isActive = item.destination != null && item.destination == activeDestination
                Surface(
                    modifier = Modifier
                        .width(92.dp)
                        .clickable(onClick = item.onClick),
                    shape = Shapes.RoundedCapPrimary,
                    color = if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                    contentColor = if (isActive) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        item.icon()
                        Text(
                            text = stringResource(item.labelRes),
                            style = MaterialTheme.typography.labelSmall,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RenderChild(
    child: RootComponent.Child,
    root: RootComponent,
    preferencesRepository: PreferencesRepository,
    storeFactory: StoreFactory,
    onNotificationRead: (String) -> Unit,
) {
    when (child) {
        is RootComponent.Child.Home -> HomeFeedScreen(
            onPostClick = { postId -> root.onPostClicked(postId) },
            onUserClick = { userId -> root.onUserClicked(userId) },
        )
        is RootComponent.Child.Discover -> DiscoverScreen(
            onUserClick = { userId -> root.onUserClicked(userId) },
            onSearchClick = { query -> root.onSearchClicked(query) },
        )
        is RootComponent.Child.CreatePost -> Unit
        is RootComponent.Child.Notifications -> NotificationsScreen(
            onNotificationRead = onNotificationRead,
        )
        is RootComponent.Child.MessagesInbox -> MessagesInboxScreen(
            onConversationClick = { conversationId -> root.onConversationClicked(conversationId) },
        )
        is RootComponent.Child.Profile -> ProfileSelfScreen(
            onEditProfileClick = root::onEditProfileClicked,
            onPostClick = { postId -> root.onPostClicked(postId) },
            onSettingsClick = root::onSettingsClicked,
        )
        is RootComponent.Child.PostDetail -> PostDetailScreen(
            postId = child.postId,
            onBackClick = root::onBackClicked,
            onUserClick = { userId -> root.onUserClicked(userId) },
        )
        is RootComponent.Child.UserProfile -> UserProfileScreen(
            userId = child.userId,
            onBackClick = root::onBackClicked,
            onPostClick = { postId -> root.onPostClicked(postId) },
        )
        is RootComponent.Child.SearchResults -> SearchResultsScreen(
            query = child.query,
            onBackClick = root::onBackClicked,
            onPostClick = { postId -> root.onPostClicked(postId) },
            onUserClick = { userId -> root.onUserClicked(userId) },
        )
        is RootComponent.Child.EditProfile -> EditProfileScreen(
            onBackClick = root::onBackClicked,
        )
        is RootComponent.Child.ChatDetail -> ChatDetailScreen(
            conversationId = child.conversationId,
            onBackClick = root::onBackClicked,
        )
        is RootComponent.Child.Settings -> SettingsScreen(
            onBackClick = root::onBackClicked,
            onEditProfileClick = root::onEditProfileClicked,
            preferencesRepository = preferencesRepository,
            storeFactory = storeFactory,
        )
    }
}

private fun activeDestinationFor(child: RootComponent.Child): MainDestination? =
    when (child) {
        is RootComponent.Child.Home -> MainDestination.Home
        is RootComponent.Child.Discover -> MainDestination.Discover
        is RootComponent.Child.Notifications -> MainDestination.Notifications
        is RootComponent.Child.Profile -> MainDestination.Profile
        else -> null
    }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlaceholderScreen(title: String, onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                }
            )
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
            Text("This screen is coming soon!", style = MaterialTheme.typography.bodyLarge)
        }
    }
}
