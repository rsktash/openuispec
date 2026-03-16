import { Link } from "react-router";
import { Icon } from "../lib/icons";
import { formatDate, formatNumber, formatRelativeDate, formatTime } from "../lib/utils";
import type {
  Comment,
  Message,
  NotificationItem,
  Post,
  User,
} from "../state/store";
import { ActionButton, Avatar, Surface } from "./ui";

export function StoryCard({
  name,
  image,
  to,
}: {
  name: string;
  image?: string;
  to: string;
}) {
  return (
    <Link to={to} className="group snap-start">
      <div className="w-28">
        <div className="rounded-surface relative aspect-[4/5] overflow-hidden border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] shadow-sm">
          {image ? <img src={image} alt={name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : null}
          <div className="absolute inset-0 bg-linear-to-t from-[rgba(28,27,26,0.85)] via-transparent to-transparent" />
          <span className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white">{name}</span>
        </div>
      </div>
    </Link>
  );
}

export function CreatorCard({
  user,
  to,
}: {
  user: User;
  to: string;
}) {
  return (
    <Link to={to} className="block w-72 shrink-0 snap-start">
      <Surface className="h-full p-4">
        <div className="flex items-start gap-3">
          <Avatar src={user.avatarUrl} name={user.displayName} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[var(--color-text-primary)]">{user.displayName}</p>
            <p className="truncate text-sm text-[var(--color-text-secondary)]">@{user.handle}</p>
          </div>
        </div>
        <p className="mt-4 line-clamp-3 text-sm text-[var(--color-text-secondary)]">{user.bio}</p>
      </Surface>
    </Link>
  );
}

export function TrendRow({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-card border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5"
    >
      <div>
        <p className="font-semibold text-[var(--color-text-primary)]">{title}</p>
        <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
      </div>
      <Icon name="discover" className="h-5 w-5 text-[var(--color-text-tertiary)]" />
    </button>
  );
}

export function PostCard({
  post,
  author,
  hero,
  onOpen,
  onAuthor,
  onLike,
  onSave,
}: {
  post: Post;
  author: User;
  hero?: boolean;
  onOpen?: () => void;
  onAuthor?: () => void;
  onLike?: () => void;
  onSave?: () => void;
}) {
  return (
    <article className={hero ? "rounded-surface border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5 shadow-sm" : ""}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onAuthor} className="shrink-0">
          <Avatar src={author.avatarUrl} name={author.displayName} />
        </button>
        <div className="min-w-0">
          <p className={hero ? "truncate text-2xl font-semibold text-[var(--color-text-primary)]" : "truncate font-semibold text-[var(--color-text-primary)]"}>
            {author.displayName}
          </p>
          <p className="truncate text-sm text-[var(--color-text-secondary)]">@{author.handle}</p>
        </div>
        <div className="ml-auto text-right text-xs text-[var(--color-text-tertiary)]">
          {hero ? formatDate(post.publishedAt) : formatRelativeDate(post.publishedAt)}
        </div>
      </div>
      <button type="button" onClick={onOpen} className="mt-4 block w-full text-left">
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[var(--color-text-primary)]">{post.body}</p>
        {post.mediaUrl ? (
          <div className="mt-4 overflow-hidden rounded-surface border border-[var(--color-border-default)]">
            <img src={post.mediaUrl} alt="" className={hero ? "aspect-[4/3] w-full object-cover" : "aspect-[16/10] w-full object-cover"} />
          </div>
        ) : null}
      </button>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <span>{formatNumber(post.likeCount)} likes</span>
        <span className="text-[var(--color-border-strong)]">•</span>
        <span>{formatNumber(post.commentCount)} comments</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton variant="secondary" icon={post.liked ? "like_fill" : "like"} onClick={onLike}>
          Like
        </ActionButton>
        <ActionButton variant="chip" icon={post.saved ? "bookmark_fill" : "bookmark"} selected={post.saved} onClick={onSave}>
          Save
        </ActionButton>
      </div>
    </article>
  );
}

export function CompactRow({
  user,
  title,
  subtitle,
  metadata,
}: {
  user: User;
  title: string;
  subtitle: string;
  metadata?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-border-default)] px-1 py-3 last:border-b-0">
      <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
        <p className="truncate text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
      </div>
      {metadata ? <p className="text-xs text-[var(--color-text-tertiary)]">{metadata}</p> : null}
    </div>
  );
}

export function CommentCard({
  comment,
  author,
  onAuthor,
}: {
  comment: Comment;
  author: User;
  onAuthor: () => void;
}) {
  return (
    <Surface className="p-4">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onAuthor}>
          <Avatar src={author.avatarUrl} name={author.displayName} size="sm" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{author.displayName}</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">{formatRelativeDate(comment.createdAt)}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{comment.body}</p>
        </div>
      </div>
    </Surface>
  );
}

export function ProfileHero({
  user,
  action,
}: {
  user: User;
  action?: React.ReactNode;
}) {
  return (
    <Surface className="overflow-hidden p-6">
      <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-start">
        <Avatar src={user.avatarUrl} name={user.displayName} size="lg" />
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">{user.displayName}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">@{user.handle}</p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">{user.bio}</p>
          {user.website ? (
            <a href={user.website} className="mt-3 inline-flex text-sm font-medium text-[var(--color-brand-accent)]">
              {user.website.replace(/^https?:\/\//, "")}
            </a>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          {action}
          <div className="rounded-cap-primary bg-[var(--color-surface-tertiary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            <strong className="mr-1 text-[var(--color-text-primary)]">{formatNumber(user.followers)}</strong>
            followers
          </div>
        </div>
      </div>
    </Surface>
  );
}

export function ConversationCard({
  user,
  excerpt,
  unreadCount,
  timestamp,
  onOpen,
}: {
  user: User;
  excerpt: string;
  unreadCount: number;
  timestamp?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-card border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4 text-left shadow-sm transition hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-3">
        <Avatar src={user.avatarUrl} name={user.displayName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-semibold text-[var(--color-text-primary)]">{user.displayName}</p>
            {timestamp ? <p className="text-xs text-[var(--color-text-tertiary)]">{formatRelativeDate(timestamp)}</p> : null}
          </div>
          <p className="truncate text-sm text-[var(--color-text-secondary)]">{excerpt}</p>
        </div>
        {unreadCount > 0 ? (
          <span className="rounded-cap-primary bg-[var(--color-brand-primary)] px-2 py-1 text-xs font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function NotificationCard({
  item,
  actor,
  onOpen,
}: {
  item: NotificationItem;
  actor?: User;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-card border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4 text-left shadow-sm transition hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-3">
        <Avatar src={actor?.avatarUrl} name={actor?.displayName ?? "Notification"} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-[var(--color-text-primary)]">{actor?.displayName ?? "System"}</p>
            {!item.read ? <span className="h-2 w-2 rounded-full bg-[var(--color-brand-accent)]" /> : null}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">{item.message}</p>
        </div>
        <p className="text-xs text-[var(--color-text-tertiary)]">{formatRelativeDate(item.createdAt)}</p>
      </div>
    </button>
  );
}

export function MessageBubble({
  message,
  author,
  isMine,
}: {
  message: Message;
  author: User;
  isMine: boolean;
}) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(32rem,86%)] px-4 py-3 shadow-sm ${
          isMine
            ? "rounded-cap-primary bg-[var(--color-brand-primary)] text-white"
            : "rounded-cap-alternate border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
        }`}
      >
        <p className={`text-xs ${isMine ? "text-white/70" : "text-[var(--color-text-tertiary)]"}`}>{author.displayName}</p>
        <p className="mt-1 text-sm leading-6">{message.body}</p>
        <p className={`mt-2 text-right text-xs ${isMine ? "text-white/70" : "text-[var(--color-text-tertiary)]"}`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
