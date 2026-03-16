package com.social.app.ui.screens

import com.arkivanov.mvikotlin.core.store.Reducer
import com.arkivanov.mvikotlin.core.store.Store
import com.arkivanov.mvikotlin.core.store.StoreFactory
import com.arkivanov.mvikotlin.core.store.SimpleBootstrapper
import com.arkivanov.mvikotlin.extensions.coroutines.CoroutineExecutor
import com.social.app.data.preferences.AppPreferences
import com.social.app.data.preferences.PreferencesRepository
import com.social.app.data.preferences.ThemeMode
import kotlinx.coroutines.launch

interface SettingsStore : Store<SettingsStore.Intent, SettingsStore.State, Nothing> {
    sealed interface Intent {
        data class SelectTheme(val themeMode: ThemeMode) : Intent

        data class SetPushNotifications(val enabled: Boolean) : Intent

        data class SetMessagePreviews(val enabled: Boolean) : Intent

        data class SetAutoTranslate(val enabled: Boolean) : Intent
    }

    data class State(
        val preferences: AppPreferences = AppPreferences(),
    )
}

class SettingsStoreFactory(
    private val storeFactory: StoreFactory,
    private val preferencesRepository: PreferencesRepository,
) {
    fun create(): SettingsStore =
        object : SettingsStore,
            Store<SettingsStore.Intent, SettingsStore.State, Nothing> by storeFactory.create(
                name = "SettingsStore",
                initialState = SettingsStore.State(),
                bootstrapper = SimpleBootstrapper(Action.ObservePreferences),
                executorFactory = ::ExecutorImpl,
                reducer = ReducerImpl,
            ) {}

    private sealed interface Action {
        data object ObservePreferences : Action
    }

    private sealed interface Message {
        data class PreferencesLoaded(val preferences: AppPreferences) : Message
    }

    private inner class ExecutorImpl :
        CoroutineExecutor<SettingsStore.Intent, Action, SettingsStore.State, Message, Nothing>() {
        override fun executeAction(action: Action) {
            when (action) {
                Action.ObservePreferences ->
                    scope.launch {
                        preferencesRepository.preferences.collect { preferences ->
                            dispatch(Message.PreferencesLoaded(preferences))
                        }
                    }
            }
        }

        override fun executeIntent(intent: SettingsStore.Intent) {
            when (intent) {
                is SettingsStore.Intent.SelectTheme ->
                    scope.launch {
                        preferencesRepository.updateThemeMode(intent.themeMode)
                    }

                is SettingsStore.Intent.SetPushNotifications ->
                    scope.launch {
                        preferencesRepository.updatePushNotifications(intent.enabled)
                    }

                is SettingsStore.Intent.SetMessagePreviews ->
                    scope.launch {
                        preferencesRepository.updateMessagePreviews(intent.enabled)
                    }

                is SettingsStore.Intent.SetAutoTranslate ->
                    scope.launch {
                        preferencesRepository.updateAutoTranslate(intent.enabled)
                    }
            }
        }
    }

    private object ReducerImpl : Reducer<SettingsStore.State, Message> {
        override fun SettingsStore.State.reduce(msg: Message): SettingsStore.State =
            when (msg) {
                is Message.PreferencesLoaded -> copy(preferences = msg.preferences)
            }
    }
}
