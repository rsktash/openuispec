package com.social.app.ui.navigation

import com.arkivanov.decompose.ComponentContext
import com.arkivanov.decompose.router.stack.*
import com.arkivanov.decompose.value.Value
import kotlinx.serialization.Serializable

interface RootComponent {
    val stack: Value<ChildStack<*, Child>>

    fun onHomeTabClicked()
    fun onDiscoverTabClicked()
    fun onCreatePostClicked()
    fun onNotificationsTabClicked()
    fun onMessagesTabClicked()
    fun onProfileTabClicked()
    fun onBackClicked()
    fun onPostClicked(postId: String)
    fun onUserClicked(userId: String)
    fun onSearchClicked(query: String)
    fun onEditProfileClicked()
    fun onConversationClicked(conversationId: String)
    fun onSettingsClicked()

    sealed class Child {
        class Home(val component: Unit) : Child()
        class Discover(val component: Unit) : Child()
        class CreatePost(val component: Unit) : Child()
        class Notifications(val component: Unit) : Child()
        class MessagesInbox(val component: Unit) : Child()
        class Profile(val component: Unit) : Child()
        class PostDetail(val postId: String) : Child()
        class UserProfile(val userId: String) : Child()
        class SearchResults(val query: String) : Child()
        class EditProfile(val component: Unit) : Child()
        class ChatDetail(val conversationId: String) : Child()
        class Settings(val component: Unit) : Child()
    }
}

class DefaultRootComponent(
    componentContext: ComponentContext
) : RootComponent, ComponentContext by componentContext {

    private val navigation = StackNavigation<Config>()

    override val stack: Value<ChildStack<*, RootComponent.Child>> =
        childStack(
            source = navigation,
            serializer = Config.serializer(),
            initialConfiguration = Config.Home,
            handleBackButton = true,
            childFactory = ::child
        )

    private fun child(config: Config, componentContext: ComponentContext): RootComponent.Child =
        when (config) {
            is Config.Home -> RootComponent.Child.Home(Unit)
            is Config.Discover -> RootComponent.Child.Discover(Unit)
            is Config.CreatePost -> RootComponent.Child.CreatePost(Unit)
            is Config.Notifications -> RootComponent.Child.Notifications(Unit)
            is Config.MessagesInbox -> RootComponent.Child.MessagesInbox(Unit)
            is Config.Profile -> RootComponent.Child.Profile(Unit)
            is Config.PostDetail -> RootComponent.Child.PostDetail(config.postId)
            is Config.UserProfile -> RootComponent.Child.UserProfile(config.userId)
            is Config.SearchResults -> RootComponent.Child.SearchResults(config.query)
            is Config.EditProfile -> RootComponent.Child.EditProfile(Unit)
            is Config.ChatDetail -> RootComponent.Child.ChatDetail(config.conversationId)
            is Config.Settings -> RootComponent.Child.Settings(Unit)
        }

    override fun onHomeTabClicked() = navigation.bringToFront(Config.Home)
    override fun onDiscoverTabClicked() = navigation.bringToFront(Config.Discover)
    override fun onCreatePostClicked() = navigation.push(Config.CreatePost)
    override fun onNotificationsTabClicked() = navigation.bringToFront(Config.Notifications)
    override fun onMessagesTabClicked() = navigation.bringToFront(Config.MessagesInbox)
    override fun onProfileTabClicked() = navigation.bringToFront(Config.Profile)
    override fun onBackClicked() = navigation.pop()
    override fun onPostClicked(postId: String) = navigation.push(Config.PostDetail(postId))
    override fun onUserClicked(userId: String) = navigation.push(Config.UserProfile(userId))
    override fun onSearchClicked(query: String) = navigation.push(Config.SearchResults(query))
    override fun onEditProfileClicked() = navigation.push(Config.EditProfile)
    override fun onConversationClicked(conversationId: String) = navigation.push(Config.ChatDetail(conversationId))
    override fun onSettingsClicked() = navigation.push(Config.Settings)

    @Serializable
    private sealed interface Config {
        @Serializable
        data object Home : Config
        @Serializable
        data object Discover : Config
        @Serializable
        data object CreatePost : Config
        @Serializable
        data object Notifications : Config
        @Serializable
        data object MessagesInbox : Config
        @Serializable
        data object Profile : Config
        @Serializable
        data class PostDetail(val postId: String) : Config
        @Serializable
        data class UserProfile(val userId: String) : Config
        @Serializable
        data class SearchResults(val query: String) : Config
        @Serializable
        data object EditProfile : Config
        @Serializable
        data class ChatDetail(val conversationId: String) : Config
        @Serializable
        data object Settings : Config
    }
}
