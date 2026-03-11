import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Layout } from "@/components/Layout";
import { MarkdownContent } from "@/components/MarkdownContent";
import { TagBadge } from "@/components/TagBadge";
import { formatDate } from "@/lib/date";
import { getAllBlogPosts, getBlogPostBySlug } from "@/lib/content";

export async function generateStaticParams() {
  const posts = await getAllBlogPosts(true);
  return posts.map((post) => ({ slug: post.frontmatter.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.excerpt,
    alternates: { canonical: `/blog/${post.frontmatter.slug}` }
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <Layout>
      <main className="container page-spacing detail-page">
        <p className="eyebrow">{formatDate(post.frontmatter.date)}</p>
        <h1>{post.frontmatter.title}</h1>
        <p className="lead">{post.frontmatter.excerpt}</p>
        <div className="tag-row detail-tags">
          {post.frontmatter.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
        <article className="card markdown-shell">
          <MarkdownContent content={post.content} />
        </article>
        <Link href="/blog" className="text-link back-link">
          Back to blog
        </Link>
      </main>
    </Layout>
  );
}
