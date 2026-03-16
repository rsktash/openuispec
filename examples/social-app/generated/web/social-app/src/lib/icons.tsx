import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  name:
    | "home"
    | "discover"
    | "notifications"
    | "profile"
    | "search"
    | "create_post"
    | "like"
    | "like_fill"
    | "comment"
    | "share"
    | "bookmark"
    | "bookmark_fill"
    | "more"
    | "send"
    | "camera"
    | "image"
    | "edit"
    | "check"
    | "back"
    | "close"
    | "settings";
};

export function Icon({ name, className, ...props }: IconProps) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "home":
      return <svg {...shared}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 10v10h14V10" /></svg>;
    case "discover":
      return <svg {...shared}><circle cx="12" cy="12" r="8" /><path d="m15.5 8.5-2.4 5.4-5.6 2.1 2.5-5.5Z" /></svg>;
    case "notifications":
      return <svg {...shared}><path d="M6 17h12l-1.4-1.7A4.5 4.5 0 0 1 15.5 12V10a3.5 3.5 0 1 0-7 0v2c0 1.2-.4 2.3-1.1 3.3Z" /><path d="M10 18.5a2 2 0 0 0 4 0" /></svg>;
    case "profile":
      return <svg {...shared}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>;
    case "search":
      return <svg {...shared}><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></svg>;
    case "create_post":
      return <svg {...shared}><circle cx="12" cy="12" r="8.5" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>;
    case "like":
      return <svg {...shared}><path d="M12 20s-7-4.3-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.7 12 20 12 20Z" /></svg>;
    case "like_fill":
      return <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}><path fill="currentColor" d="M12 20s-7-4.3-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.7 12 20 12 20Z" /></svg>;
    case "comment":
      return <svg {...shared}><path d="M5 6h14v9H9l-4 3V6Z" /></svg>;
    case "share":
      return <svg {...shared}><path d="M14 6h5v5" /><path d="M10 14 19 5" /><path d="M19 13v5H5V5h5" /></svg>;
    case "bookmark":
      return <svg {...shared}><path d="M7 4h10v16l-5-3-5 3V4Z" /></svg>;
    case "bookmark_fill":
      return <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}><path fill="currentColor" d="M7 4h10v16l-5-3-5 3V4Z" /></svg>;
    case "more":
      return <svg {...shared}><circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" /></svg>;
    case "send":
      return <svg {...shared}><path d="M4 20 20 12 4 4l2.5 8Z" /></svg>;
    case "camera":
      return <svg {...shared}><path d="M5 8h3l2-2h4l2 2h3v10H5Z" /><circle cx="12" cy="13" r="3.5" /></svg>;
    case "image":
      return <svg {...shared}><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.2" /><path d="m7 17 4-4 3 3 3-4 2 5" /></svg>;
    case "edit":
      return <svg {...shared}><path d="m5 19 3.5-.7L18 8.8 15.2 6 5.7 15.5Z" /><path d="m13.8 7.2 3 3" /></svg>;
    case "check":
      return <svg {...shared}><path d="m5 13 4 4L19 7" /></svg>;
    case "back":
      return <svg {...shared}><path d="m15 18-6-6 6-6" /></svg>;
    case "close":
      return <svg {...shared}><path d="m6 6 12 12" /><path d="M18 6 6 18" /></svg>;
    case "settings":
      return <svg {...shared}><circle cx="12" cy="12" r="2.5" /><path d="M19 12a7.2 7.2 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.3 7.3 0 0 0-1.8-1L14.5 3h-5L9 6a7.3 7.3 0 0 0-1.8 1l-2.4-1-2 3.5 2 1.5a7.2 7.2 0 0 0 0 2l-2 1.5 2 3.5 2.4-1c.6.4 1.2.7 1.8 1l.5 3h5l.5-3c.6-.3 1.2-.6 1.8-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" /></svg>;
  }
}
