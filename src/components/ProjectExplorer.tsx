"use client";

import { useMemo, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { PROJECT_CATEGORIES, ProjectFrontmatter } from "@/types/content";

export function ProjectExplorer({ projects }: { projects: ProjectFrontmatter[] }) {
  const [category, setCategory] = useState<string>("All");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const project of projects) {
      if (project.category) map.set(project.category, (map.get(project.category) || 0) + 1);
    }
    return map;
  }, [projects]);

  const filters = ["All", ...PROJECT_CATEGORIES.filter((item) => counts.get(item))];
  const visible = category === "All" ? projects : projects.filter((project) => project.category === category);

  return (
    <>
      <div className="filter-row" role="toolbar" aria-label="Filter projects by category">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            className={`filter-chip${item === category ? " is-active" : ""}`}
            aria-pressed={item === category}
            onClick={() => setCategory(item)}
          >
            {item}
            <span className="filter-count">{item === "All" ? projects.length : counts.get(item)}</span>
          </button>
        ))}
      </div>
      <div className="card-grid">
        {visible.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </>
  );
}
