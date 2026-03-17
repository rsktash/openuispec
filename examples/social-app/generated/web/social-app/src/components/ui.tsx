import { type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from "react";
import { Link } from "react-router";
import { Icon } from "../lib/icons";
import { cn, getInitials } from "../lib/utils";

export function ScreenScaffold({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <section className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-4 pb-28 pt-4 md:px-6 xl:px-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-tertiary)]">social-app</p>
        <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-[1.2] text-[var(--color-text-primary)]">
          {title}
        </h1>
        {subtitle ? <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{children}</h2>
      {action}
    </div>
  );
}

export function Surface({
  children,
  className,
}: PropsWithChildren<{
  className?: string;
}>) {
  return <div className={cn("rounded-surface border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] shadow-sm", className)}>{children}</div>;
}

export function ActionGroup({
  children,
  className,
}: PropsWithChildren<{
  className?: string;
}>) {
  return <div className={cn("flex flex-col items-start gap-3", className)}>{children}</div>;
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "chip" | "destructive" | "fab";
  icon?: Parameters<typeof Icon>[0]["name"];
  fullWidth?: boolean;
  selected?: boolean;
  trailing?: ReactNode;
};

export function ActionButton({
  children,
  className,
  variant = "primary",
  icon,
  fullWidth,
  selected,
  trailing,
  ...props
}: ActionButtonProps) {
  const variantClass =
    variant === "primary"
      ? "rounded-cap-primary border-transparent bg-[var(--color-brand-primary)] text-[var(--color-brand-primary-on)]"
      : variant === "secondary"
        ? "rounded-cap-alternate border-[var(--color-border-strong)] bg-transparent text-[var(--color-text-primary)]"
        : variant === "destructive"
          ? "rounded-cap-primary border-transparent bg-[var(--color-semantic-danger)] text-[var(--color-semantic-danger-on)]"
          : variant === "fab"
            ? "rounded-cap-primary border-transparent bg-[var(--color-brand-primary)] text-[var(--color-brand-primary-on)] shadow-md"
          : selected
            ? "rounded-cap-primary border-transparent bg-[var(--color-brand-accent)] text-[var(--color-brand-accent-on)]"
            : "rounded-cap-primary border-[var(--color-border-default)] bg-transparent text-[var(--color-text-primary)]";

  return (
    <button
      className={cn(
        "interactive-press inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap align-middle border px-4 py-3 text-sm font-semibold transition",
        variant === "fab" && "h-14 w-14 gap-0 px-0 py-0",
        fullWidth && "w-full",
        variantClass,
        className,
      )}
      {...props}
    >
      {icon ? <Icon name={icon} className="h-5 w-5" /> : null}
      {variant === "fab" ? (children ? <span className="sr-only">{children}</span> : null) : <span>{children}</span>}
      {trailing}
    </button>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  multiline?: boolean;
  onValueChange?: (value: string) => void;
  trailingAction?: ReactNode;
  placeholder?: string;
  maxLength?: number;
  type?: string;
  className?: string;
};

export function TextField({
  label,
  value,
  multiline,
  className,
  onValueChange,
  trailingAction,
  placeholder,
  maxLength,
  type,
}: TextFieldProps) {
  const sharedClassName =
    "min-h-12 w-full rounded-cap-primary border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition focus:border-[var(--color-brand-primary)] focus:border-2";

  return (
    <label className="flex w-full flex-col gap-2">
      <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
      <div className="flex items-end gap-2">
        {multiline ? (
          <textarea
            className={cn(sharedClassName, "min-h-28 resize-y", className)}
            value={String(value ?? "")}
            onChange={(event) => onValueChange?.(event.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
          />
        ) : (
          <input
            className={cn(sharedClassName, className)}
            value={String(value ?? "")}
            onChange={(event) => onValueChange?.(event.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            type={type}
          />
        )}
        {trailingAction}
      </div>
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="min-h-12 w-full appearance-none rounded-cap-primary border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-2 focus:border-[var(--color-brand-primary)]"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="more" className="pointer-events-none absolute right-3 top-3.5 h-5 w-5 rotate-90 text-[var(--color-text-tertiary)]" />
      </div>
    </label>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-card border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-3">
      <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-10 accent-[var(--color-brand-primary)]"
      />
    </div>
  );
}

export function Avatar({
  src,
  name,
  size = "md",
}: {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "h-10 w-10 text-xs"
      : size === "lg"
        ? "h-[4.5rem] w-[4.5rem] text-lg"
        : "h-12 w-12 text-sm";

  return src ? (
    <img
      alt={name}
      src={src}
      className={cn("rounded-cap-primary object-cover", sizeClass)}
    />
  ) : (
    <div className={cn("flex items-center justify-center rounded-cap-primary bg-[var(--color-surface-tertiary)] font-semibold text-[var(--color-text-secondary)]", sizeClass)}>
      {getInitials(name)}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Surface className="p-8 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <div className="rounded-cap-primary bg-[var(--color-surface-tertiary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-text-secondary)]">
          Empty
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
        {action}
      </div>
    </Surface>
  );
}

export function ErrorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-surface border border-[color:rgba(212,59,59,0.24)] bg-[color:rgba(212,59,59,0.08)] p-5 text-sm text-[var(--color-text-primary)]">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

export function FeedbackBanner({
  title,
  description,
  onDismiss,
}: {
  title: string;
  description: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-4">
      <div>
        <p className="font-semibold text-[var(--color-text-primary)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="interactive-press rounded-full p-1.5 text-[var(--color-text-secondary)]"
        aria-label="Dismiss banner"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SkeletonList({ count = 3, tall }: { count?: number; tall?: boolean }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "skeleton rounded-card border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]",
            tall ? "h-44" : "h-28",
          )}
        />
      ))}
    </div>
  );
}

export function PillLink({
  to,
  children,
  icon,
}: {
  to: string;
  children: ReactNode;
  icon?: Parameters<typeof Icon>[0]["name"];
}) {
  return (
    <Link
      to={to}
      className="interactive-press rounded-cap-alternate border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
    >
      <span className="inline-flex items-center gap-2">
        {icon ? <Icon name={icon} className="h-4 w-4" /> : null}
        {children}
      </span>
    </Link>
  );
}
