import Link from "next/link";
import { TagBadge } from "@/components/TagBadge";
import { ProjectFrontmatter } from "@/types/content";

interface ProjectCardProps {
  project: ProjectFrontmatter;
}

const MAX_TAGS = 4;

export function ProjectCard({ project }: ProjectCardProps) {
  const year = project.date.slice(0, 4);

  return (
    <article className="card project-card">
      <div className="card-top">
        <p className="project-meta">
          <span>{project.category || "Project"}</span>
          <span aria-hidden="true">·</span>
          <span>{year}</span>
          {project.highlight ? <span className="highlight-badge">{project.highlight}</span> : null}
        </p>
        <h3>
          <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        </h3>
        <p>{project.preview}</p>
      </div>
      <div className="tag-row">
        {project.tags.slice(0, MAX_TAGS).map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>
      {project.isPrivateSource ? <p className="meta-note">Source repository is private for this project.</p> : null}
      <div className="project-links">
        <Link href={`/projects/${project.slug}`} className="project-link-primary">
          {project.pipeline ? "How it works →" : "Details →"}
        </Link>
        {project.github ? (
          <a href={`/go/project/${project.slug}/github`} target="_blank" rel="noreferrer">
            GitHub
          </a>
        ) : null}
        {project.demoUrl ? (
          <a href={`/go/project/${project.slug}/demo`} target="_blank" rel="noreferrer">
            Live demo
          </a>
        ) : null}
        {project.youtubeUrl ? (
          <a href={`/go/project/${project.slug}/youtube`} target="_blank" rel="noreferrer">
            Video
          </a>
        ) : null}
      </div>
    </article>
  );
}
