import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Convix",
    short_name: "Convix",
    description: "Jouw persoonlijke financiële cockpit — vrij besteedbaar tot je volgende salaris.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f6f3fb",
    theme_color: "#6d5efc",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    lang: "nl",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
