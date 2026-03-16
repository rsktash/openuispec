package com.social.app.model

data class User(
    val id: String,
    val handle: String,
    val displayName: String,
    val avatarUrl: String? = null,
    val bio: String? = null,
    val followers: Int = 0,
    val following: Int = 0,
    val isFollowed: Boolean = false
)

data class Post(
    val id: String,
    val authorId: String,
    val authorName: String,
    val authorHandle: String,
    val authorAvatar: String? = null,
    val body: String,
    val mediaUrl: String? = null,
    val likeCount: Int = 0,
    val commentCount: Int = 0,
    val timestamp: String,
    val liked: Boolean = false
)

data class Story(
    val id: String,
    val authorId: String,
    val authorName: String,
    val authorAvatar: String? = null,
    val previewUrl: String? = null
)
