package com.social.app

import android.content.Context
import com.arkivanov.decompose.ComponentContext
import com.arkivanov.mvikotlin.core.store.StoreFactory
import com.social.app.data.preferences.DataStorePreferencesRepository
import com.social.app.data.preferences.PreferencesRepository
import com.social.app.ui.navigation.DefaultRootComponent
import com.social.app.ui.navigation.RootComponent
import com.arkivanov.mvikotlin.main.store.DefaultStoreFactory
import com.arkivanov.mvikotlin.logging.store.LoggingStoreFactory

class AppContainer(
    context: Context,
) {
    val preferencesRepository: PreferencesRepository = DataStorePreferencesRepository(context.applicationContext)
    val storeFactory: StoreFactory = LoggingStoreFactory(DefaultStoreFactory())

    fun createRootComponent(componentContext: ComponentContext): RootComponent = DefaultRootComponent(componentContext)
}
