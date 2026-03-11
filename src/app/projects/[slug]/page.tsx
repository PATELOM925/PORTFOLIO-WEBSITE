import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Layout } from "@/components/Layout";
import { MarkdownContent } from "@/components/MarkdownContent";
import { TagBadge } from "@/components/TagBadge";
import { getAllProjects, getProjectBySlug } from "@/lib/content";

export async function generateStaticParams() {
  const projects = await getAllProjects(true);
  return projects.map((project) => ({ slug: project.frontmatter.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};

  return {
    title: project.frontmatter.title,
    description: project.frontmatter.preview,
    alternates: { canonical: `/projects/${project.frontmatter.slug}` }
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const { frontmatter, content } = project;

  return (
    <Layout>
      <main className="container page-spacing detail-page">
        <p className="eyebrow">Project</p>
        <h1>{frontmatter.title}</h1>
        <p className="lead">{frontmatter.preview}</p>
        <div className="tag-row detail-tags">
          {frontmatter.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
        <div className="project-links detail-links">
          {frontmatter.github ? (
            <a href={`/go/project/${frontmatter.slug}/github`} target="_blank" rel="noreferrer">
              GitHub
            </a>
          ) : null}
          {frontmatter.demoUrl ? (
            <a href={`/go/project/${frontmatter.slug}/demo`} target="_blank" rel="noreferrer">
              Demo
            </a>
          ) : null}
          {frontmatter.youtubeUrl ? (
            <a href={`/go/project/${frontmatter.slug}/youtube`} target="_blank" rel="noreferrer">
              YouTube
            </a>
          ) : null}
        </div>

        <div className="detail-grid">
          {frontmatter.problem ? (
            <article className="card detail-card">
              <h2>Problem</h2>
              <p>{frontmatter.problem}</p>
            </article>
          ) : null}
          {frontmatter.approach ? (
            <article className="card detail-card">
              <h2>Approach</h2>
              <p>{frontmatter.approach}</p>
            </article>
          ) : null}
          {frontmatter.result ? (
            <article className="card detail-card">
              <h2>Result</h2>
              <p>{frontmatter.result}</p>
            </article>
          ) : null}
        </div>

        <article className="card markdown-shell">
          <MarkdownContent content={content} />
        </article>

        <Link href="/projects" className="text-link back-link">
          Back to projects
        </Link>
      </main>
    </Layout>
  );
}
