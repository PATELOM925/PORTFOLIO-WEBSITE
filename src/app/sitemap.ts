import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllBlogPosts, getAllProjects } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts] = await Promise.all([getAllProjects(), getAllBlogPosts()]);
  // Use real dates, not the request time, so search engines can trust lastmod.
  const newest = (dates: string[]) => new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
  const latestPost = newest(posts.map((p) => p.frontmatter.date));
  const latestProject = newest(projects.map((p) => p.frontmatter.date));
  // Change this date when the home page or the TTC Pulse page changes.
  const pagesUpdated = new Date("2026-11-02");

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.siteUrl,
      lastModified: pagesUpdated,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteConfig.siteUrl}/projects`,
      lastModified: latestProject,
      changeFrequency: "weekly",
      priority: 0.9
    },
    {
      url: `${siteConfig.siteUrl}/blog`,
      lastModified: latestPost,
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: `${siteConfig.siteUrl}/demos/remote-codex-control`,
      lastModified: latestProject,
      changeFrequency: "monthly",
      priority: 0.6
    },
    {
      url: `${siteConfig.siteUrl}/demos/ttc-pulse`,
      lastModified: pagesUpdated,
      changeFrequency: "monthly",
      priority: 0.6
    }
  ];

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${siteConfig.siteUrl}/projects/${project.frontmatter.slug}`,
    lastModified: new Date(project.frontmatter.date),
    changeFrequency: "monthly",
    priority: 0.8
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteConfig.siteUrl}/blog/${post.frontmatter.slug}`,
    lastModified: new Date(post.frontmatter.date),
    changeFrequency: "monthly",
    priority: 0.7
  }));

  return [...staticRoutes, ...projectRoutes, ...blogRoutes];
}
