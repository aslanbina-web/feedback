import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";

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
