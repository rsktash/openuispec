package com.social.app.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map

private val Context.socialAppDataStore: DataStore<Preferences> by preferencesDataStore(name = "social_app_preferences")

class DataStorePreferencesRepository(
    private val context: Context,
) : PreferencesRepository {
    override val preferences: Flow<AppPreferences> =
        context.socialAppDataStore.data
            .catch { exception ->
                if (exception is IOException) {
                    emit(emptyPreferences())
                } else {
                    throw exception
                }
            }.map { storedPreferences ->
                AppPreferences(
                    themeMode = ThemeMode.fromStorageValue(storedPreferences[Keys.ThemeMode]),
                    pushNotifications = storedPreferences[Keys.PushNotifications] ?: true,
                    messagePreviews = storedPreferences[Keys.MessagePreviews] ?: true,
                    autoTranslate = storedPreferences[Keys.AutoTranslate] ?: false,
                )
            }

    override suspend fun updateThemeMode(themeMode: ThemeMode) {
        context.socialAppDataStore.edit { storedPreferences ->
            storedPreferences[Keys.ThemeMode] = themeMode.storageValue
        }
    }

    override suspend fun updatePushNotifications(enabled: Boolean) {
        context.socialAppDataStore.edit { storedPreferences ->
            storedPreferences[Keys.PushNotifications] = enabled
        }
    }

    override suspend fun updateMessagePreviews(enabled: Boolean) {
        context.socialAppDataStore.edit { storedPreferences ->
            storedPreferences[Keys.MessagePreviews] = enabled
        }
    }

    override suspend fun updateAutoTranslate(enabled: Boolean) {
        context.socialAppDataStore.edit { storedPreferences ->
            storedPreferences[Keys.AutoTranslate] = enabled
        }
    }

    private object Keys {
        val ThemeMode = stringPreferencesKey("theme_mode")
        val PushNotifications = booleanPreferencesKey("push_notifications")
        val MessagePreviews = booleanPreferencesKey("message_previews")
        val AutoTranslate = booleanPreferencesKey("auto_translate")
    }
}
