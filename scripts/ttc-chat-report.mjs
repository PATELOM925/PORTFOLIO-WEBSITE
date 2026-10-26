// Joins the chat votes to the chat answers in Workers Analytics Engine, and lists each thumbs-down question.
// Each thumbs-down question becomes a new eval item: add it to scripts/ttc-chat-eval.json with the expected answer.
// Needs CF_ACCOUNT_ID and CF_API_TOKEN (a token with Account Analytics: Read). Usage: node scripts/ttc-chat-report.mjs [--days 7]
const account = process.env.CF_ACCOUNT_ID;
const token = process.env.CF_API_TOKEN;
if (!account || !token) {
  console.error("Set CF_ACCOUNT_ID and CF_API_TOKEN.");
  process.exit(2);
}
const daysArg = process.argv.indexOf("--days");
const days = Math.max(1, Math.min(90, Number(daysArg === -1 ? 7 : process.argv[daysArg + 1]) || 7));

async function sql(query) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: query
  });
  if (!response.ok) throw new Error(`Analytics Engine returned ${response.status}: ${await response.text()}`);
  return (await response.json()).data;
}

// Blobs and doubles follow src/lib/chat/log.ts.
const answers = await sql(`
  SELECT blob4 AS requestId, blob1 AS route, blob2 AS outcome, blob10 AS model, blob6 AS mode, blob7 AS topChunk, blob9 AS question,
         double1 AS latencyMs, double5 AS inputTokens, double6 AS outputTokens, double7 AS cacheReadTokens, double10 AS ungrounded, double11 AS fallback
  FROM TTCAnalytics
  WHERE index1 != 'feedback' AND timestamp > NOW() - INTERVAL '${days}' DAY
  LIMIT 10000`);
const votes = await sql(`
  SELECT blob4 AS requestId, blob2 AS vote
  FROM TTCAnalytics
  WHERE index1 = 'feedback' AND timestamp > NOW() - INTERVAL '${days}' DAY
  LIMIT 10000`);

const byId = new Map(answers.map((a) => [a.requestId, a]));
const split = {};
for (const a of answers) split[`${a.route}/${a.model}`] = (split[`${a.route}/${a.model}`] ?? 0) + 1;
const outcomes = {};
for (const a of answers) outcomes[a.outcome] = (outcomes[a.outcome] ?? 0) + 1;
const down = votes.filter((v) => v.vote === "down").map((v) => byId.get(v.requestId)).filter(Boolean);
const latencies = answers.filter((a) => a.model === "haiku").map((a) => Number(a.latencyMs)).sort((a, b) => a - b);
const p = (q) => (latencies.length ? latencies[Math.min(latencies.length - 1, Math.ceil(q * latencies.length) - 1)] : null);

console.log(JSON.stringify({ days, answers: answers.length, votes: votes.length, up: votes.filter((v) => v.vote === "up").length, down: down.length, split, outcomes, haikuLatencyMs: { p50: p(0.5), p90: p(0.9) }, ungroundedAnswers: answers.filter((a) => Number(a.ungrounded) > 0).length }, null, 2));
console.log("\nThumbs-down questions, as eval item drafts:");
down.forEach((a, i) => console.log(JSON.stringify({ id: `f${String(i + 1).padStart(2, "0")}`, question: a.question, mode: a.mode, expect: { numbers: [], cite: [a.topChunk] }, seen: { route: a.route, model: a.model, outcome: a.outcome } })));
