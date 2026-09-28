"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectFrontmatter } from "@/types/content";

interface FeaturedCarouselProps {
  projects: ProjectFrontmatter[];
  totalCount: number;
}

export function FeaturedCarousel({ projects, totalCount }: FeaturedCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });
  const slideCount = projects.length + 1; // featured cards + "see all" card

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slides = Array.from(track.children) as HTMLElement[];
    const left = track.scrollLeft;
    let nearest = 0;
    slides.forEach((slide, i) => {
      if (Math.abs(slide.offsetLeft - track.offsetLeft - left) < Math.abs(slides[nearest].offsetLeft - track.offsetLeft - left)) nearest = i;
    });
    const atEnd = left + track.clientWidth >= track.scrollWidth - 4;
    setIndex(atEnd ? slides.length - 1 : nearest);
    setEdges({ start: left <= 4, end: atEnd });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    update();
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  function goTo(target: number) {
    const track = trackRef.current;
    const slide = track?.children[Math.max(0, Math.min(slideCount - 1, target))] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: "smooth" });
  }

  return (
    <div className="carousel" role="region" aria-roledescription="carousel" aria-label="Featured projects">
      <div className="carousel-controls">
        <p className="carousel-status" aria-live="polite">
          {index < projects.length ? `${index + 1} / ${projects.length} featured` : "All projects"}
        </p>
        <div className="carousel-arrows">
          <button type="button" className="carousel-arrow" onClick={() => goTo(index - 1)} disabled={edges.start} aria-label="Previous project">
            ←
          </button>
          <button type="button" className="carousel-arrow" onClick={() => goTo(index + 1)} disabled={edges.end} aria-label="Next project">
            →
          </button>
        </div>
      </div>

      <div className="carousel-track" ref={trackRef} tabIndex={0}>
        {projects.map((project, i) => (
          <div key={project.slug} className="carousel-slide" aria-label={`${i + 1} of ${projects.length}`}>
            <ProjectCard project={project} />
          </div>
        ))}
        <div className="carousel-slide">
          <Link href="/projects" className="card carousel-more">
            <span className="carousel-more-count">+{Math.max(totalCount - projects.length, 0)} more</span>
            <span className="carousel-more-title">Check all projects</span>
            <span className="carousel-more-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="carousel-dots" aria-hidden="true">
        {Array.from({ length: slideCount }, (_, i) => (
          <button key={i} type="button" tabIndex={-1} className={`carousel-dot${i === index ? " is-active" : ""}`} onClick={() => goTo(i)} />
        ))}
      </div>
    </div>
  );
}
