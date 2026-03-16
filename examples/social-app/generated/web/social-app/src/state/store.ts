import { create } from "zustand";
import type { LocaleCode, ThemePreference } from "../lib/tokens";

export type User = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  website?: string;
  followers: number;
  following: number;
  isFollowed?: boolean;
};

export type Post = {
  id: string;
  authorId: string;
  body: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  liked?: boolean;
  saved?: boolean;
  tags: string[];
  audience: string;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type Story = {
  id: string;
  authorId: string;
  previewUrl?: string;
  active: boolean;
};

export type Trend = {
  id: string;
  label: string;
  postCount: number;
};

export type Tag = {
  id: string;
  name: string;
};

export type Conversation = {
  id: string;
  participantIds: string[];
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  type: string;
  actorId?: string;
  postId?: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type Preferences = {
  theme: ThemePreference;
  pushNotifications: boolean;
  messagePreviews: boolean;
  autoTranslate: boolean;
};

type DialogAction = {
  label: string;
  variant?: "secondary" | "destructive" | "primary";
  onPress: () => void;
};

type DialogState = {
  title: string;
  message: string;
  actions: DialogAction[];
} | null;

type ToastState = {
  message: string;
} | null;

type AppState = {
  locale: LocaleCode;
  currentUserId: string;
  users: User[];
  posts: Post[];
  comments: Comment[];
  stories: Story[];
  trends: Trend[];
  tags: Tag[];
  conversations: Conversation[];
  messages: Message[];
  notifications: NotificationItem[];
  preferences: Preferences;
  toast: ToastState;
  dialog: DialogState;
  setLocale: (locale: LocaleCode) => void;
  setThemePreference: (theme: ThemePreference) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  openDialog: (dialog: Exclude<DialogState, null>) => void;
  closeDialog: () => void;
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  createPost: (input: { body: string; media: string; audience: string }) => string;
  addComment: (postId: string, body: string) => void;
  updateProfile: (input: { displayName: string; handle: string; bio: string; website: string }) => void;
  followUser: (userId: string) => void;
  sendMessage: (conversationId: string, body: string) => void;
  markNotificationRead: (notificationId: string) => void;
  updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  logout: () => void;
};

function minutesAgo(value: number) {
  return new Date(Date.now() - value * 60 * 1000).toISOString();
}

function hoursAgo(value: number) {
  return new Date(Date.now() - value * 60 * 60 * 1000).toISOString();
}

function daysAgo(value: number) {
  return new Date(Date.now() - value * 24 * 60 * 60 * 1000).toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

const seedUsers: User[] = [
  {
    id: "user-me",
    handle: "rustam",
    displayName: "Rustam Abdurahmonov",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80",
    bio: "Designing interface systems that feel editorial, human, and alive.",
    website: "https://example.com",
    followers: 1240,
    following: 184,
  },
  {
    id: "user-lina",
    handle: "linaframes",
    displayName: "Lina Morales",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80",
    bio: "Photographer collecting small city rituals and late-night color palettes.",
    website: "https://lina.example.com",
    followers: 18920,
    following: 502,
    isFollowed: true,
  },
  {
    id: "user-yuki",
    handle: "yuki.codes",
    displayName: "Yuki Tan",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=320&q=80",
    bio: "Front-end engineer obsessed with motion systems, type, and tiny details.",
    website: "https://yuki.example.com",
    followers: 9540,
    following: 121,
  },
  {
    id: "user-samira",
    handle: "samirastudio",
    displayName: "Samira Noor",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=320&q=80",
    bio: "Creative director building warm digital products for cultural brands.",
    website: "https://samira.example.com",
    followers: 30210,
    following: 86,
    isFollowed: true,
  },
];

const seedPosts: Post[] = [
  {
    id: "post-1",
    authorId: "user-lina",
    body: "Spent the morning photographing a cafe before it opened. The cups were already warm, the chairs still slightly crooked. Those in-between moments always feel the most honest.",
    mediaUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    mediaType: "image",
    likeCount: 243,
    commentCount: 12,
    publishedAt: hoursAgo(4),
    liked: true,
    saved: false,
    tags: ["coffee", "photojournal"],
    audience: "public",
  },
  {
    id: "post-2",
    authorId: "user-yuki",
    body: "A small interaction detail I keep coming back to: buttons that feel directional. Diagonal corners create a subtle sense of movement before anything even animates.",
    mediaUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    mediaType: "image",
    likeCount: 189,
    commentCount: 29,
    publishedAt: hoursAgo(9),
    liked: false,
    saved: true,
    tags: ["ui", "motion"],
    audience: "public",
  },
  {
    id: "post-3",
    authorId: "user-me",
    body: "Prototype of a warm-tone social feed. I wanted the interface to feel like printed paper meeting live conversation.",
    mediaUrl: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
    mediaType: "image",
    likeCount: 76,
    commentCount: 7,
    publishedAt: daysAgo(1),
    liked: false,
    saved: false,
    tags: ["prototype", "social"],
    audience: "followers",
  },
  {
    id: "post-4",
    authorId: "user-samira",
    body: "The brand workshop rule today: if the interface can be described as 'clean' and nothing else, it's probably unfinished.",
    mediaUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
    mediaType: "image",
    likeCount: 512,
    commentCount: 61,
    publishedAt: daysAgo(2),
    liked: false,
    saved: true,
    tags: ["branding", "critique"],
    audience: "public",
  },
  {
    id: "post-5",
    authorId: "user-lina",
    body: "Testing a grid of street signs for an upcoming print set. The typography in the wild is still the best teacher.",
    mediaUrl: "https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=1200&q=80",
    mediaType: "image",
    likeCount: 134,
    commentCount: 18,
    publishedAt: daysAgo(3),
    liked: true,
    saved: true,
    tags: ["typography", "street"],
    audience: "public",
  },
];

const seedComments: Comment[] = [
  { id: "comment-1", postId: "post-1", authorId: "user-yuki", body: "That crooked-chair detail is perfect.", createdAt: hoursAgo(3) },
  { id: "comment-2", postId: "post-1", authorId: "user-me", body: "You always make spaces feel cinematic.", createdAt: hoursAgo(2) },
  { id: "comment-3", postId: "post-2", authorId: "user-samira", body: "Exactly. Shape language carries tone before copy does.", createdAt: hoursAgo(5) },
];

const seedStories: Story[] = [
  { id: "post-1", authorId: "user-lina", previewUrl: seedPosts[0].mediaUrl, active: true },
  { id: "post-2", authorId: "user-yuki", previewUrl: seedPosts[1].mediaUrl, active: true },
  { id: "post-4", authorId: "user-samira", previewUrl: seedPosts[3].mediaUrl, active: true },
  { id: "post-3", authorId: "user-me", previewUrl: seedPosts[2].mediaUrl, active: true },
];

const seedTrends: Trend[] = [
  { id: "trend-1", label: "Editorial UI", postCount: 8420 },
  { id: "trend-2", label: "Warm Brutalism", postCount: 4135 },
  { id: "trend-3", label: "Motion Details", postCount: 2940 },
  { id: "trend-4", label: "Design Systems", postCount: 8677 },
];

const seedTags: Tag[] = [
  { id: "tag-1", name: "socialui" },
  { id: "tag-2", name: "motionlanguage" },
  { id: "tag-3", name: "warmminimalism" },
  { id: "tag-4", name: "designcrit" },
  { id: "tag-5", name: "feedpatterns" },
];

const seedConversations: Conversation[] = [
  { id: "conversation-1", participantIds: ["user-me", "user-lina"] },
  { id: "conversation-2", participantIds: ["user-me", "user-yuki"] },
  { id: "conversation-3", participantIds: ["user-me", "user-samira"] },
];

const seedMessages: Message[] = [
  { id: "message-1", conversationId: "conversation-1", senderId: "user-lina", body: "Can you send the type ramp screenshot?", createdAt: hoursAgo(6) },
  { id: "message-2", conversationId: "conversation-1", senderId: "user-me", body: "Uploading it now. The mobile spacing changed a bit too.", createdAt: hoursAgo(5) },
  { id: "message-3", conversationId: "conversation-2", senderId: "user-yuki", body: "The diagonal buttons are a strong move. Keep them.", createdAt: hoursAgo(12) },
  { id: "message-4", conversationId: "conversation-3", senderId: "user-samira", body: "Let's review the brand deck tomorrow afternoon.", createdAt: daysAgo(1) },
];

const seedNotifications: NotificationItem[] = [
  { id: "notification-1", type: "like", actorId: "user-lina", postId: "post-3", message: "liked your post", createdAt: minutesAgo(34), read: false },
  { id: "notification-2", type: "comment", actorId: "user-yuki", postId: "post-3", message: "commented on your post", createdAt: hoursAgo(7), read: false },
  { id: "notification-3", type: "follow", actorId: "user-samira", message: "started following you", createdAt: daysAgo(1), read: true },
];

const seedPreferences: Preferences = {
  theme: "system",
  pushNotifications: true,
  messagePreviews: true,
  autoTranslate: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  locale: "en",
  currentUserId: "user-me",
  users: seedUsers,
  posts: seedPosts,
  comments: seedComments,
  stories: seedStories,
  trends: seedTrends,
  tags: seedTags,
  conversations: seedConversations,
  messages: seedMessages,
  notifications: seedNotifications,
  preferences: seedPreferences,
  toast: null,
  dialog: null,
  setLocale: (locale) => set({ locale }),
  setThemePreference: (theme) => set((state) => ({ preferences: { ...state.preferences, theme } })),
  showToast: (message) => set({ toast: { message } }),
  clearToast: () => set({ toast: null }),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  toggleLike: (postId) =>
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likeCount: post.likeCount + (post.liked ? -1 : 1),
            }
          : post,
      ),
    })),
  toggleSave: (postId) =>
    set((state) => ({
      posts: state.posts.map((post) => (post.id === postId ? { ...post, saved: !post.saved } : post)),
    })),
  createPost: ({ body, media, audience }) => {
    const id = makeId("post");
    set((state) => ({
      posts: [
        {
          id,
          authorId: state.currentUserId,
          body,
          mediaUrl: media || undefined,
          mediaType: media ? "image" : undefined,
          likeCount: 0,
          commentCount: 0,
          publishedAt: new Date().toISOString(),
          liked: false,
          saved: false,
          tags: body
            .split(/\s+/)
            .filter((chunk) => chunk.startsWith("#"))
            .map((chunk) => chunk.replace("#", "").toLowerCase()),
          audience,
        },
        ...state.posts,
      ],
    }));
    return id;
  },
  addComment: (postId, body) =>
    set((state) => ({
      comments: [
        ...state.comments,
        { id: makeId("comment"), postId, authorId: state.currentUserId, body, createdAt: new Date().toISOString() },
      ],
      posts: state.posts.map((post) => (post.id === postId ? { ...post, commentCount: post.commentCount + 1 } : post)),
    })),
  updateProfile: ({ displayName, handle, bio, website }) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === state.currentUserId ? { ...user, displayName, handle, bio, website } : user,
      ),
    })),
  followUser: (userId) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId
          ? {
              ...user,
              isFollowed: !user.isFollowed,
              followers: user.followers + (user.isFollowed ? -1 : 1),
            }
          : user,
      ),
    })),
  sendMessage: (conversationId, body) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: makeId("message"), conversationId, senderId: state.currentUserId, body, createdAt: new Date().toISOString() },
      ],
    })),
  markNotificationRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
    })),
  updatePreference: (key, value) =>
    set((state) => ({
      preferences: { ...state.preferences, [key]: value },
    })),
  logout: () => {
    get().showToast("Local session cleared.");
  },
}));

export function selectCurrentUser(state: AppState) {
  return state.users.find((user) => user.id === state.currentUserId) ?? state.users[0];
}

export function selectUserById(state: AppState, userId: string) {
  return state.users.find((user) => user.id === userId);
}

export function selectFeed(state: AppState, filter: "all" | "following" | "popular", search: string) {
  const lowered = search.trim().toLowerCase();
  return state.posts
    .filter((post) => {
      if (filter === "following") {
        const author = selectUserById(state, post.authorId);
        return author?.isFollowed || post.authorId === state.currentUserId;
      }
      if (filter === "popular") {
        return post.likeCount >= 150;
      }
      return true;
    })
    .filter((post) => {
      if (!lowered) {
        return true;
      }
      const author = selectUserById(state, post.authorId);
      return (
        post.body.toLowerCase().includes(lowered) ||
        author?.displayName.toLowerCase().includes(lowered) ||
        post.tags.some((tag) => tag.includes(lowered))
      );
    });
}

export function selectStories(state: AppState) {
  return state.stories
    .filter((story) => story.active)
    .map((story) => ({
      ...story,
      author: selectUserById(state, story.authorId),
    }))
    .filter((story) => story.author);
}

export function selectPostById(state: AppState, postId: string) {
  return state.posts.find((post) => post.id === postId);
}

export function selectCommentsByPost(state: AppState, postId: string) {
  return state.comments.filter((comment) => comment.postId === postId);
}

export function selectProfilePosts(state: AppState, userId: string) {
  return state.posts.filter((post) => post.authorId === userId);
}

export function selectConversationById(state: AppState, conversationId: string) {
  return state.conversations.find((conversation) => conversation.id === conversationId);
}

export function selectMessagesByConversation(state: AppState, conversationId: string) {
  return state.messages.filter((message) => message.conversationId === conversationId);
}

export function selectConversations(state: AppState, search: string) {
  const lowered = search.trim().toLowerCase();
  return state.conversations
    .map((conversation) => {
      const participant = state.users.find(
        (user) => conversation.participantIds.includes(user.id) && user.id !== state.currentUserId,
      );
      const messages = selectMessagesByConversation(state, conversation.id);
      const lastMessage = messages[messages.length - 1];
      const unreadCount =
        lastMessage && lastMessage.senderId !== state.currentUserId ? Math.min(2, messages.length) : 0;
      return { conversation, participant, lastMessage, unreadCount };
    })
    .filter((item) => item.participant)
    .filter((item) => {
      if (!lowered) {
        return true;
      }
      return (
        item.participant?.displayName.toLowerCase().includes(lowered) ||
        item.lastMessage?.body.toLowerCase().includes(lowered)
      );
    });
}

export function selectNotifications(state: AppState) {
  return state.notifications.map((notification) => ({
    ...notification,
    actor: notification.actorId ? selectUserById(state, notification.actorId) : undefined,
  }));
}

export function selectUnreadNotifications(state: AppState) {
  return state.notifications.filter((item) => !item.read).length;
}

export function selectDiscoverCreators(state: AppState) {
  return state.users.filter((user) => user.id !== state.currentUserId);
}

export function selectSearchResults(state: AppState, query: string, tab: "posts" | "people" | "tags") {
  const lowered = query.trim().toLowerCase();
  if (!lowered) {
    return [];
  }

  if (tab === "people") {
    return state.users
      .filter(
        (user) =>
          user.displayName.toLowerCase().includes(lowered) || user.handle.toLowerCase().includes(lowered),
      )
      .map((user) => ({
        id: user.id,
        title: user.displayName,
        subtitle: `@${user.handle}`,
        body: user.bio ?? "",
        avatarUrl: user.avatarUrl,
        kind: "people" as const,
      }));
  }

  if (tab === "tags") {
    return state.tags
      .filter((tag) => tag.name.toLowerCase().includes(lowered))
      .map((tag) => {
        const relatedPost = state.posts.find((post) => post.tags.includes(tag.name)) ?? state.posts[0];
        return {
          id: relatedPost.id,
          title: `#${tag.name}`,
          subtitle: "Tag",
          body: `Browse posts connected to #${tag.name}.`,
          avatarUrl: undefined,
          kind: "tags" as const,
        };
      });
  }

  return state.posts
    .filter(
      (post) =>
        post.body.toLowerCase().includes(lowered) ||
        post.tags.some((tag) => tag.toLowerCase().includes(lowered)),
    )
    .map((post) => {
      const author = selectUserById(state, post.authorId);
      return {
        id: post.id,
        title: author?.displayName ?? "Unknown",
        subtitle: author ? `@${author.handle}` : "",
        body: post.body,
        avatarUrl: author?.avatarUrl,
        kind: "posts" as const,
      };
    });
}
