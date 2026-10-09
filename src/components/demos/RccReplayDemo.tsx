"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import transcript from "@/demos/remote-codex-control/transcript.json";

// One caption per recorded exchange, in the same order as the transcript.
const CAPTIONS = [
  "The daemon reports its health and its link to the coding agent.",
  "Only allowlisted project folders are listed.",
  "The operator starts an agent thread in a project from the phone.",
  "The agent asks for permission. RCC sends an approval card with the project, thread and action.",
  "Pending approvals are listed with their age.",
  "The operator approves. The decision goes back to the agent.",
  "A repeated tap is recognised and does not act twice.",
  "A request that is already resolved cannot be changed.",
  "An unknown approval ID is rejected."
];

const STEPS = transcript.map((exchange, index) => ({ ...exchange, caption: CAPTIONS[index] }));
const TOTAL = STEPS.length;
const STEP_INTERVAL_MS = 1400;

const noopSubscribe = () => () => {};

export function RccReplayDemo() {
  // Every step is shown on the first render, so the server HTML and the no-JavaScript view show the full transcript.
  const [shown, setShown] = useState(TOTAL);
  const [replaying, setReplaying] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const interacted = useRef(false);
  // The controls and the scroll box only apply once JavaScript runs in the browser.
  const scriptReady = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!replaying || shown >= TOTAL) return;
    const timer = window.setTimeout(() => setShown((count) => count + 1), STEP_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [replaying, shown]);

  useEffect(() => {
    // Scroll the panel, never the page. The newest step is always the last one in the panel.
    if (!interacted.current || !panelRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current.scrollTo({ top: panelRef.current.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [shown]);

  function replayFromStart() {
    interacted.current = true;
    setShown(0);
    setReplaying(true);
  }

  function nextStep() {
    interacted.current = true;
    setReplaying(false);
    // After the last step, the next press starts again from step 1.
    setShown((count) => (count >= TOTAL ? 1 : count + 1));
  }

  function showAll() {
    interacted.current = true;
    setReplaying(false);
    setShown(TOTAL);
  }

  const status = shown === 0 ? "No steps shown" : `Step ${shown} of ${TOTAL}`;

  return (
    <div className="demo-stack">
      {scriptReady ? (
        <div className="demo-controls" role="group" aria-label="Replay controls">
          <button type="button" className="btn btn-primary" onClick={replayFromStart}>
            Replay from start
          </button>
          <button type="button" className="btn btn-secondary" onClick={nextStep}>
            Next step
          </button>
          <button type="button" className="btn btn-secondary" onClick={showAll}>
            Show all
          </button>
          <p className="demo-status" role="status">
            {status}
          </p>
        </div>
      ) : null}

      <section
        ref={panelRef}
        className={scriptReady ? "card demo-chat-panel demo-chat-panel-scroll" : "card demo-chat-panel"}
        aria-label="RCC replay transcript"
        tabIndex={0}
      >
        <ol className="demo-chat-steps">
          {STEPS.slice(0, shown).map((step, index) => (
            <li key={index} className="demo-step">
              <p className="demo-step-caption">{step.caption}</p>
              <div className="demo-bubbles">
                <p className="demo-bubble demo-bubble-operator">
                  <span className="demo-visually-hidden">Operator: </span>
                  {step.operator}
                </p>
                <p className="demo-bubble demo-bubble-rcc">
                  <span className="demo-visually-hidden">RCC: </span>
                  {step.rcc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
