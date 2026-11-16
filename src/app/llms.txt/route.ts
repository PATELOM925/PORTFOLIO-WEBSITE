import { siteConfig } from "@/config/site";
import { getAllBlogPosts, getAllProjects } from "@/lib/content";
import { profileLines, ttcFactLines, url } from "@/lib/llms";

export const dynamic = "force-static";

// A plain guide to the site for AI agents and answer engines (llmstxt.org format).
export async function GET() {
  const [posts, projects] = await Promise.all([getAllBlogPosts(), getAllProjects()]);
  const lines = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.description} Based in ${siteConfig.location}.`,
    "",
    "## TTC Pulse",
    "",
    `- [TTC Pulse dashboard](${url("/demos/ttc-pulse")}): reliability of TTC buses, subways and streetcars from 1,111,831 delay events (January 2014 to January 2026), by route, station, hour and cause. Includes live TTC alerts and vehicles, and an AI chat that answers from the data with sources.`,
    `- [How TTC Pulse works](${url("/blog/how-ttc-pulse-works")}): the bronze, silver and gold pipeline, the reliability score, its small-sample fault and the fix, SQL queries, and the AI chat design.`,
    "- Credit: TTC Pulse started as a team project at York University (Winter 2026). Om built the public dashboard, the score fix and the AI chat.",
    "- Source data: City of Toronto Open Data (TTC bus, subway and streetcar delay data) and TTC GTFS feeds.",
    "",
    ...ttcFactLines(),
    "",
    ...profileLines(),
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
    "",
    "## Optional",
    "",
    `- [Full text of all posts and projects](${url("/llms-full.txt")})`,
    ""
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
