// Gemini AI Adapter Implementation using official @google/genai SDK
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const apiKey = process.env.GEMINI_API_KEY;

const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

export function getGeminiMode() {
  return apiKey ? `gemini:${MODEL}` : "heuristic";
}

function extractJson(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callGemini(prompt, maxOutputTokens = 1024) {
  if (!aiClient) return null;
  try {
    const response = await aiClient.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens,
      },
    });
    const text = typeof response?.text === "string" ? response.text : (response?.text || "");
    return { text, prompt };
  } catch (error) {
    return { error: `gemini-failed: ${error.message}` };
  }
}

export async function geminiExtract(summary, docText) {
  const prompt = `You are a GeM procurement document analyst. From the bidder text below, extract JSON only with keys: gstin, pan, udyamNo, turnover_inr (number|null), experience_years (number|null), emd_inr (number|null), hasIso (bool), hasOemAuth (bool), localContentPct (number|null), warrantyYears (number|null), oneLineSummary (string). Context: ${summary}. Bidder text (truncated):\n${(docText || "").slice(0, 12000)}`;
  const result = await callGemini(prompt, 1024);
  if (!result || result.error) return result;
  const parsed = extractJson(result.text);
  if (!parsed) return { error: "gemini-no-json", raw: result.text.slice(0, 500) };
  return { ...parsed, model: MODEL };
}

export async function geminiAdjudicate({ requirementTitle, requirementDesc, currentEvidence, docText }) {
  const prompt = `You are a GeM (Government e-Marketplace, India) bid compliance officer. Decide ONE requirement strictly from the bidder evidence below.

Requirement: ${requirementTitle}
Detail: ${requirementDesc || ""}
Current machine finding: ${currentEvidence || "no evidence extracted"}

Bidder documents (truncated):
${(docText || "").slice(0, 10000)}

Reply with JSON only, exactly these keys:
{
  "verdict": "compliant" | "non_compliant" | "needs_review",
  "confidence": 0.0-1.0,
  "reasoning": "1-2 sentence justification quoting the evidence",
  "quote": "short exact quote from the documents supporting the verdict, or null"
}
Be strict: verdict "compliant" only with explicit textual evidence. Missing evidence means "non_compliant" only if the requirement is clearly applicable and unmet; otherwise "needs_review".`;
  const result = await callGemini(prompt, 768);
  if (!result || result.error) return result;
  const parsed = extractJson(result.text);
  if (!parsed || !["compliant", "non_compliant", "needs_review"].includes(parsed.verdict)) {
    return { error: "gemini-no-json", raw: result.text?.slice(0, 500), prompt, response: result.text };
  }
  return {
    verdict: parsed.verdict,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
    reasoning: parsed.reasoning || "",
    quote: parsed.quote || null,
    model: MODEL,
    prompt,
    response: result.text,
  };
}
