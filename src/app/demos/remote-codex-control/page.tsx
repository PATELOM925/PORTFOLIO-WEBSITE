import type { Metadata } from "next";
import Link from "next/link";
import { RccReplayDemo } from "@/components/demos/RccReplayDemo";
import { Layout } from "@/components/Layout";

export const metadata: Metadata = {
  title: "Remote Codex Control: approval replay",
  description: "A step-by-step replay of a recorded Remote Codex Control session, from the project's demo script.",
  alternates: { canonical: "/demos/remote-codex-control" }
};

export default function RemoteCodexControlDemoPage() {
  return (
    <Layout>
      <main className="container page-spacing demo-page">
        <p className="eyebrow">Recorded demo</p>
        <h1>Remote Codex Control: approval replay</h1>
        <p className="lead">
          Remote Codex Control (RCC) is a human-approval layer for autonomous coding agents: an operator approves, steers or
          denies each tool action from a private Telegram chat while the code stays on their own machine. This page replays a
          real session from the project&apos;s demo script.
        </p>

        <RccReplayDemo />

        <section className="card demo-section">
          <h2>What this shows</h2>
          <ul>
            <li>Approval routing with project and thread context.</li>
            <li>Idempotent callbacks: a repeated tap is recognised and does not act twice.</li>
            <li>Stale or unknown approvals rejected.</li>
          </ul>
        </section>

        <p className="demo-note">
          This is a recorded transcript from <code>npm run demo</code> in the repository. It runs the real daemon against mock
          Codex and Telegram clients, so it needs no bot token and no Codex install. IDs and times are shown as placeholders.
        </p>
        <div className="project-links">
          <Link href="/projects/remote-codex-control" className="text-link">
            Project page
          </Link>
          <a href="https://github.com/PATELOM925/Remote-Codex-Control-Public" target="_blank" rel="noreferrer">
            GitHub repository
          </a>
        </div>
      </main>
    </Layout>
  );
}
