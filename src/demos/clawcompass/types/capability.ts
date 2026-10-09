// Ported from github.com/PATELOM925/ClawCompass (src/types/capability.ts). Logic unchanged.
export type CapabilityType =
  | "skill"
  | "mcp"
  | "plugin"
  | "hook"
  | "rule"
  | "sub_agent"
  | "github_project";

export type RiskLevel = "low" | "medium" | "high";

export type CapabilityListing = {
  id: string;
  name: string;
  type: CapabilityType;
  description: string;
  providerName: string;
  providerWallet?: string;
  supportedTasks: string[];
  inputRequirements: string[];
  outputFormat: string;
  priceUsd: number;
  priceToken: "USDC" | "USDT" | "FREE";
  pricingModel: "free" | "per_call" | "per_bundle";
  trustScore: number;
  successRate: number;
  usageCount: number;
  riskLevel: RiskLevel;
  permissions: string[];
  verified: boolean;
  erc8004AgentId?: string;
  endpointUrl?: string;
  repoUrl?: string;
  lastCheckedAt: string;
};

export type RankedCapability = {
  capability: CapabilityListing;
  score: number;
  reasons: string[];
};

export type CapabilitySequenceStep = {
  step: number;
  capabilityId: string;
  name: string;
  purpose: string;
};
