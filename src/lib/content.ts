import { blogRecords, projectRecords } from "@/generated/content.generated";
import { BlogFrontmatter, ContentRecord, ProjectFrontmatter } from "@/types/content";

function sortByDateDesc<T extends { date: string }>(records: ContentRecord<T>[]): ContentRecord<T>[] {
  return [...records].sort(
    (a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime()
  );
}

const projects = projectRecords as unknown as ContentRecord<ProjectFrontmatter>[];
const blogPosts = blogRecords as unknown as ContentRecord<BlogFrontmatter>[];

export async function getAllProjects(includeDrafts = false): Promise<ContentRecord<ProjectFrontmatter>[]> {
  const filtered = includeDrafts
    ? projects
    : projects.filter((record: ContentRecord<ProjectFrontmatter>) => record.frontmatter.status === "published");

  return sortByDateDesc(filtered);
}

export async function getProjectBySlug(slug: string): Promise<ContentRecord<ProjectFrontmatter> | null> {
  const allProjects = await getAllProjects(true);
  return allProjects.find((project) => project.frontmatter.slug === slug) || null;
}

export async function getFeaturedProjects(): Promise<ContentRecord<ProjectFrontmatter>[]> {
  const allProjects = await getAllProjects();
  return allProjects.filter((project) => project.frontmatter.featured);
}

export async function getAllBlogPosts(includeDrafts = false): Promise<ContentRecord<BlogFrontmatter>[]> {
  const filtered = includeDrafts
    ? blogPosts
    : blogPosts.filter((record: ContentRecord<BlogFrontmatter>) => record.frontmatter.status === "published");

  return sortByDateDesc(filtered);
}

export async function getBlogPostBySlug(slug: string): Promise<ContentRecord<BlogFrontmatter> | null> {
  const allPosts = await getAllBlogPosts(true);
  return allPosts.find((post) => post.frontmatter.slug === slug) || null;
}

export async function getLatestBlogPosts(limit = 4): Promise<ContentRecord<BlogFrontmatter>[]> {
  const allPosts = await getAllBlogPosts();
  return allPosts.slice(0, limit);
}
