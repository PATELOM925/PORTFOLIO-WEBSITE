"use client";

import { FormEvent, useState } from "react";
import { TagBadge } from "@/components/TagBadge";
import seedCapabilities from "@/demos/clawcompass/data/capabilities.seed.json";
import type { CapabilityListing, RankedCapability, RiskLevel } from "@/demos/clawcompass/types/capability";
import type { SecureContextPackage, TaskAnalysis } from "@/demos/clawcompass/types/request";
import { rankCapabilities } from "@/demos/clawcompass/services/capabilityRanker";
import { sanitizeContext } from "@/demos/clawcompass/services/contextSanitizer";
import { evaluateGuardrails, getSecurityPolicy, type GuardrailDecision } from "@/demos/clawcompass/services/guardrails";
import { analyzeTask } from "@/demos/clawcompass/services/taskAnalyzer";

// Seed data from the ClawCompass repo. The JSON types are widened to string, so cast to the listing type.
const capabilities = seedCapabilities as CapabilityListing[];

const GUARDRAIL_TEXT: Record<string, string> = {
  hard_spend_stop: "The price is above the hard spend stop.",
  above_autonomous_spend_cap: "The price is above the autonomous spend cap.",
  secret_context: "The context contained secrets. They were redacted.",
  high_risk: "The capability is rated high risk.",
  unverified_provider: "The provider is not verified.",
  write_action: "The capability can write data.",
  wallet_action: "The capability can use a wallet.",
  external_action: "The capability can act on an external service."
};

type DemoForm = {
  task: string;
  context: string;
  budget: string;
  maxRisk: RiskLevel;
};

type BrokerResult = {
  analysis: TaskAnalysis;
  secureContext: SecureContextPackage;
  ranked: RankedCapability[];
  budgetNote: string;
  topCapability: CapabilityListing;
  guardrail: GuardrailDecision;
};

const EXAMPLES: Array<{ label: string; form: DemoForm }> = [
  {
    label: "Safe copy task",
    form: {
      task: "Write landing page copy for a small bakery's online ordering page.",
      context: "Target customer: busy office workers. Tone: warm and plain.",
      budget: "0.10",
      maxRisk: "low"
    }
  },
  {
    label: "ClawUp and x402 onboarding",
    form: {
      task: "Set up ClawUp for my agent and check the x402 payment step before I register on mainnet.",
      context: "Agent name: demo-agent. Telegram pairing is not done yet.",
      budget: "0.10",
      maxRisk: "low"
    }
  },
  {
    label: "Risky push with fake secrets",
    form: {
      task: "Push the fixed code to the GitHub repo and open a pull request.",
      context: "DEMO_API_KEY=not-a-real-key-000000000000\npostgres://demo:demo@localhost:5432/demo\nReviewer: demo@example.com, 416-555-0100",
      budget: "0.10",
      maxRisk: "medium"
    }
  }
];

function runBroker(form: DemoForm, budgetUsd: number): BrokerResult {
  const analysis = analyzeTask({ task: form.task, context: form.context, budgetUsd, maxRisk: form.maxRisk });
  const secureContext = sanitizeContext(analysis.originalTask, form.context);
  const ranked = rankCapabilities(analysis, secureContext, capabilities);
  const topCapability = ranked[0].capability;
  const guardrail = evaluateGuardrails({
    capability: topCapability,
    policy: getSecurityPolicy(),
    requestedAmountUsd: topCapability.priceUsd,
    secureContext
  });

  const affordableCount = capabilities.filter((capability) => capability.priceUsd <= budgetUsd).length;
  const budgetNote =
    affordableCount === 0
      ? "No capability fits this budget. All are shown, ranked by score."
      : affordableCount < capabilities.length
        ? `${capabilities.length - affordableCount} capabilities above this budget are not shown.`
        : "";

  return { analysis, secureContext, ranked, budgetNote, topCapability, guardrail };
}

function formatPrice(capability: CapabilityListing): string {
  return capability.priceUsd === 0 ? "Free" : `${capability.priceUsd.toFixed(2)} ${capability.priceToken}`;
}

export function ClawCompassDemo() {
  const [form, setForm] = useState<DemoForm>({ task: "", context: "", budget: "0.10", maxRisk: "low" });
  const [error, setError] = useState("");
  const [result, setResult] = useState<BrokerResult | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const budgetUsd = Number(form.budget);

    if (!form.task.trim()) {
      setError("Enter an agent task.");
      setResult(null);
      return;
    }

    if (form.budget.trim() === "" || !Number.isFinite(budgetUsd) || budgetUsd < 0) {
      setError("Budget must be 0 or more.");
      setResult(null);
      return;
    }

    setError("");
    setResult(runBroker(form, budgetUsd));
  }

  function loadExample(example: DemoForm) {
    setForm(example);
    setError("");
    setResult(null);
  }

  return (
    <div className="demo-stack">
      <form className="card demo-form" onSubmit={onSubmit}>
        <div className="demo-field">
          <label htmlFor="demo-task">Agent task</label>
          <textarea
            id="demo-task"
            rows={3}
            maxLength={500}
            required
            value={form.task}
            onChange={(event) => setForm((current) => ({ ...current, task: event.target.value }))}
          />
        </div>

        <div className="demo-field">
          <label htmlFor="demo-context">Context (optional)</label>
          <textarea
            id="demo-context"
            rows={5}
            maxLength={2000}
            value={form.context}
            aria-describedby="demo-context-hint"
            onChange={(event) => setForm((current) => ({ ...current, context: event.target.value }))}
          />
          <p id="demo-context-hint" className="demo-hint">
            Secrets are redacted from the context only. The task text is not redacted.
          </p>
        </div>

        <div className="demo-field-row">
          <div className="demo-field">
            <label htmlFor="demo-budget">Budget (USD)</label>
            <input
              id="demo-budget"
              type="number"
              min="0"
              step="0.01"
              value={form.budget}
              onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}
            />
          </div>

          <div className="demo-field">
            <label htmlFor="demo-risk">Maximum risk</label>
            <select
              id="demo-risk"
              value={form.maxRisk}
              aria-describedby="demo-risk-hint"
              onChange={(event) => setForm((current) => ({ ...current, maxRisk: event.target.value as RiskLevel }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <p id="demo-risk-hint" className="demo-hint">
              Shown as the risk tolerance. The ranker does not filter by it.
            </p>
          </div>
        </div>

        <div className="demo-examples" role="group" aria-label="Examples">
          {EXAMPLES.map((example) => (
            <button key={example.label} type="button" className="btn btn-secondary" onClick={() => loadExample(example.form)}>
              {example.label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="demo-actions">
          <button type="submit" className="btn btn-primary">
            Run broker
          </button>
        </div>
      </form>

      <section className="demo-results" aria-label="Broker results" aria-live="polite">
        <p className="demo-note">The analysis uses the deterministic analyzer. This demo makes no LLM call and no network request.</p>

        {result ? (
          <>
            <article className="card demo-section">
              <h2>1. Task analysis</h2>
              <dl className="demo-facts">
                <dt>Analyzer</dt>
                <dd>deterministic analyzer</dd>
                <dt>Task type</dt>
                <dd>{result.analysis.taskType}</dd>
                <dt>Required capabilities</dt>
                <dd className="tag-row">
                  {result.analysis.requiredCapabilities.map((capability) => (
                    <TagBadge key={capability} tag={capability} />
                  ))}
                </dd>
                <dt>Sensitivity</dt>
                <dd>{result.analysis.sensitivity}</dd>
                <dt>Risk tolerance</dt>
                <dd>{result.analysis.riskTolerance}</dd>
                <dt>Budget</dt>
                <dd>USD {result.analysis.budgetUsd.toFixed(2)}</dd>
              </dl>
            </article>

            <article className="card demo-section">
              <h2>2. Redaction</h2>
              <p>
                Context sensitivity: <strong>{result.secureContext.sensitivity}</strong>
              </p>
              <div>
                <p className="demo-label">Secret types detected</p>
                {result.secureContext.detectedSecrets.length ? (
                  <div className="tag-row">
                    {result.secureContext.detectedSecrets.map((secret) => (
                      <TagBadge key={secret} tag={secret} />
                    ))}
                  </div>
                ) : (
                  <p>None detected.</p>
                )}
              </div>
              <div>
                <p className="demo-label">Context after redaction</p>
                {result.secureContext.allowedContext.trim() ? (
                  <pre className="demo-code">{result.secureContext.allowedContext}</pre>
                ) : (
                  <p>No context was given.</p>
                )}
              </div>
            </article>

            <article className="card demo-section">
              <h2>3. Ranking</h2>
              {result.budgetNote ? <p className="demo-note">{result.budgetNote}</p> : null}
              <ol className="demo-ranking">
                {result.ranked.map((item) => (
                  <li key={item.capability.id} className="demo-capability">
                    <div className="demo-capability-head">
                      <h3>{item.capability.name}</h3>
                      <p className="demo-score">Score {item.score}</p>
                    </div>
                    <p className="demo-meta">
                      Price {formatPrice(item.capability)}. Risk {item.capability.riskLevel}.
                    </p>
                    <ul>
                      {item.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </article>

            <article className="card demo-section">
              <h2>4. Guardrail decision</h2>
              <p className="demo-note">For the top-ranked capability: {result.topCapability.name}</p>
              {result.guardrail.allowed ? (
                <p className="demo-decision demo-decision-allowed">Allowed. No approval is needed.</p>
              ) : (
                <p className="demo-decision demo-decision-approval">Approval required. A person must approve this action before it runs.</p>
              )}
              {result.guardrail.reasons.length ? (
                <ul className="demo-reasons">
                  {result.guardrail.reasons.map((reason) => (
                    <li key={reason}>
                      {GUARDRAIL_TEXT[reason] ?? reason} <span className="demo-reason-code">{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </>
        ) : (
          <p className="demo-note">Fill in the form, or pick an example, then run the broker to see the result.</p>
        )}
      </section>
    </div>
  );
}
