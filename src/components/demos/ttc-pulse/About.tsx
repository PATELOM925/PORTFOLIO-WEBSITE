import Link from "next/link";
import { Feedback } from "./Feedback";
import styles from "./About.module.css";

// Plain text under the dashboard. Search engines and AI agents read this; the charts load in the browser.
export function TtcPulseAbout({ techPost, formspreeId }: { techPost: { href: string; title: string } | null; formspreeId: string }) {
  return (
    <section className={styles.about} aria-label="About TTC Pulse">
      <div className={styles.card}>
        <h2>About TTC Pulse</h2>
        <p>
          TTC Pulse shows how reliable TTC buses, subways and streetcars have been, by route, station, hour and cause. It uses 1,111,831 delay events from
          January 2014 to January 2026, joined to the TTC schedule (GTFS) and to live TTC alerts.
        </p>
        <ul>
          <li>
            <b>Delays are concentrated.</b> 29 of 284 bus routes have 50.1% of all bus delay events. 32 Eglinton West has the most.
          </li>
          <li>
            <b>Rush hours carry a large share.</b> 42.8% of bus delay events occur on weekdays from 06:00 to 10:00 and from 15:00 to 19:00.
          </li>
          <li>
            <b>Mechanical faults are the top bus cause:</b> 234,358 of 723,518 bus delay events (32.4%).
          </li>
          <li>
            <b>The score has a sample-size fix.</b> Without it, a route with 10 delay events ranked first.
          </li>
        </ul>
        <p>The logs hold delays only, not on-time trips. So the dashboard shows counts, not rates.</p>
        <p className={styles.links}>
          {techPost ? <Link href={techPost.href}>How it works</Link> : null}
          <a href="https://github.com/PATELOM925/TTC-PULSE">Code on GitHub</a>
          <a href="https://open.toronto.ca/dataset/ttc-bus-delay-data/">Source data</a>
        </p>
      </div>
      <div className={styles.card}>
        <h2>Tell me what to add</h2>
        <p>Do you ride the TTC, or hire for data roles? Your note decides what I build next.</p>
        <Feedback formspreeId={formspreeId} />
      </div>
    </section>
  );
}
