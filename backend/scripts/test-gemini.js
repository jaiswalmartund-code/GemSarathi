import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function runGeminiTest() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const isConfigured = Boolean(apiKey);

  console.log(`Gemini configured: ${isConfigured ? "YES" : "NO"}`);
  console.log(`Gemini model: ${model}`);

  if (!isConfigured) {
    console.log("API request: FAILED (GEMINI_API_KEY missing)");
    console.log("Response received: NO");
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model,
      contents: "Reply with exactly: GEMINI_CONNECTION_OK",
      config: {
        temperature: 0.1,
        maxOutputTokens: 50,
      },
    });

    const responseText = String(response?.text || "").trim();
    const hasResponse = Boolean(responseText);

    console.log("API request: SUCCESS");
    console.log(`Response received: ${hasResponse ? "YES" : "NO"}`);
    if (hasResponse) {
      console.log(`Response preview: ${responseText.slice(0, 100)}`);
    }
  } catch (error) {
    console.log(`API request: FAILED (${error.message || "Unknown error"})`);
    console.log("Response received: NO");
  }
}

runGeminiTest().catch(console.error);
