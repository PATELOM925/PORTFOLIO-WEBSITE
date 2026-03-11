import Link from "next/link";
import { TagBadge } from "@/components/TagBadge";
import { ProjectFrontmatter } from "@/types/content";

interface ProjectCardProps {
  project: ProjectFrontmatter;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="card project-card">
      <div className="card-top">
        <h3>
          <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        </h3>
        <p>{project.preview}</p>
      </div>
      <div className="tag-row">
        {project.tags.map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>
      {project.isPrivateSource ? <p className="meta-note">Source repository is private for this project.</p> : null}
      <div className="project-links">
        <Link href={`/projects/${project.slug}`}>Details</Link>
        {project.github ? (
          <a href={`/go/project/${project.slug}/github`} target="_blank" rel="noreferrer">
            GitHub
          </a>
        ) : null}
        {project.demoUrl ? (
          <a href={`/go/project/${project.slug}/demo`} target="_blank" rel="noreferrer">
            Demo
          </a>
        ) : null}
        {project.youtubeUrl ? (
          <a href={`/go/project/${project.slug}/youtube`} target="_blank" rel="noreferrer">
            YouTube
          </a>
        ) : null}
      </div>
    </article>
  );
}
