import { siteConfig } from "@/config/site";
import { getAllBlogPosts, getAllProjects } from "@/lib/content";

export const dynamic = "force-static";

// A plain guide to the site for AI agents and answer engines (llmstxt.org format).
export async function GET() {
  const [posts, projects] = await Promise.all([getAllBlogPosts(), getAllProjects()]);
  const url = (path: string) => `${siteConfig.siteUrl}${path}`;
  const lines = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.description} Based in ${siteConfig.location}.`,
    "",
    "## TTC Pulse",
    "",
    `- [TTC Pulse dashboard](${url("/demos/ttc-pulse")}): reliability of TTC buses, subways and streetcars from 1,111,831 delay events (January 2014 to January 2026), by route, station, hour and cause. Includes live TTC alerts and vehicles, and an AI chat that answers from the data with sources.`,
    `- [How TTC Pulse works](${url("/blog/how-ttc-pulse-works")}): the bronze, silver and gold pipeline, the reliability score, its small-sample fault and the fix, SQL queries, and the AI chat design.`,
    "- Key facts: 29 of 284 bus routes have 50.1% of bus delay events. 32 Eglinton West has the most bus delay events. 42.8% of bus delay events occur in weekday rush hours. Mechanical faults cause 32.4% of bus delay events. The data has delays only, not on-time trips, so it gives counts, not rates.",
    "- Credit: TTC Pulse started as a team project at York University (Winter 2026). Om built the public dashboard, the score fix and the AI chat.",
    "- Source data: City of Toronto Open Data (TTC bus, subway and streetcar delay data) and TTC GTFS feeds.",
    "",
    "## Blog",
    "",
    ...posts.map((p) => `- [${p.frontmatter.title}](${url(`/blog/${p.frontmatter.slug}`)}): ${p.frontmatter.excerpt}`),
    "",
    "## Projects",
    "",
    ...projects.map((p) => `- [${p.frontmatter.title}](${url(`/projects/${p.frontmatter.slug}`)}): ${p.frontmatter.preview}`),
    "",
    "## Contact",
    "",
    `- [Home and contact form](${url("/")})`,
    `- [Resume](${url(siteConfig.resumePath.split("?")[0])})`,
    ""
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
