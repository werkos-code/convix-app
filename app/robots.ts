import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://convix.cloud";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: ["/app/", "/api/", "/auth/"],
      },
    ],
    sitemap: `${site.replace(/\/$/, "")}/sitemap.xml`,
  };
}
