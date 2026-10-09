// Ported from github.com/PATELOM925/ClawCompass (src/types/request.ts). Logic unchanged.
import type { RiskLevel } from "./capability";

export type CapabilityRequest = {
  requesterAgentId?: string;
  requesterWallet?: string;
  task: string;
  goal?: string;
  context?: string;
  budgetUsd?: number;
  maxRisk?: RiskLevel;
  allowedDataClasses?: string[];
};

export type TaskType =
  | "copywriting"
  | "research"
  | "code_review"
  | "repo_write"
  | "data_extraction"
  | "summarization"
  | "agent_safety"
  | "onboarding"
  | "unknown";

export type TaskAnalysis = {
  originalTask: string;
  taskType: TaskType;
  requiredCapabilities: string[];
  recommendedSequence: string[];
  sensitivity: "public" | "internal" | "confidential" | "secret";
  detectedSecrets: string[];
  budgetUsd: number;
  riskTolerance: RiskLevel;
  analysisSource: "llm" | "deterministic_fallback";
  model: string;
  confidence: number;
  fallbackReason?: string;
};

export type SecureContextPackage = {
  task: string;
  allowedContext: string;
  blockedContext: string[];
  detectedSecrets: string[];
  sensitivity: "public" | "internal" | "confidential" | "secret";
  approvalRequired: boolean;
};
