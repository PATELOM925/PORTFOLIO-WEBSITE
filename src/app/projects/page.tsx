import Link from "next/link";
import { Layout } from "@/components/Layout";
import { ProjectCard } from "@/components/ProjectCard";
import { getAllProjects } from "@/lib/content";

export const metadata = {
  title: "Projects",
  description: "Project case studies and implementation details.",
  alternates: { canonical: "/projects" }
};

export default async function ProjectsPage() {
  const projects = await getAllProjects();

  return (
    <Layout>
      <main className="container page-spacing">
        <p className="eyebrow">Portfolio</p>
        <h1>Projects</h1>
        <p className="lead">Detailed writeups with links, stack, and impact.</p>
        <div className="card-grid">
          {projects.map((project) => (
            <ProjectCard key={project.frontmatter.slug} project={project.frontmatter} />
          ))}
        </div>
        <Link href="/" className="text-link back-link">
          Back to home
        </Link>
      </main>
    </Layout>
  );
}
