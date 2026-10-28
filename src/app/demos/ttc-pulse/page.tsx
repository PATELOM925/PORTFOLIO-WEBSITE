import type { Metadata } from "next";
import { TtcPulseAbout } from "@/components/demos/ttc-pulse/About";
import { TtcPulseDashboard } from "@/components/demos/ttc-pulse/Dashboard";
import { siteConfig } from "@/config/site";
import { Layout } from "@/components/Layout";
import { getBlogPostBySlug } from "@/lib/content";
import { jsonLdHtml, pageMetadata, ttcPulseJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "TTC Pulse: TTC delay dashboard",
  description:
    "A dashboard of 1.1 million TTC bus, subway and streetcar delay events: worst routes, peak hours, causes, live alerts, a reliability score and an AI chat.",
  path: "/demos/ttc-pulse"
});

const TECH_POST_SLUG = "how-ttc-pulse-works";

export default async function TtcPulseDemoPage() {
  // The "How it works" button shows only after the post is published.
  const post = await getBlogPostBySlug(TECH_POST_SLUG);
  const techPost = post?.frontmatter.status === "published" ? { href: `/blog/${TECH_POST_SLUG}`, title: post.frontmatter.title } : null;

  return (
    <Layout showAssistant={false}>
      <main className="container page-spacing demo-page">
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(ttcPulseJsonLd())} />
        <TtcPulseDashboard techPost={techPost} />
        <TtcPulseAbout techPost={techPost} formspreeId={siteConfig.formspreeId} />
      </main>
    </Layout>
  );
}
