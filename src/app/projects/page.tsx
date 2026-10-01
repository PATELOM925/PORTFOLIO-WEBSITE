import Link from "next/link";
import { Layout } from "@/components/Layout";
import { ProjectExplorer } from "@/components/ProjectExplorer";
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
        <p className="lead">Filter by area, then open a project to step through how it works.</p>
        <ProjectExplorer projects={projects.map((project) => project.frontmatter)} />
        <Link href="/" className="text-link back-link">
          Back to home
        </Link>
      </main>
    </Layout>
  );
}
