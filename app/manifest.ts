import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GiveGet",
    short_name: "GiveGet",
    description: "Give useful reviews. Earn review credits.",
    start_url: "/",
    display: "standalone",
    background_color: "#EFEAE0",
    theme_color: "#EFEAE0",
    icons: [{ src: "/giveget-icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
