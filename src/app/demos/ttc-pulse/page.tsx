import type { Metadata } from "next";
import Link from "next/link";
import { TtcPulseDemo, type TtcPulseStats } from "@/components/demos/TtcPulseDemo";
import { Layout } from "@/components/Layout";
import routeFile from "@/demos/ttc-pulse/data/e1_routes.json";
import stationFile from "@/demos/ttc-pulse/data/e2_stations.json";
import yearFile from "@/demos/ttc-pulse/data/e4_yearly.json";

export const metadata: Metadata = {
  title: "TTC Pulse: delay explorer",
  description: "An interactive explorer of TTC bus, subway and streetcar delay events, built from aggregates of the TTC Pulse data pipeline.",
  alternates: { canonical: "/demos/ttc-pulse" }
};

// Built from the copied data files when the page is prerendered.
const years = yearFile.rows.map((row) => row.year);
const stats: TtcPulseStats = {
  totalEvents: yearFile.rows.reduce((total, row) => total + row.events, 0),
  firstYear: Math.min(...years),
  lastYear: Math.max(...years),
  routeCount: routeFile.rows.length,
  subwayLineCount: routeFile.rows.filter((row) => row.mode === "subway").length,
  stationCount: stationFile.rows.length
};

export default function TtcPulseDemoPage() {
  return (
    <Layout>
      <main className="container page-spacing demo-page">
        <p className="eyebrow">Data explorer</p>
        <h1>TTC Pulse: delay explorer</h1>
        <p className="lead">
          TTC Pulse is a data pipeline that joins TTC delay logs, the GTFS schedule and live service alerts into bronze, silver
          and gold tables in DuckDB and Parquet. This page reads small aggregates exported from those gold tables.
        </p>

        <TtcPulseDemo stats={stats} />

        <section className="card demo-section" aria-labelledby="ttc-build">
          <h2 id="ttc-build">How this was built</h2>
          <p>
            The pipeline is written in Python. It uses DuckDB and Parquet, with bronze, silver and gold layers and a star schema.
            The full dashboard is a Streamlit app in the repository. This page uses five aggregate files exported from the gold
            tables. The data records delay events only.
          </p>
          <p>
            Subway totals differ between the source tables. The hourly and cause counts add up to more events than the route and
            yearly counts, so each section uses its own file.
          </p>
        </section>

        <div className="project-links">
          <Link href="/projects/ttc-interactive-dashboard" className="text-link">
            Project page
          </Link>
          <a href="https://github.com/PATELOM925/TTC-PULSE" target="_blank" rel="noreferrer">
            GitHub repository
          </a>
        </div>
      </main>
    </Layout>
  );
}
