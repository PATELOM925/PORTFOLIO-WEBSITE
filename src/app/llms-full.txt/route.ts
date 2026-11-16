import { siteConfig } from "@/config/site";
import { getAllBlogPosts, getAllProjects } from "@/lib/content";
import { profileLines, ttcFactLines, url } from "@/lib/llms";

export const dynamic = "force-static";

// The full text of the site in one Markdown file, for AI agents that read a whole site at once.
export async function GET() {
  const [posts, projects] = await Promise.all([getAllBlogPosts(), getAllProjects()]);
  const parts = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.description} Based in ${siteConfig.location}. Site: ${siteConfig.siteUrl}`,
    "",
    ...profileLines(),
    "",
    ...ttcFactLines(),
    "",
    ...posts.flatMap((p) => ["---", "", `# Blog: ${p.frontmatter.title}`, "", `URL: ${url(`/blog/${p.frontmatter.slug}`)}. Published ${p.frontmatter.date}.`, "", p.content.trim(), ""]),
    ...projects.flatMap((p) => ["---", "", `# Project: ${p.frontmatter.title}`, "", `URL: ${url(`/projects/${p.frontmatter.slug}`)}.`, "", p.content.trim(), ""])
  ];
  return new Response(parts.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
