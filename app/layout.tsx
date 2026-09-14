import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./playful-ui.css";
import { ServiceWorker } from "@/components/service-worker";

// Keep Vercel Functions beside the Supabase project in Singapore. Running
// them in the default US region adds avoidable latency to every dashboard tab.
export const preferredRegion = "sin1";

export const metadata: Metadata = {
  title: { default: "GiveGet", template: "%s — GiveGet" },
  description: "Give useful reviews. Earn review credits.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#EFEAE0", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
