"use client";

import { useState } from "react";

export function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

interface VideoEmbedProps {
  url: string;
  title?: string;
}

// Click-to-load facade: no third-party requests until the visitor opts in.
export function VideoEmbed({ url, title = "Video walkthrough" }: VideoEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const id = getYouTubeId(url);
  if (!id) return null;

  return (
    <figure className="video-embed">
      {loaded ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" className="video-facade" onClick={() => setLoaded(true)} aria-label={`Play: ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="video-play" aria-hidden="true">▶</span>
        </button>
      )}
      <figcaption>{title}</figcaption>
    </figure>
  );
}
