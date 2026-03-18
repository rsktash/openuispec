package com.social.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.arkivanov.decompose.defaultComponentContext
import com.social.app.data.preferences.AppPreferences
import com.social.app.ui.MainShell
import com.social.app.ui.navigation.RootComponent
import com.social.app.ui.theme.SocialAppTheme

class MainActivity : ComponentActivity() {
    private lateinit var root: RootComponent

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val appContainer = (application as SocialAppApplication).appContainer
        root = appContainer.createRootComponent(defaultComponentContext())
        handleIntent(intent)

        enableEdgeToEdge()
        setContent {
            val preferences by appContainer.preferencesRepository.preferences.collectAsState(initial = AppPreferences())

            SocialAppTheme(
                themeMode = preferences.themeMode,
            ) {
                MainShell(
                    root = root,
                    preferencesRepository = appContainer.preferencesRepository,
                    storeFactory = appContainer.storeFactory,
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val data = intent?.data ?: return
        val pathSegments = data.pathSegments

        when (data.host) {
            "home" -> root.onHomeTabClicked()
            "discover" -> root.onDiscoverTabClicked()
            "notifications" -> root.onNotificationsTabClicked()
            "messages" -> root.onMessagesTabClicked()
            "profile" -> root.onProfileTabClicked()
            "settings" -> root.onSettingsClicked()
            "create" -> root.onCreatePostClicked()
            "edit-profile" -> {
                root.onProfileTabClicked()
                root.onEditProfileClicked()
            }
            "post" -> pathSegments.firstOrNull()?.let(root::onPostClicked)
            "user" -> pathSegments.firstOrNull()?.let(root::onUserClicked)
            "chat" -> {
                root.onMessagesTabClicked()
                pathSegments.firstOrNull()?.let(root::onConversationClicked)
            }
            "search" -> {
                val query = data.getQueryParameter("query")
                if (!query.isNullOrBlank()) {
                    root.onSearchClicked(query)
                }
            }
        }
    }
}
