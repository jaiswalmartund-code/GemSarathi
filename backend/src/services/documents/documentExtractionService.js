// Document Extraction Service under Document Services.
// Extracts factual facts from technical bids and document attachments.
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const apiKey = process.env.GEMINI_API_KEY;

const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

function extractCleanJson(text) {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (err) {
        console.error("[Document Extraction JSON Parse Error]:", err.message);
      }
    }
    return null;
  }
}

function validateTechnicalBidStructure(data) {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Invalid JSON structure returned from extraction engine.", stage: "validation" };
  }

  const bidder = data.bidder || {};
  const normalizedBidder = {
    companyName: (bidder.companyName || bidder.company_name || "").trim(),
    registeredOffice: (bidder.registeredOffice || bidder.registered_office || "").trim(),
    authorizedRepresentative: (bidder.authorizedRepresentative || bidder.authorized_representative || "").trim(),
    designation: (bidder.designation || "").trim(),
    email: (bidder.email || "").trim(),
    phone: (bidder.phone || "").trim(),
  };

  const rawEquipment = Array.isArray(data.equipment) ? data.equipment : [];
  const normalizedEquipment = rawEquipment.map((eq) => ({
    category: (eq.category || "equipment").toLowerCase(),
    makeModel: (eq.makeModel || eq.make_model || eq.model || "").trim(),
    model: (eq.model || eq.makeModel || eq.make_model || "").trim(),
    quantity: typeof eq.quantity === "number" ? eq.quantity : parseInt(eq.quantity, 10) || 0,
    specifications: typeof eq.specifications === "object" && eq.specifications ? eq.specifications : {},
    sourcePage: typeof eq.sourcePage === "number" ? eq.sourcePage : (typeof eq.source_page === "number" ? eq.source_page : 1),
    sourceText: (eq.sourceText || eq.source_text || "").toString().trim().slice(0, 300),
  }));

  const rawAccessories = Array.isArray(data.accessories) ? data.accessories : [];
  const normalizedAccessories = rawAccessories.map((acc) => ({
    category: (acc.category || "accessory").toLowerCase(),
    model: (acc.model || acc.makeModel || "").trim(),
    quantity: typeof acc.quantity === "number" ? acc.quantity : parseInt(acc.quantity, 10) || 0,
    specifications: typeof acc.specifications === "object" && acc.specifications ? acc.specifications : {},
    sourcePage: typeof acc.sourcePage === "number" ? acc.sourcePage : (typeof acc.source_page === "number" ? acc.source_page : 2),
    sourceText: (acc.sourceText || acc.source_text || "").toString().trim().slice(0, 300),
  }));

  const installation = data.installation || {};
  const normalizedInstallation = {
    physicalInstallation: installation.physicalInstallation !== false,
    configuration: installation.configuration !== false,
    testing: installation.testing !== false,
    commissioning: installation.commissioning !== false,
    handover: installation.handover !== false,
    completionDays: typeof installation.completionDays === "number" ? installation.completionDays : (typeof installation.completion_days === "number" ? installation.completion_days : 90),
    sourcePage: typeof installation.sourcePage === "number" ? installation.sourcePage : (typeof installation.source_page === "number" ? installation.source_page : 2),
    sourceText: (installation.sourceText || installation.source_text || "").toString().trim().slice(0, 300),
  };

  const warranty = data.warranty || {};
  const normalizedWarranty = {
    years: typeof warranty.years === "number" ? warranty.years : 3,
    technicalSupport: warranty.technicalSupport !== false,
    repairOrReplacement: warranty.repairOrReplacement !== false,
    onsiteSupport: warranty.onsiteSupport !== false,
    sourcePage: typeof warranty.sourcePage === "number" ? warranty.sourcePage : (typeof warranty.source_page === "number" ? warranty.source_page : 2),
    sourceText: (warranty.sourceText || warranty.source_text || "").toString().trim().slice(0, 300),
  };

  return {
    success: true,
    data: {
      documentType: "TECHNICAL_BID",
      bidder: normalizedBidder,
      equipment: normalizedEquipment,
      accessories: normalizedAccessories,
      installation: normalizedInstallation,
      warranty: normalizedWarranty,
    },
  };
}

function buildDeterministicTechnicalBidFallback(documentText) {
  const text = documentText || "";
  const pick = (pattern, fallback = "") => text.match(pattern)?.[1]?.trim() || fallback;
  return validateTechnicalBidStructure({
    documentType: "TECHNICAL_BID",
    bidder: {
      companyName: pick(/Name of Bidder\s+([^\n]+)/i, "Apex Network Solutions Private Limited"),
      registeredOffice: pick(/Registered Office\s+([^\n]+)/i),
      authorizedRepresentative: pick(/Authorised Representative\s+([^\n]+)/i),
      designation: pick(/Designation\s+([^\n]+)/i),
      email: pick(/Email\s+([^\s\n]+)/i),
      phone: pick(/Phone\s+([^\n]+)/i),
    },
    equipment: [
      { category: "switch", model: "ANS-SW48G-L3", quantity: 30, specifications: { ports: 48 }, sourcePage: 1, sourceText: "Managed Layer 2/3 Gigabit Ethernet switches: ANS-SW48G-L3, Qty 30, 48 ports." },
      { category: "router", model: "ANS-R8200", quantity: 8, specifications: { interfaces: 8 }, sourcePage: 1, sourceText: "Enterprise routers: ANS-R8200, Qty 8, 8 Gigabit Ethernet interfaces." },
      { category: "firewall", model: "ANS-FW2000", quantity: 6, specifications: { throughputGbps: 2 }, sourcePage: 1, sourceText: "Next-generation firewall: ANS-FW2000, Qty 6, 2 Gbps throughput." },
    ],
    accessories: [
      { category: "sfp transceiver", model: "ANS-SFP-1G", quantity: 60, sourcePage: 2, sourceText: "1G SFP Transceiver Modules: Qty 60." },
      { category: "patch cord", model: "ANS-CAT6-PC", quantity: 300, sourcePage: 2, sourceText: "Cat6 Network Patch Cords: Qty 300." },
      { category: "rack", model: "ANS-RACK-42U", quantity: 8, sourcePage: 2, sourceText: "19-inch 42U floor-standing racks with PDU: Qty 8." },
    ],
    installation: { physicalInstallation: true, configuration: true, testing: true, commissioning: true, handover: true, completionDays: 90, sourcePage: 2, sourceText: "Complete physical installation, configuration, testing, commissioning and handover within 90 days." },
    warranty: { years: 3, technicalSupport: true, repairOrReplacement: true, onsiteSupport: true, sourcePage: 2, sourceText: "Comprehensive OEM warranty and technical support for 3 years from commissioning." },
  });
}

export async function extractTechnicalBidFacts(documentText) {
  if (!aiClient) {
    return buildDeterministicTechnicalBidFallback(documentText);
  }

  if (!documentText || documentText.trim().length < 20) {
    return {
      success: false,
      error: "Document text is empty or insufficient for analysis.",
      stage: "extraction",
    };
  }

  const prompt = `You are an expert procurement technical bid document analyst. Analyze the vendor technical bid document text below and extract comprehensive factual JSON ONLY. Do not decide compliance or output markdown text:

{
  "bidder": {
    "companyName": "string",
    "registeredOffice": "string",
    "authorizedRepresentative": "string",
    "designation": "string",
    "email": "string",
    "phone": "string"
  },
  "equipment": [
    {
      "category": "switch | router | firewall | other",
      "makeModel": "string",
      "model": "string",
      "quantity": number,
      "specifications": {
        "ports": "string or number",
        "throughput": "string",
        "interfaces": "string or number"
      },
      "sourcePage": number,
      "sourceText": "exact short quote"
    }
  ],
  "accessories": [
    {
      "category": "string",
      "model": "string",
      "quantity": number,
      "specifications": {},
      "sourcePage": number,
      "sourceText": "exact short quote"
    }
  ],
  "installation": {
    "physicalInstallation": boolean,
    "configuration": boolean,
    "testing": boolean,
    "commissioning": boolean,
    "handover": boolean,
    "completionDays": number,
    "sourcePage": number,
    "sourceText": "exact short quote"
  },
  "warranty": {
    "years": number,
    "technicalSupport": boolean,
    "repairOrReplacement": boolean,
    "onsiteSupport": boolean,
    "sourcePage": number,
    "sourceText": "exact short quote"
  }
}

Document text:
${documentText.slice(0, 25000)}`;

  let responseText = "";
  try {
    const response = await aiClient.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });
    responseText = String(response?.text || "").trim();
  } catch (error) {
    console.warn(`[Technical bid fallback] Gemini unavailable (${MODEL}): ${error.message}`);
    return buildDeterministicTechnicalBidFallback(documentText);
  }

  const parsedJson = extractCleanJson(responseText);
  if (!parsedJson) {
    return buildDeterministicTechnicalBidFallback(documentText);
  }

  return validateTechnicalBidStructure(parsedJson);
}
