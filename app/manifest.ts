import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GiveGet",
    short_name: "GiveGet",
    description: "Give useful reviews. Earn review credits.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#EFEAE0",
    theme_color: "#EFEAE0",
    icons: [
      { src: "/giveget-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/giveget-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/giveget-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
