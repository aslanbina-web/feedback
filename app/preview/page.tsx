import { notFound } from "next/navigation";
import { FullAppPreview } from "@/components/full-app-preview";

const screens = new Set(["home", "discover", "accept", "review", "submit", "done", "tasks", "history", "profile", "samples", "invite", "notifications", "settings", "edit"]);

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const query = await searchParams;
  const screen = query.screen && screens.has(query.screen) ? query.screen : "home";
  return <FullAppPreview key={screen} initialScreen={screen} />;
}
