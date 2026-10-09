import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllBlogPosts, getAllProjects } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts] = await Promise.all([getAllProjects(), getAllBlogPosts()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteConfig.siteUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9
    },
    {
      url: `${siteConfig.siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: `${siteConfig.siteUrl}/demos/clawcompass`,
      lastModified: new Date(),
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
