import { NextResponse } from "next/server";
import { researchEntries } from "@/config/site";

const targetMap = {
  code: "codeUrl",
  publication: "publicationUrl",
  slides: "slidesUrl",
  report: "reportUrl"
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; target: string }> }
) {
  const { slug, target } = await params;
  const entry = researchEntries.find((item) => item.slug === slug);
  if (!entry) return NextResponse.json({ error: "Research entry not found" }, { status: 404 });

  const key = targetMap[target as keyof typeof targetMap];
  if (!key) return NextResponse.json({ error: "Target not found" }, { status: 404 });

  const url = entry[key];
  if (!url) return NextResponse.json({ error: "Link not available" }, { status: 404 });

  return NextResponse.redirect(url, 302);
}
