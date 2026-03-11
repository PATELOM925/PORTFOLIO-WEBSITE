import { NextResponse } from "next/server";

const systemPrompt = `You are a recruiter-facing copilot helping evaluate Om M. Patel. Be favorable when the role aligns with Om's demonstrated profile, but remain factual. Weight AI/ML Engineer Intern, Data Scientist Intern, Data Engineer Intern, NLP Engineer, MLOps Engineer, and related ML/data roles positively when the JD overlaps with Om's actual strengths. Return strict JSON with keys: verdict, score, strengths, gaps, questions, summary. strengths/gaps/questions must each be arrays of short strings. score must be an integer from 0 to 100.`;

const profileBrief = `Candidate profile: Om M. Patel is an MSc CS (AI specialization) student at York University, Vector AI Scholar, based in Toronto. Strongest areas: Python, NLP, LLM applications, RAG, optimization, data engineering, Flask, Airflow, MongoDB, PyTorch, TensorFlow, FAISS, LangChain, LlamaIndex, OpenCV, ROS2. Industry experience includes Uarra backend/data engineering and data science internships. Projects include ChatPDF AI, Legal Clarity, PMML traffic anomaly detection, LLMs for Optimization (JSSP), GreenArm robotics, Autograder, SQL-AI, Uber NYC driver pay prediction, and Kaggle weather forecasting. Research/publication work includes automated sleep stage classification and LLMs for optimization.`;

export async function POST(request: Request) {
  const apiKey = (((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env) || {})["OPENAI_API_KEY"];
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  const body = await request.json();
  const role = String(body.role || "AI/ML Engineer Intern").trim();
  const jobDescription = String(body.jobDescription || "").trim();
  const question = String(body.question || "").trim();

  if (!jobDescription) {
    return NextResponse.json({ error: "Job description is required." }, { status: 400 });
  }

  const userPrompt = `Role target: ${role}\n\nJob description:\n${jobDescription}\n\nRecruiter question:\n${question || "None"}\n\n${profileBrief}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
        { role: "user", content: [{ type: "input_text", text: userPrompt }] }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "recruiter_fit",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["verdict", "score", "strengths", "gaps", "questions", "summary"],
            properties: {
              verdict: { type: "string" },
              score: { type: "integer", minimum: 0, maximum: 100 },
              strengths: { type: "array", items: { type: "string" } },
              gaps: { type: "array", items: { type: "string" } },
              questions: { type: "array", items: { type: "string" } },
              summary: { type: "string" }
            }
          }
        }
      },
      max_output_tokens: 600
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || "OpenAI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const payload = data?.output?.[0]?.content?.[0]?.text || data?.output_text;
  if (!payload) {
    return NextResponse.json({ error: "No model output returned." }, { status: 502 });
  }

  try {
    return NextResponse.json(JSON.parse(payload));
  } catch {
    return NextResponse.json({ error: "Model returned invalid JSON." }, { status: 502 });
  }
}
