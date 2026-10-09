import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const baseUrl = process.env.PORTFOLIO_BASE_URL || "http://127.0.0.1:3100";

async function fetchText(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { response, text: await response.text() };
}

test("homepage presents the current Canada job-search profile", async () => {
  const { response, text } = await fetchText("/");

  assert.equal(response.status, 200);
  assert.match(text, /Applied AI Engineer/);
  assert.match(text, /Aug 2026/);
  assert.match(text, /\+1 437-212-3702/);
  assert.match(text, /BarLens/);
  assert.match(text, /Sentiment Detection and Cross-Lingual Preservation/);
  assert.match(text, /Winner, AgentShyft Hackathon/);
});

test("featured work shows the five projects closest to the target roles, in order", async () => {
  const { response, text } = await fetchText("/");
  assert.equal(response.status, 200);

  const featuredStart = text.indexOf("Featured Projects");
  const featuredEnd = text.indexOf(">Blog<", featuredStart);
  assert.ok(featuredStart >= 0 && featuredEnd > featuredStart, "featured projects section is rendered");

  const featured = text.slice(featuredStart, featuredEnd);
  const synapseIndex = featured.indexOf("Synapse AI");
  const ttcIndex = featured.indexOf("TTC Interactive Dashboard");
  const remoteCodexIndex = featured.indexOf("Remote Codex Control");
  const trafficIndex = featured.indexOf("Toronto Traffic Anomaly Detection");
  const jsspIndex = featured.indexOf("LLMs for Job-Shop Scheduling");
  assert.ok(synapseIndex >= 0, "Synapse AI is featured first");
  assert.ok(ttcIndex > synapseIndex, "TTC follows Synapse AI");
  assert.ok(remoteCodexIndex > ttcIndex, "Remote Codex Control follows TTC");
  assert.ok(trafficIndex > remoteCodexIndex, "Toronto Traffic Anomaly Detection follows Remote Codex Control");
  assert.ok(jsspIndex > trafficIndex, "LLMs for Job-Shop Scheduling follows Toronto Traffic Anomaly Detection");
  assert.doesNotMatch(featured, /1Pour|BarLens/, "1Pour is experience, not a featured project");
  assert.doesNotMatch(
    featured,
    /ChatPDF AI|Autograder|Legal Clarity|GreenArm|Interview Lens|ClawCompass/
  );
});

test("project catalog removes PixelVault and uses the exact Synapse AI name", async () => {
  const { response, text } = await fetchText("/projects");

  assert.equal(response.status, 200);
  assert.doesNotMatch(text, /PixelVault|image-processing-project/);
  assert.match(text, />Synapse AI</);
  assert.doesNotMatch(text, /Synapse AI:/);

  const removed = await fetch(`${baseUrl}/projects/image-processing-project`);
  assert.equal(removed.status, 404);
});

test("hackathon work has dedicated project pages and only verified source links", async () => {
  const interviewLens = await fetchText("/projects/interview-lens");
  assert.equal(interviewLens.response.status, 200);
  assert.match(interviewLens.text, /structured interview brief/i);
  assert.doesNotMatch(interviewLens.text, /\/go\/project\/interview-lens\/github/);

  const clawCompass = await fetchText("/projects/clawcompass");
  assert.equal(clawCompass.response.status, 200);
  assert.match(clawCompass.text, /capability broker/i);
  assert.match(clawCompass.text, /\/go\/project\/clawcompass\/github/);
});

test("ClawCompass live demo runs in the browser and the project page links to it", async () => {
  const demo = await fetchText("/demos/clawcompass");
  assert.equal(demo.response.status, 200);
  assert.match(demo.text, /ClawCompass/);
  assert.match(demo.text, /deterministic analyzer/);

  const project = await fetchText("/projects/clawcompass");
  assert.equal(project.response.status, 200);
  assert.match(project.text, /\/go\/project\/clawcompass\/demo/);

  const redirect = await fetch(`${baseUrl}/go/project/clawcompass/demo`, { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(new URL(redirect.headers.get("location"), baseUrl).pathname, "/demos/clawcompass");
});

test("BarLens is shown as experience only, with the resume bullets", async () => {
  const homepage = await fetchText("/");
  const projects = await fetchText("/projects");

  assert.equal(homepage.response.status, 200);
  assert.match(homepage.text, /BarLens, Toronto/);
  assert.match(homepage.text, /reduce manual work by 64%/);
  assert.match(homepage.text, /POS reconciliation/);
  assert.match(homepage.text, /Playwright e2e tests, CI checks and Sentry monitoring/);
  assert.match(homepage.text, /serving dashboard endpoints in under 1\.5 s/);
  assert.doesNotMatch(homepage.text, /20\+ locations|throughput by around 23%/);
  assert.doesNotMatch(projects.text, /1Pour|BarLens/);
  assert.doesNotMatch(homepage.text, /\/go\/project\/barlens/);

  const redirect = await fetch(`${baseUrl}/projects/barlens`, { redirect: "manual" });
  assert.ok([301, 308].includes(redirect.status));
  assert.match(redirect.headers.get("location"), /#experience$/);
});

test("homepage shows the current MSc GPA and full-time availability", async () => {
  const { response, text } = await fetchText("/");
  assert.equal(response.status, 200);
  assert.match(text, /3\.77\/4/);
  assert.doesNotMatch(text, /3\.63\/4/);
  assert.match(text, /Available for full-time/);
});

test("homepage sections follow the recruiter-first order", async () => {
  const { text } = await fetchText("/");
  const order = ["experience", "education", "research", "projects", "skills", "blog", "fit-check", "contact"].map((id) =>
    text.indexOf(`<section id="${id}"`)
  );
  order.forEach((position, i) => assert.ok(position > 0, `section ${i} renders`));
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1], "sections are in order");
});

test("featured projects carousel shows five cards and a link to all projects", async () => {
  const { text } = await fetchText("/");
  const start = text.indexOf('<section id="projects"');
  const section = text.slice(start, text.indexOf("</section>", start));
  assert.equal((section.match(/class="carousel-slide"/g) || []).length, 6);
  assert.match(section, /Check all projects/);
  assert.match(section, /href="\/projects"/);
});

test("floating Role Fit Check button links straight to the section", async () => {
  const { text } = await fetchText("/");
  assert.match(text, /class="assistant-fab"[^>]*href="\/#fit-check"|href="\/#fit-check"[^>]*class="assistant-fab"/);
  assert.match(text, /Role Fit Check/);
  assert.doesNotMatch(text, /Recruiter Bot|Recruiter Fit Assistant/);
});

test("recruiter assistant offers full-time roles plus a custom role", async () => {
  const { text } = await fetchText("/");
  const start = text.indexOf("assistant-select");
  const end = text.indexOf("</select>", start);
  const select = text.slice(start, end);
  assert.ok(start >= 0 && end > start, "role select is rendered");
  assert.doesNotMatch(select, /Intern/);
  assert.match(select, /Custom role/);
});

test("projects page has category filters and interactive how-it-works", async () => {
  const list = await fetchText("/projects");
  assert.match(list.text, /filter-chip/);
  assert.match(list.text, /Applied AI &amp; Agents/);

  const detail = await fetchText("/projects/synapse-ai");
  assert.match(detail.text, /class="pipeline"/);
  assert.match(detail.text, /Teacher review/);

  const autograder = await fetchText("/projects/autograder");
  assert.match(autograder.text, /video-facade/);
});

test("blog posts render interactive charts and pipelines", async () => {
  const { response, text } = await fetchText("/blog/jssp-constraint-serialization-notes");
  assert.equal(response.status, 200);
  assert.match(text, /class="chart"/);
  assert.match(text, /9,525/);
  assert.match(text, /class="pipeline"/);
  assert.doesNotMatch(text, /language-chart|language-pipeline/);
});

test("ChatPDF matches the resume", async () => {
  const { response, text } = await fetchText("/projects/chatpdf-ai");
  assert.equal(response.status, 200);
  assert.match(text, /LangChain/);
  assert.match(text, /FAISS/);
  assert.match(text, /OpenAI Agents SDK/);
  assert.match(text, /80% accuracy on a manual test set/);
});

test("TTC project exposes the verified repository without an unverified demo", async () => {
  const { response, text } = await fetchText("/projects/ttc-interactive-dashboard");

  assert.equal(response.status, 200);
  assert.match(text, /TTC Interactive Dashboard/);
  assert.match(text, /1 million\+/);
  assert.doesNotMatch(text, /1,004,682/);
  assert.match(text, /route|station/i);
  assert.match(text, /\/go\/project\/ttc-interactive-dashboard\/github/);
  assert.doesNotMatch(text, /\/go\/project\/ttc-interactive-dashboard\/demo/);
});

test("resume route serves the current PDF asset", async () => {
  const redirect = await fetch(`${baseUrl}/go/resume`, { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(new URL(redirect.headers.get("location")).pathname, "/assets/Om_Resume.pdf");

  const resume = await fetch(`${baseUrl}/assets/Om_Resume.pdf`);
  assert.equal(resume.status, 200);
  assert.equal(resume.headers.get("content-type"), "application/pdf");
  assert.ok((await resume.arrayBuffer()).byteLength > 20_000, "resume PDF is not an empty placeholder");
});

test("downloadable resume contains the current Canadian facts", () => {
  const extracted = spawnSync("pdftotext", ["public/assets/Om_Resume.pdf", "-"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8"
  });

  assert.equal(extracted.status, 0, extracted.stderr);
  const text = extracted.stdout.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-");
  assert.match(text, /\+1 437-212-3702/);
  assert.match(text, /Applied AI Engineer/);
  assert.match(text, /Jun 2026 - Aug 2026/);
  assert.match(text, /Remote Codex Control/);
  assert.match(text, /Specialization in Artificial Intelligence/);
  assert.doesNotMatch(text, /\+91|Gandhinagar, Gujarat|Final-year/);
});
