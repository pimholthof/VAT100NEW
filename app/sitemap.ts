import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vat100.nl";

  return [
    {
      url: baseUrl,
      lastModified: new Date("2026-04-10"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-04-04"),
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/voorwaarden`,
      lastModified: new Date("2026-04-04"),
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date("2026-04-01"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date("2026-04-01"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
