package com.social.app.data

import com.social.app.model.*

object MockData {
    val users = listOf(
        User(
            id = "user_me",
            handle = "rustam",
            displayName = "Rustam Abdurahmonov",
            avatarUrl = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80",
            bio = "Designing interface systems that feel editorial, human, and alive.",
            followers = 1240,
            following = 184
        ),
        User(
            id = "u_9921",
            handle = "elara_vox",
            displayName = "Elara Vance",
            avatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
            bio = "Digital Architect | Exploring the intersection of AR and urban spaces 🏙️",
            followers = 12400,
            following = 842,
            isFollowed = true
        ),
        User(
            id = "u_4432",
            handle = "kai_zen",
            displayName = "Kai Nakamura",
            avatarUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
            bio = "Sustainable tech & minimalist living. 🌿 Tokyo -> Berlin",
            followers = 3100,
            following = 1100
        )
    )

    val posts = listOf(
        Post(
            id = "p_77102",
            authorId = "u_9921",
            authorName = "Elara Vance",
            authorHandle = "elara_vox",
            authorAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
            body = "The new Neo-Tokyo district looks incredible in the morning light. The AR overlays are finally syncing perfectly with the physical architecture. #FutureCity #DigitalTwin #2026",
            mediaUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80",
            likeCount = 1432,
            commentCount = 42,
            timestamp = "4 hours ago",
            liked = true
        ),
        Post(
            id = "p_77103",
            authorId = "u_4432",
            authorName = "Kai Nakamura",
            authorHandle = "kai_zen",
            authorAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
            body = "Workspace evolution. Keeping it clean and focused this year.",
            mediaUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1080&q=80",
            likeCount = 890,
            commentCount = 15,
            timestamp = "9 hours ago"
        ),
        Post(
            id = "p_1",
            authorId = "user_me",
            authorName = "Rustam Abdurahmonov",
            authorHandle = "rustam",
            authorAvatar = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80",
            body = "Spent the morning photographing a cafe before it opened. The cups were already warm, the chairs still slightly crooked. Those in-between moments always feel the most honest.",
            mediaUrl = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
            likeCount = 243,
            commentCount = 12,
            timestamp = "1 day ago"
        )
    )

    val stories = listOf(
        Story(id = "s_1", authorId = "u_9921", authorName = "Elara Vance", previewUrl = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=720&q=80"),
        Story(id = "s_2", authorId = "u_4432", authorName = "Kai Nakamura", previewUrl = "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=720&q=80"),
        Story(id = "s_3", authorId = "user_me", authorName = "Rustam", previewUrl = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80")
    )

    val trends = listOf(
        Trend(id = "t_1", label = "Editorial UI", postCount = 8420),
        Trend(id = "t_2", label = "Warm Brutalism", postCount = 4135),
        Trend(id = "t_3", label = "Motion Details", postCount = 2940),
        Trend(id = "t_4", label = "Design Systems", postCount = 8677)
    )

    val notifications = listOf(
        Notification(id = "n_1", type = "like", actorName = "Elara Vance", actorAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80", message = "liked your post", timestamp = "34m ago"),
        Notification(id = "n_2", type = "comment", actorName = "Kai Nakamura", actorAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80", message = "commented on your post", timestamp = "7h ago"),
        Notification(id = "n_3", type = "follow", actorName = "Elara Vance", actorAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80", message = "started following you", timestamp = "1d ago")
    )
}

data class Trend(val id: String, val label: String, val postCount: Int)
data class Notification(val id: String, val type: String, val actorName: String, val actorAvatar: String?, val message: String, val timestamp: String)
