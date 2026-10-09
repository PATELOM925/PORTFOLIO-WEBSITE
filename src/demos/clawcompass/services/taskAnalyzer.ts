// Ported from github.com/PATELOM925/ClawCompass (src/services/taskAnalyzer.ts). Logic unchanged.
// Only the deterministic analyzer is kept. The LLM path is removed.
import type { CapabilityRequest, TaskAnalysis, TaskType } from "../types/request";
import type { RiskLevel } from "../types/capability";

const defaultModel = "claude-sonnet-4-6";

const taskRules: Array<{ type: TaskType; tokens: string[]; capabilities: string[] }> = [
  { type: "repo_write", tokens: ["rewrite", "push", "commit", "pull request"], capabilities: ["repo_write"] },
  {
    type: "onboarding",
    tokens: [
      "clawup",
      "openclaw",
      "telegram pairing",
      "pairing",
      "botfather",
      "erc-8004",
      "erc8004",
      "8004scan",
      "x402",
      "merchant portal",
      "mainnet registration",
      "gas tokens",
      "stables",
      "submission readiness",
      "setup"
    ],
    capabilities: ["clawup_setup", "telegram_pairing", "erc8004", "x402", "submission_readiness"]
  },
  { type: "copywriting", tokens: ["homepage", "pitch", "copy", "landing"], capabilities: ["landing_page_copy"] },
  { type: "research", tokens: ["research", "market", "competitor"], capabilities: ["market_validation"] },
  { type: "code_review", tokens: ["review code", "readme", "bug"], capabilities: ["code_review"] },
  { type: "agent_safety", tokens: ["guardrail", "safety", "approval", "rule"], capabilities: ["agent_safety"] },
  { type: "summarization", tokens: ["summarize", "summary", "condense"], capabilities: ["summarization"] },
  { type: "data_extraction", tokens: ["extract", "parse"], capabilities: ["data_extraction"] }
];

export function analyzeTask(request: CapabilityRequest): TaskAnalysis {
  const task = request.task.trim();
  const matches = taskRules.filter((rule) => containsAny(task, rule.tokens));
  const match = matches[0];
  const highRisk = containsAny(task, ["push", "wallet", "transfer", "deploy", "private key"]);
  const requiredCapabilities = Array.from(
    new Set(matches.flatMap((rule) => rule.capabilities))
  );
  const taskType = match?.type ?? "unknown";

  return {
    originalTask: task,
    taskType,
    requiredCapabilities: requiredCapabilities.length ? requiredCapabilities : ["general_capability_routing"],
    recommendedSequence: recommendSequence(task, taskType, requiredCapabilities),
    sensitivity: highRisk ? "confidential" : "internal",
    detectedSecrets: [],
    budgetUsd: request.budgetUsd ?? parseBudget(task) ?? 0.1,
    riskTolerance: chooseRiskTolerance(request.maxRisk, highRisk),
    analysisSource: "deterministic_fallback",
    model: defaultModel,
    confidence: match ? 0.72 : 0.6
  };
}

function containsAny(value: string, tokens: string[]): boolean {
  const lower = value.toLowerCase();
  return tokens.some((token) => lower.includes(token));
}

function parseBudget(task: string): number | undefined {
  const match = task.match(/budget\s*:?\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : undefined;
}

function chooseRiskTolerance(maxRisk: RiskLevel | undefined, highRisk: boolean): RiskLevel {
  if (maxRisk) return maxRisk;
  return highRisk ? "high" : "low";
}

function recommendSequence(task: string, taskType: TaskType, requiredCapabilities: string[]): string[] {
  const lower = task.toLowerCase();
  const wantsResearch = requiredCapabilities.includes("market_validation") || containsAny(lower, ["market", "research", "validate"]);
  const wantsCopy = requiredCapabilities.includes("landing_page_copy") || containsAny(lower, ["homepage", "pitch", "copy", "position"]);
  const wantsSafety = requiredCapabilities.includes("agent_safety") || containsAny(lower, ["safe", "safety", "guardrail", "rules"]);
  const sequence: string[] = [];

  if (wantsResearch || taskType === "research") sequence.push("researchfox");
  if (wantsCopy && !sequence.includes("researchfox")) sequence.push("researchfox");
  if (wantsCopy || taskType === "copywriting") sequence.push("pitchhawk");
  if (taskType === "code_review") sequence.push("codewolf");
  if (taskType === "repo_write") sequence.push("codewolf", "githubhelper");
  if (taskType === "onboarding") sequence.push("setuppilot", "hookguard");
  if (taskType === "summarization" || taskType === "data_extraction") sequence.push("freesummarizer");
  if (wantsSafety || taskType === "agent_safety" || taskType === "repo_write") sequence.push("hookguard");
  if (!sequence.length) sequence.push("freesummarizer");

  return Array.from(new Set(sequence)).slice(0, 3);
}
