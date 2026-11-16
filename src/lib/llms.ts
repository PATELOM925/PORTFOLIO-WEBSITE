import { education, industryExperience, researchEntries, siteConfig, skills } from "@/config/site";
import { ttcFaqs } from "@/lib/ttc-faq";

// Shared text for /llms.txt and /llms-full.txt (llmstxt.org format).

export const url = (path: string) => `${siteConfig.siteUrl}${path}`;

export function profileLines(): string[] {
  return [
    "## About Om Patel",
    "",
    `- Role: ${siteConfig.role}. Focus: ${siteConfig.focus.replace(/ • /g, ", ")}.`,
    "- Open to full-time roles in Canada as an AI engineer, machine learning engineer, data scientist, LLM engineer or data engineer.",
    ...education.map((e) => `- Education: ${e.degree}, ${e.school} (${e.period}).${e.note ? ` ${e.note}.` : ""}`),
    ...industryExperience.map((x) => `- Experience: ${x.title}, ${x.organization} (${x.period}). ${x.bullets[0]}`),
    ...researchEntries.map((r) => `- Research: ${r.title}. ${r.role} (${r.period}).`),
    `- Skills: ${skills.map((s) => `${s.category}: ${s.items}`).join(". ")}.`
  ];
}

export function ttcFactLines(): string[] {
  return ["## TTC delay facts (from TTC Pulse)", "", ...ttcFaqs().map((f) => `- ${f.question} ${f.answer}`)];
}
