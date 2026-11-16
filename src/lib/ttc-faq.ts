import entitiesFile from "@/demos/ttc-pulse/data/entities.json";
import overviewFile from "@/demos/ttc-pulse/data/overview.json";

// Questions people ask about TTC delays, with answers computed from the dashboard data.
// The page, the FAQPage data and llms.txt all use this list, so the numbers stay the same everywhere.

type Mode = "bus" | "streetcar" | "subway";
type Entity = { id: string; name: string; events: number };

const fmt = (n: number) => n.toLocaleString("en-US");
const pct = (part: number, whole: number) => `${((100 * part) / whole).toFixed(1)}%`;
const hour = (h: number) => `${String(h).padStart(2, "0")}:00 to ${String(h + 1).padStart(2, "0")}:00`;
const RANGE = "from January 2014 to January 2026";

const modes = overviewFile.modes as unknown as Record<Mode, { total: number; years: number[]; grid: number[][]; rushShare: number; causes: [string, number][] }>;
const firstYear = overviewFile.meta.years[0];

function top(mode: Mode, count: number): Entity[] {
  return [...(entitiesFile as unknown as Record<Mode, Entity[]>)[mode]].sort((a, b) => b.events - a.events).slice(0, count);
}

function busRoute(e: Entity) {
  return `${e.id} ${e.name}`;
}

function peakHours(mode: Mode) {
  const grid = modes[mode].grid;
  const byHour = Array.from({ length: 24 }, (_, h) => grid.reduce((sum, day) => sum + day[h], 0));
  return byHour
    .map((n, h) => ({ h, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((x) => ({ ...x, share: pct(x.n, modes[mode].total) }));
}

function topCause(mode: Mode) {
  const [name, n] = modes[mode].causes[0];
  return { name, n, share: pct(n, modes[mode].total) };
}

function busiestYear(mode: Mode) {
  const years = modes[mode].years;
  const i = years.indexOf(Math.max(...years));
  return { year: firstYear + i, n: years[i], last: { year: firstYear + years.length - 1, n: years[years.length - 1] }, first: { year: firstYear, n: years[0] } };
}

export type Faq = { question: string; answer: string };

export function ttcFaqs(): Faq[] {
  const bus = top("bus", 3);
  const streetcar = top("streetcar", 2);
  const stations = top("subway", 3);
  const busPeak = peakHours("bus");
  const subwayPeak = peakHours("subway");
  const streetcarPeak = peakHours("streetcar");
  const busCause = topCause("bus");
  const streetcarCause = topCause("streetcar");
  const subwayYear = busiestYear("subway");
  const busYear = busiestYear("bus");
  const total = modes.bus.total + modes.streetcar.total + modes.subway.total;

  return [
    {
      question: "Which TTC bus route has the most delays?",
      answer: `Route ${busRoute(bus[0])} has the most recorded bus delay events: ${fmt(bus[0].events)} ${RANGE}. Next are ${busRoute(bus[1])} (${fmt(bus[1].events)}) and ${busRoute(bus[2])} (${fmt(bus[2].events)}). These are counts, so busy routes with more trips also get more delay events.`
    },
    {
      question: "Which TTC streetcar route has the most delays?",
      answer: `Route ${busRoute(streetcar[0])} has the most streetcar delay events: ${fmt(streetcar[0].events)} ${RANGE}. Route ${busRoute(streetcar[1])} is second with ${fmt(streetcar[1].events)}.`
    },
    {
      question: "Which TTC subway station has the most delays?",
      answer: `${stations[0].name} station has the most subway delay events: ${fmt(stations[0].events)} ${RANGE}. Next are ${stations[1].name} (${fmt(stations[1].events)}) and ${stations[2].name} (${fmt(stations[2].events)}). All three are at the end of a line, where trains turn back.`
    },
    {
      question: "What time of day do most TTC delays happen?",
      answer: `For buses, the worst hours are ${hour(busPeak[0].h)} (${busPeak[0].share} of bus delay events) and ${hour(busPeak[1].h)} (${busPeak[1].share}). For the subway, the worst hour is ${hour(subwayPeak[0].h)} (${subwayPeak[0].share}). For streetcars, it is ${hour(streetcarPeak[0].h)} (${streetcarPeak[0].share}). Weekday rush hours (06:00 to 10:00 and 15:00 to 19:00) have ${modes.bus.rushShare}% of all bus delay events.`
    },
    {
      question: "What causes most TTC delays?",
      answer: `${busCause.name} faults are the top cause of bus delays: ${fmt(busCause.n)} of ${fmt(modes.bus.total)} bus delay events (${busCause.share}). ${streetcarCause.name} faults are also the top cause for streetcars (${streetcarCause.share}). Subway delays have more varied causes, such as speed control, ill customers and disorderly patrons.`
    },
    {
      question: "Are TTC subway delays getting worse?",
      answer: `The number of recorded subway delay events went up. It was ${fmt(subwayYear.first.n)} in ${subwayYear.first.year} and ${fmt(subwayYear.n)} in ${subwayYear.year}, the most of any year. In ${subwayYear.last.year} it was ${fmt(subwayYear.last.n)}. Bus delay events had their peak in ${busYear.year} (${fmt(busYear.n)}). Changes in how the TTC logs delays can also change these counts.`
    },
    {
      question: "Does TTC Pulse show on-time performance?",
      answer: "No. The TTC delay logs record delays only, not trips that were on time. So TTC Pulse shows counts of delay events, not delay rates. The reliability score adds a sample-size adjustment, so a route with few events cannot rank first by chance."
    },
    {
      question: "Where does the TTC Pulse data come from?",
      answer: `The data is the City of Toronto Open Data TTC bus, subway and streetcar delay logs: ${fmt(total)} delay events ${RANGE}. The events are joined to the TTC GTFS schedule. The Live view uses the TTC real-time feeds for alerts and vehicle positions.`
    },
    {
      question: "Who made TTC Pulse?",
      answer: "TTC Pulse started as a team project at York University in Winter 2026. Om Patel built the public dashboard, the reliability score fix and the AI chat that answers questions from the data."
    }
  ];
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } }))
  };
}
