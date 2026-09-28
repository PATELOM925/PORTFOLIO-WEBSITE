"use client";

import { useEffect, useState } from "react";

interface PipelineDiagramProps {
  steps: string[];
  title?: string;
}

const STEP_MS = 1100;

export function PipelineDiagram({ steps, title = "How it works" }: PipelineDiagramProps) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (active >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setActive((index) => index + 1), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, active, steps.length]);

  function onPlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (active >= steps.length - 1) setActive(0);
    setPlaying(true);
  }

  return (
    <figure className="pipeline">
      <div className="pipeline-head">
        <figcaption>{title}</figcaption>
        <div className="pipeline-controls">
          <button type="button" className="pipeline-btn" onClick={() => setActive((i) => Math.max(0, i - 1))} disabled={active === 0} aria-label="Previous step">
            ‹
          </button>
          <button type="button" className="pipeline-btn pipeline-play" onClick={onPlay} aria-pressed={playing}>
            {playing ? "Pause" : active >= steps.length - 1 ? "Replay" : "Play"}
          </button>
          <button
            type="button"
            className="pipeline-btn"
            onClick={() => setActive((i) => Math.min(steps.length - 1, i + 1))}
            disabled={active === steps.length - 1}
            aria-label="Next step"
          >
            ›
          </button>
        </div>
      </div>
      <ol className="pipeline-track">
        {steps.map((step, index) => (
          <li key={step} className={index === active ? "is-active" : index < active ? "is-done" : undefined}>
            <button type="button" onClick={() => { setPlaying(false); setActive(index); }} aria-current={index === active ? "step" : undefined}>
              <span className="pipeline-index">{index + 1}</span>
              <span>{step}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="pipeline-status" aria-live="polite">
        Step {active + 1} of {steps.length}: <strong>{steps[active]}</strong>
      </p>
    </figure>
  );
}
