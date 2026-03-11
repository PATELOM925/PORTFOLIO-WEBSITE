"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function FloatingAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const href = pathname === "/" ? "/#assistant" : "/#assistant";

  return (
    <div className="floating-assistant" aria-live="polite">
      <button
        type="button"
        className="assistant-fab"
        aria-expanded={open}
        aria-controls="assistant-fab-panel"
        aria-label="Open recruiter fit assistant"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="assistant-fab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span>Recruiter Bot</span>
      </button>

      {open ? (
        <div id="assistant-fab-panel" className="assistant-fab-panel">
          <p>Share a role or JD to review Om&apos;s fit against your requirements.</p>
          <Link href={href} className="btn btn-primary" onClick={() => setOpen(false)}>
            Open assistant
          </Link>
        </div>
      ) : null}
    </div>
  );
}
