import type { Provider } from "./models";
import type { Retrieval } from "./retrieve";

export type Route = "none" | "haiku" | "sol";

export const SOL_THRESHOLD = 4;

// A deterministic score for how hard a question is. No model call.
export function complexity(retrieval: Pick<Retrieval, "resolved" | "facets">, question: string): number {
  const { resolved, facets } = retrieval;
  let score = Math.min(3, Math.max(0, resolved.length - 1));
  if (facets.compare && resolved.length >= 2) score += 1;
  const facetCount = [facets.years.length > 0, facets.cause, facets.time, facets.metric, facets.method, facets.quality].filter(Boolean).length;
  if (facetCount >= 3) score += 1;
  if (facets.years.length > 0 && facets.compare) score += 1;
  const sentences = question.split(/[.!?]+\s+|[.!?]+$/).filter((s) => s.trim().length > 0).length;
  if (sentences >= 2 && question.length >= 160) score += 1;
  return score;
}

export function decideRoute(input: { empty: boolean; complexity: number; live: boolean; escalationAllowed: () => boolean }): Route {
  if (input.empty) return "none";
  if (input.complexity >= SOL_THRESHOLD && !input.live && input.escalationAllowed()) return "sol";
  return "haiku";
}

// For each isolate: 3 failures in 60 s open the circuit for 60 s.
export class CircuitBreaker {
  private failures = new Map<Provider, number[]>();
  private openUntil = new Map<Provider, number>();

  constructor(
    private readonly limit = 3,
    private readonly windowMs = 60_000,
    private readonly openMs = 60_000,
    private readonly now: () => number = Date.now
  ) {}

  isOpen(provider: Provider): boolean {
    return (this.openUntil.get(provider) ?? 0) > this.now();
  }

  fail(provider: Provider) {
    const t = this.now();
    const recent = (this.failures.get(provider) ?? []).filter((at) => t - at < this.windowMs);
    recent.push(t);
    this.failures.set(provider, recent);
    if (recent.length >= this.limit) {
      this.openUntil.set(provider, t + this.openMs);
      this.failures.set(provider, []);
    }
  }

  success(provider: Provider) {
    this.failures.set(provider, []);
  }
}

export const breaker = new CircuitBreaker();
