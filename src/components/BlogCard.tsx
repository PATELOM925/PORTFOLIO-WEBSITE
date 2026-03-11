import Link from "next/link";
import { BlogFrontmatter } from "@/types/content";
import { formatDate } from "@/lib/date";
import { TagBadge } from "@/components/TagBadge";

interface BlogCardProps {
  post: BlogFrontmatter;
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <article className="card blog-card">
      <p className="eyebrow">{formatDate(post.date)}</p>
      <h3>
        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
      </h3>
      <p>{post.excerpt}</p>
      <div className="tag-row">
        {post.tags.map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>
    </article>
  );
}
