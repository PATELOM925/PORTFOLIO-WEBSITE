interface TimelineItemProps {
  title: string;
  meta: string;
  period: string;
  bullets: string[];
}

export function TimelineItem({ title, meta, period, bullets }: TimelineItemProps) {
  return (
    <article className="timeline-item">
      <div className="timeline-top">
        <h3>{title}</h3>
        <p>{meta}</p>
      </div>
      <p className="timeline-period">{period}</p>
      <ul>
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </article>
  );
}
