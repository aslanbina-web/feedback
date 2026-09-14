import type { SVGProps } from "react";

type IconName = "home" | "search" | "tasks" | "history" | "profile" | "bell" | "settings" | "back" | "pin" | "copy" | "external" | "clock" | "star";

export function UiIcon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props} {...common}>
    {name === "home" && <><path d="m3 11 9-8 9 8"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/></>}
    {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>}
    {name === "tasks" && <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3.5h6M8 9h8M8 13h8M8 17h5"/></>}
    {name === "history" && <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v4H9zM9 10h6M9 14h6M9 18h4"/></>}
    {name === "profile" && <><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.5-4.5 3-7 7.5-7s7 2.5 7.5 7"/></>}
    {name === "bell" && <><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7"/><path d="M10 20h4"/></>}
    {name === "settings" && <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>}
    {name === "back" && <path d="m15 19-7-7 7-7"/>}
    {name === "pin" && <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>}
    {name === "copy" && <><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"/></>}
    {name === "external" && <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></>}
    {name === "clock" && <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}
    {name === "star" && <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>}
  </svg>;
}
