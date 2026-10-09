import { NextResponse } from "next/server";
import { getProjectBySlug } from "@/lib/content";

const targetMap = {
  github: "github",
  demo: "demoUrl",
  youtube: "youtubeUrl",
  report: "reportUrl",
  publication: "publicationUrl"
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; target: string }> }
) {
  const { slug, target } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const key = targetMap[target as keyof typeof targetMap];
  if (!key) return NextResponse.json({ error: "Target not found" }, { status: 404 });

  const url = project.frontmatter[key];
  if (!url) return NextResponse.json({ error: "Link not available" }, { status: 404 });

  // Relative links (for example /demos/clawcompass) need the request origin to become absolute.
  return NextResponse.redirect(new URL(url, request.url), 302);
}
