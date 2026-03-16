package com.social.app.data.preferences

import kotlinx.coroutines.flow.Flow

interface PreferencesRepository {
    val preferences: Flow<AppPreferences>

    suspend fun updateThemeMode(themeMode: ThemeMode)

    suspend fun updatePushNotifications(enabled: Boolean)

    suspend fun updateMessagePreviews(enabled: Boolean)

    suspend fun updateAutoTranslate(enabled: Boolean)
}
