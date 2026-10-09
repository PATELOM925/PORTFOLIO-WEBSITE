// Ported from github.com/PATELOM925/ClawCompass (src/services/contextSanitizer.ts). Logic unchanged.
import type { SecureContextPackage } from "../types/request";

type RedactionRule = {
  label: string;
  pattern: RegExp;
  replacement: string;
};

const rules: RedactionRule[] = [
  { label: "api_key", pattern: /\b[A-Z0-9_]*API[_-]?KEY\s*=\s*[\w-]{20,}/gi, replacement: "[REDACTED_API_KEY]" },
  { label: "api_key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g, replacement: "[REDACTED_API_KEY]" },
  { label: "oauth_token", pattern: /\b[A-Z0-9_]*OAUTH[A-Z0-9_]*TOKEN\s*=\s*[^\s]+/gi, replacement: "[REDACTED_OAUTH_TOKEN]" },
  { label: "env_secret", pattern: /\b(?:SECRET|TOKEN|PRIVATE_KEY|PASSWORD)\s*=\s*[^\s]+/gi, replacement: "[REDACTED_ENV_SECRET]" },
  { label: "private_key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, replacement: "[REDACTED_PRIVATE_KEY]" },
  { label: "wallet_private_key", pattern: /\b0x[a-fA-F0-9]{64}\b/g, replacement: "[REDACTED_WALLET_PRIVATE_KEY]" },
  { label: "jwt", pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, replacement: "[REDACTED_JWT]" },
  { label: "database_url", pattern: /\b(?:postgres|mysql|mongodb):\/\/[^\s]+/gi, replacement: "[REDACTED_DATABASE_URL]" },
  { label: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: "[REDACTED_EMAIL]" },
  { label: "phone_number", pattern: /\b(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g, replacement: "[REDACTED_PHONE]" },
  { label: "seed_phrase", pattern: /\b(?:[a-z]+ ){11,23}[a-z]+\b/gi, replacement: "[REDACTED_SEED_PHRASE]" }
];

export function sanitizeContext(task: string, context = ""): SecureContextPackage {
  const blocked = new Set<string>();
  let allowedContext = context;

  for (const rule of rules) {
    if (rule.pattern.test(allowedContext)) {
      blocked.add(rule.label);
      allowedContext = allowedContext.replace(rule.pattern, rule.replacement);
    }
    rule.pattern.lastIndex = 0;
  }

  const blockedContext = Array.from(blocked);
  return {
    task,
    allowedContext,
    blockedContext,
    detectedSecrets: blockedContext,
    sensitivity: classifySensitivity(blockedContext, context),
    approvalRequired: blockedContext.length > 0
  };
}

function classifySensitivity(
  blockedContext: string[],
  originalContext: string
): SecureContextPackage["sensitivity"] {
  if (blockedContext.some((label) => label.includes("key") || label === "seed_phrase")) return "secret";
  if (blockedContext.length > 0) return "confidential";
  return originalContext.trim().length > 0 ? "internal" : "public";
}
