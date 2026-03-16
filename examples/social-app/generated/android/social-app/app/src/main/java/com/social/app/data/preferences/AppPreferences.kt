package com.social.app.data.preferences

enum class ThemeMode(val storageValue: String) {
    System("system"),
    Light("light"),
    Dark("dark");

    companion object {
        fun fromStorageValue(value: String?): ThemeMode =
            entries.firstOrNull { it.storageValue == value } ?: System
    }
}

data class AppPreferences(
    val themeMode: ThemeMode = ThemeMode.System,
    val pushNotifications: Boolean = true,
    val messagePreviews: Boolean = true,
    val autoTranslate: Boolean = false,
)
