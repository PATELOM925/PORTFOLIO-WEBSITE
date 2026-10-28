import { siteConfig } from "@/config/site";
import { getAllBlogPosts } from "@/lib/content";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const posts = await getAllBlogPosts();
  const items = posts
    .map((p) => {
      const link = `${siteConfig.siteUrl}/blog/${p.frontmatter.slug}`;
      return `    <item>
      <title>${esc(p.frontmatter.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(p.frontmatter.date).toUTCString()}</pubDate>
      <description>${esc(p.frontmatter.excerpt)}</description>
${p.frontmatter.tags.map((t) => `      <category>${esc(t)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(siteConfig.name)}: blog</title>
    <link>${siteConfig.siteUrl}/blog</link>
    <atom:link href="${siteConfig.siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${esc("Research notes, implementation notes, and project breakdowns.")}</description>
    <language>en-ca</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
