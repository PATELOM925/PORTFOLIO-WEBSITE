import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// AI search and answer engines are welcome, so the site can be cited in their answers.
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "DuckAssistBot", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: "/api/" }
    ],
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`
  };
}
