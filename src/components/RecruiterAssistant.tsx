"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

const ROLE_OPTIONS = [
  "Applied AI Engineer",
  "AI/ML Engineer",
  "Machine Learning Engineer",
  "NLP Engineer",
  "Data Engineer",
  "Data Scientist",
  "MLOps Engineer",
  "AI Product Engineer"
] as const;

const CUSTOM_ROLE = "__custom__";

interface RecruiterResponse {
  verdict: string;
  score: number;
  strengths: string[];
  gaps: string[];
  questions: string[];
  summary: string;
}

const EMPTY_RESPONSE: RecruiterResponse = {
  verdict: "",
  score: 0,
  strengths: [],
  gaps: [],
  questions: [],
  summary: ""
};

export function RecruiterAssistant() {
  const [role, setRole] = useState<string>(ROLE_OPTIONS[0]);
  const [customRole, setCustomRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [response, setResponse] = useState<RecruiterResponse | null>(null);

  const remaining = useMemo(() => 12000 - jobDescription.length, [jobDescription.length]);
  const targetRole = role === CUSTOM_ROLE ? customRole.trim() : role;

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setJobDescription(text.slice(0, 12000));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/recruiter-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole, jobDescription, question })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Could not generate fit brief.");
      }

      setResponse({ ...EMPTY_RESPONSE, ...data });
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not generate fit brief.");
    }
  }

  function onReset() {
    setRole(ROLE_OPTIONS[0]);
    setCustomRole("");
    setJobDescription("");
    setQuestion("");
    setStatus("idle");
    setError("");
    setResponse(null);
  }

  return (
    <article className="assistant-card">
      <p className="assistant-intro">Om is available for full-time roles. Pick a role, or add your own, and paste the job description to see how Om aligns.</p>

      <form className="assistant-form" onSubmit={onSubmit}>
        <label>
          Target role
          <select className="assistant-select" value={role} onChange={(event) => setRole(event.target.value)}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value={CUSTOM_ROLE}>Custom role…</option>
          </select>
        </label>

        {role === CUSTOM_ROLE ? (
          <label>
            Custom role title
            <input
              type="text"
              value={customRole}
              maxLength={80}
              required
              autoFocus
              placeholder="Example: Forward Deployed Engineer, AI Solutions Engineer"
              onChange={(event) => setCustomRole(event.target.value)}
            />
          </label>
        ) : null}

        <label>
          Job description
          <textarea
            rows={8}
            value={jobDescription}
            maxLength={12000}
            placeholder="Paste the JD here..."
            onChange={(event) => setJobDescription(event.target.value)}
          />
        </label>
        <p className="assistant-note">{remaining} characters remaining</p>

        <label>
          Recruiter question (optional)
          <textarea
            rows={3}
            value={question}
            placeholder="Example: Is Om a fit for this role, and what should I probe in the interview?"
            onChange={(event) => setQuestion(event.target.value)}
          />
        </label>

        <label className="assistant-file">
          Upload JD as text file
          <input type="file" accept=".txt,.md,.csv,.json" onChange={onFileChange} />
        </label>
        <p className="assistant-note">For PDF/DOC JDs, paste text directly. File upload currently supports text-based formats.</p>

        <div className="assistant-actions">
          <button type="submit" disabled={status === "loading" || !jobDescription.trim() || !targetRole}>
            {status === "loading" ? "Checking..." : "Check Role Fit"}
          </button>
          <button type="button" className="assistant-reset" onClick={onReset}>
            Reset
          </button>
        </div>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      {response ? (
        <div className="assistant-output">
          <div className="assistant-score-row">
            <div>
              <p className="assistant-label">Fit verdict</p>
              <h3>{response.verdict}</h3>
            </div>
            <div>
              <p className="assistant-label">Match score</p>
              <p className="assistant-score">{response.score}</p>
            </div>
          </div>

          <div className="assistant-columns">
            <div>
              <p className="assistant-label">Why Om fits</p>
              <ul>
                {response.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="assistant-label">Potential gaps</p>
              <ul>
                {response.gaps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="assistant-label">Interview focus questions</p>
            <ul>
              {response.questions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="assistant-label">90-second recruiter summary</p>
            <p>{response.summary}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
