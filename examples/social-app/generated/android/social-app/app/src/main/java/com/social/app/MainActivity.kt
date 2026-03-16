package com.social.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.arkivanov.decompose.defaultComponentContext
import com.social.app.data.preferences.AppPreferences
import com.social.app.ui.MainShell
import com.social.app.ui.theme.SocialAppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val appContainer = (application as SocialAppApplication).appContainer
        val root = appContainer.createRootComponent(defaultComponentContext())

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
}
