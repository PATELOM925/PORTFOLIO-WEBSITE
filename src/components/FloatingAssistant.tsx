"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FloatingAssistant() {
  const pathname = usePathname();
  const onFitCheck = pathname === "/";

  return (
    <div className="floating-assistant">
      <Link
        href="/#fit-check"
        className="assistant-fab"
        aria-label="Open Role Fit Check: see how Om matches your role"
        onClick={() => {
          if (!onFitCheck) return;
          // Same page: focus the first field once the smooth scroll starts.
          window.setTimeout(() => document.querySelector<HTMLSelectElement>("#fit-check select")?.focus({ preventScroll: true }), 400);
        }}
      >
        <span className="assistant-fab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="assistant-fab-label">Role Fit Check</span>
      </Link>
    </div>
  );
}
