import Link from "next/link";
import { BlogCard } from "@/components/BlogCard";
import { Layout } from "@/components/Layout";
import { getAllBlogPosts } from "@/lib/content";

export const metadata = {
  title: "Blog",
  description: "Research notes, implementation notes, and project breakdowns.",
  alternates: { canonical: "/blog" }
};

export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts();

  return (
    <Layout>
      <main className="container page-spacing">
        <p className="eyebrow">Writing</p>
        <h1>Blog</h1>
        <p className="lead">My learnings, practical takeaways, and implementation notes.</p>
        <div className="card-grid">
          {posts.map((post) => (
            <BlogCard key={post.frontmatter.slug} post={post.frontmatter} />
          ))}
        </div>
        <Link href="/" className="text-link back-link">
          Back to home
        </Link>
      </main>
    </Layout>
  );
}
