import type { SVGProps } from "react";

type IconName =
  | "home" | "search" | "tasks" | "history" | "profile"
  | "bell" | "settings" | "back" | "pin" | "copy" | "external"
  | "clock" | "star" | "sprout" | "edit" | "mail" | "shield"
  | "help" | "party" | "trash" | "send" | "heart" | "refresh"
  | "lock" | "more";

export function UiIcon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props} {...common}>
    {name === "home" && <><path fill="#fff0a6" d="m3 11 9-8 9 8-2.5 2.2V21h-13v-7.8Z"/><path d="m3 11 9-8 9 8M5.5 9.5V21h13V9.5M9 21v-7h6v7"/><circle cx="17.7" cy="6.4" r="1.2" fill="#ff684f" stroke="none"/></>}
    {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5" fill="#dff5ff"/><path d="m15.5 15.5 5 5"/><path d="M8 8.2c1-1 2.6-1.2 3.7-.5" stroke="#fff"/></>}
    {name === "tasks" && <><rect x="5" y="3" width="14" height="18" rx="2" fill="#c9f6e3"/><path d="M9 3.5h6M8 9l1.5 1.5L12 8M13 10h3M8 15l1.5 1.5L12 14M13 16h3"/></>}
    {name === "history" && <><rect x="5" y="4" width="14" height="17" rx="2" fill="#ffdce4"/><path d="M9 2h6v4H9z" fill="#ffd956"/><path d="M9 10h6M9 14h6M9 18h4"/></>}
    {name === "profile" && <><circle cx="12" cy="8" r="4" fill="#ffd956"/><path d="M4.5 21c.5-4.5 3-7 7.5-7s7 2.5 7.5 7" fill="#dff5ff"/><path d="M10.2 8.5c1.1.8 2.5.8 3.6 0"/></>}
    {name === "bell" && <><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" fill="#ffd956"/><path d="M10 20h4"/><circle cx="18.5" cy="5" r="2.1" fill="#ff684f" stroke="#111958" strokeWidth="1.4"/></>}
    {name === "settings" && <><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" fill="#d9c7ff"/><circle cx="12" cy="12" r="3" fill="#fff"/></>}
    {name === "back" && <path d="m15 19-7-7 7-7"/>}
    {name === "pin" && <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>}
    {name === "copy" && <><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"/></>}
    {name === "external" && <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></>}
    {name === "clock" && <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}
    {name === "star" && <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>}
    {name === "sprout" && <><path d="M12 21v-9"/><path d="M12 13C7 13 4 10 4 5c5 0 8 2 8 8Z" fill="#8ee59b"/><path d="M12 15c0-5 3-8 8-8 0 5-3 8-8 8Z" fill="#ffd956"/></>}
    {name === "edit" && <><path d="m5 16-1 4 4-1L19 8l-3-3Z" fill="#ffd956"/><path d="m14 7 3 3M4 20h16"/></>}
    {name === "mail" && <><rect x="3" y="5" width="18" height="14" rx="3" fill="#ffdce4"/><path d="m4 7 8 6 8-6"/><path d="m4 18 5-5M20 18l-5-5"/></>}
    {name === "shield" && <><path d="M12 3 20 6v5c0 5-3.3 8.4-8 10-4.7-1.6-8-5-8-10V6Z" fill="#c9f6e3"/><path d="m9 12 2 2 4-5"/></>}
    {name === "help" && <><circle cx="12" cy="12" r="9" fill="#ffdce4"/><path d="M9.6 9a2.5 2.5 0 1 1 3.2 2.4c-.8.3-.8 1-.8 1.8M12 17h.01"/></>}
    {name === "party" && <><path d="m5 20 3-11 7 7Z" fill="#ffd956"/><path d="M10 5c1.5-2 3-2 4.5 0s3 2 4.5 0M15 10l3-2M7 7 5 4"/><circle cx="18" cy="13" r="1" fill="#ff684f" stroke="none"/><circle cx="17" cy="3" r="1" fill="#16c795" stroke="none"/></>}
    {name === "trash" && <><path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14" fill="#ffdce4"/><path d="M10 11v6M14 11v6"/></>}
    {name === "send" && <><path d="m3 11 18-8-7 18-3-7Z" fill="#79dff2"/><path d="m11 14 10-11"/></>}
    {name === "heart" && <path d="M12 21S3 16 3 9.5C3 5 8.5 3 12 7c3.5-4 9-2 9 2.5C21 16 12 21 12 21Z" fill="#ff91a5"/>}
    {name === "refresh" && <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8.5A7 7 0 0 1 18.8 10M17.9 15.5A7 7 0 0 1 5.2 14"/></>}
    {name === "lock" && <><rect x="5" y="10" width="14" height="11" rx="3" fill="#d9c7ff"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>}
    {name === "more" && <><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/></>}
  </svg>;
}
