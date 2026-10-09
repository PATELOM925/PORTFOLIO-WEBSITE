// Ported from github.com/PATELOM925/ClawCompass (src/services/capabilityRanker.ts). Logic unchanged.
import type { CapabilityListing, RankedCapability } from "../types/capability";
import type { SecureContextPackage, TaskAnalysis } from "../types/request";

export function rankCapabilities(
  analysis: TaskAnalysis,
  secureContext: SecureContextPackage,
  capabilities: CapabilityListing[]
): RankedCapability[] {
  const scored = capabilities
    .map((capability) => scoreCapability(analysis, secureContext, capability))
    .sort((left, right) => right.score - left.score);
  const affordable = scored.filter((item) => item.capability.priceUsd <= analysis.budgetUsd);
  return affordable.length > 0 ? affordable : scored;
}

function scoreCapability(
  analysis: TaskAnalysis,
  secureContext: SecureContextPackage,
  capability: CapabilityListing
): RankedCapability {
  const fit = taskFit(analysis, capability);
  const trust = capability.trustScore;
  const success = capability.successRate * 100;
  const safety = contextSafety(secureContext, capability);
  const price = priceEfficiency(analysis.budgetUsd, capability.priceUsd);
  const simple = capability.permissions.length <= 2 ? 100 : 60;
  const score = fit * 0.35 + trust * 0.2 + success * 0.15 + safety * 0.15 + price * 0.1 + simple * 0.05;

  return { capability, score: Math.round(score), reasons: buildReasons(analysis, capability, fit, safety) };
}

function taskFit(analysis: TaskAnalysis, capability: CapabilityListing): number {
  const supported = capability.supportedTasks;
  if (analysis.requiredCapabilities.some((required) => supported.includes(required))) return 100;
  if (supported.includes(analysis.taskType)) return 92;
  if (analysis.taskType === "copywriting" && supported.includes("positioning")) return 88;
  if (analysis.taskType === "summarization" && supported.includes("summarization")) return 100;
  return 35;
}

function contextSafety(secureContext: SecureContextPackage, capability: CapabilityListing): number {
  if (capability.riskLevel === "high") return 35;
  if (secureContext.sensitivity === "secret" && capability.permissions.includes("write_repo")) return 20;
  return capability.verified ? 95 : 55;
}

function priceEfficiency(budgetUsd: number, priceUsd: number): number {
  if (priceUsd === 0) return 100;
  if (budgetUsd === 0) return 50;
  return priceUsd <= budgetUsd ? 100 : 25;
}

function buildReasons(
  analysis: TaskAnalysis,
  capability: CapabilityListing,
  fit: number,
  safety: number
): string[] {
  return [
    `task_fit=${fit} for ${analysis.requiredCapabilities.join(",")}`,
    `trust=${capability.trustScore}`,
    `risk=${capability.riskLevel}`,
    `context_safety=${safety}`,
    `price=${capability.priceUsd} ${capability.priceToken}`
  ];
}
