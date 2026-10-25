import type { Metadata } from "next";
import { TtcPulseDashboard } from "@/components/demos/ttc-pulse/Dashboard";
import { Layout } from "@/components/Layout";
import { getBlogPostBySlug } from "@/lib/content";

export const metadata: Metadata = {
  title: "TTC Pulse: TTC delay dashboard",
  description:
    "A dashboard of 1.1 million TTC bus, subway and streetcar delay events: worst routes, peak hours, causes, a reliability score check and data quality.",
  alternates: { canonical: "/demos/ttc-pulse" }
};

const TECH_POST_SLUG = "how-ttc-pulse-works";

export default async function TtcPulseDemoPage() {
  // The "How it works" button shows only after the post is published.
  const post = await getBlogPostBySlug(TECH_POST_SLUG);
  const techPost = post?.frontmatter.status === "published" ? { href: `/blog/${TECH_POST_SLUG}`, title: post.frontmatter.title } : null;

  return (
    <Layout showAssistant={false}>
      <main className="container page-spacing demo-page">
        <TtcPulseDashboard techPost={techPost} />
      </main>
    </Layout>
  );
}
