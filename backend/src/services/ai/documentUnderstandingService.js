// AI Document Understanding Service Interface & Adapter Factory
// System components MUST interact with AI through this service boundary interface.
// Current underlying provider: Gemini Adapter
// Future underlying provider: Local Fine-Tuned LLM Adapter

import { geminiExtract, geminiAdjudicate, getGeminiMode } from "./geminiAdapter.js";
import { parseTenderNoticeWithGemini } from "./geminiTenderAdapter.js";

export class DocumentUnderstandingService {
  /**
   * Returns current AI provider/model configuration label.
   */
  getMode() {
    return getGeminiMode();
  }

  /**
   * Extracts structured vendor facts and document attributes.
   * @param {string} summary - Contextual tender summary.
   * @param {string} docText - Full extracted text from bidder documents.
   */
  async extract(summary, docText) {
    return await geminiExtract(summary, docText);
  }

  /**
   * Adjudicates an ambiguous requirement check against bidder document text.
   * @param {Object} params - Requirement and evidence parameters.
   */
  async adjudicate(params) {
    return await geminiAdjudicate(params);
  }

  /**
   * Parses tender notice document text into structured requirements and tender details.
   * @param {string} documentText - Raw extracted text of tender notice.
   */
  async parseTenderNotice(documentText) {
    return await parseTenderNoticeWithGemini(documentText);
  }
}

export const documentUnderstandingService = new DocumentUnderstandingService();
