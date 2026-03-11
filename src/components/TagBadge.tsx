interface TagBadgeProps {
  tag: string;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return <span className="tag-badge">{tag}</span>;
}
