// Document text extraction & OCR service under Document Services.
import { readFile } from "./fileStorageService.js";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const apiKey = process.env.GEMINI_API_KEY;
const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

function looksLikePdf(buffer) {
  return buffer.length > 4 && buffer.subarray(0, 4).toString() === "%PDF";
}

async function performGeminiOcr(buffer, mimeType = "application/pdf") {
  if (!aiClient) return null;
  try {
    const base64Data = buffer.toString("base64");
    const response = await aiClient.models.generateContent({
      model: MODEL,
      contents: [
        { inlineData: { mimeType, data: base64Data } },
        "Perform OCR on this document/image. Extract all text verbatim, preserving headings, table rows, and page numbers ('-- Page X of Y --'). Output raw extracted text only.",
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    });
    const text = String(response?.text || "").trim();
    if (text) {
      return {
        text,
        method: "gemini-ocr",
        chars: text.length,
        scannedHint: false,
      };
    }
  } catch (err) {
    console.error(`[Gemini OCR Error]: ${err.message}`);
  }
  return null;
}

async function parsePdf(buffer) {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return {
        text: result?.text || "",
        pages: result?.numpages || result?.total || null,
        method: "pdf-parse",
      };
    } finally {
      try {
        await parser.destroy();
      } catch {
        // ignore cleanup errors
      }
    }
  } catch (error) {
    return { text: "", pages: null, method: `pdf-parse-failed: ${error.message}` };
  }
}

export async function extractTextFromFile(storagePath, { mimeType = "", originalFilename = "" } = {}) {
  const buffer = await readFile(storagePath);
  const name = (originalFilename || storagePath).toLowerCase();

  const isPdf = looksLikePdf(buffer) || mimeType.includes("pdf") || name.endsWith(".pdf");
  const isImage = /\.(png|jpg|jpeg|webp|bmp|tiff)$/.test(name) || mimeType.startsWith("image/");

  if (isPdf) {
    const parsed = await parsePdf(buffer);
    const textTrimmed = (parsed.text || "").trim();
    
    if (textTrimmed.length >= 50) {
      return { ...parsed, chars: textTrimmed.length, scannedHint: false };
    }

    const ocrResult = await performGeminiOcr(buffer, "application/pdf");
    if (ocrResult && ocrResult.text.length > 20) {
      return { ...ocrResult, pages: parsed.pages || 1 };
    }

    return { ...parsed, chars: textTrimmed.length, scannedHint: true };
  }

  if (isImage) {
    const imgMime = mimeType || (name.endsWith(".png") ? "image/png" : "image/jpeg");
    const ocrResult = await performGeminiOcr(buffer, imgMime);
    if (ocrResult) return { ...ocrResult, pages: 1 };
  }

  if (/\.(txt|md|csv|json|log)$/.test(name) || mimeType.startsWith("text/")) {
    const text = buffer.toString("utf8");
    return { text, pages: 1, method: "utf8-read", chars: text.length, scannedHint: false };
  }

  const text = buffer.toString("utf8").replace(/[^\x09\x0A\x0D\x20-\uFFFF]/g, " ").slice(0, 20000);
  return {
    text,
    pages: null,
    method: "binary-fallback",
    chars: text.length,
    scannedHint: true,
  };
}
