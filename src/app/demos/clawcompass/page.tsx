import type { Metadata } from "next";
import Link from "next/link";
import { ClawCompassDemo } from "@/components/demos/ClawCompassDemo";
import { Layout } from "@/components/Layout";

export const metadata: Metadata = {
  title: "ClawCompass: try the broker",
  description: "A live, in-browser demo of ClawCompass task analysis, secret redaction, capability ranking and guardrails.",
  alternates: { canonical: "/demos/clawcompass" }
};

export default function ClawCompassDemoPage() {
  return (
    <Layout>
      <main className="container page-spacing demo-page">
        <p className="eyebrow">Live demo</p>
        <h1>ClawCompass: try the broker</h1>
        <p className="lead">
          ClawCompass is a capability broker for autonomous agents: it picks the right tool, strips secrets from the context, and
          holds risky or paid actions for human approval. This page runs the project&apos;s own ranking, redaction and guardrail
          code in your browser.
        </p>

        <ClawCompassDemo />

        <p className="demo-note">Payments (x402), execution and reputation logging need the server and are not part of this demo.</p>
        <div className="project-links">
          <Link href="/projects/clawcompass" className="text-link">
            Project page
          </Link>
          <a href="https://github.com/PATELOM925/ClawCompass" target="_blank" rel="noreferrer">
            GitHub repository
          </a>
        </div>
      </main>
    </Layout>
  );
}
