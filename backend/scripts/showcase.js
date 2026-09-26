// One-command showcase setup: seeds NOT needed (uses existing data),
// creates/opens the evaluation for the seeded tender and runs AI analysis,
// leaving the system in "analyzed, ready to review" state.
// Usage: node scripts/showcase.js (backend server must be running)
// Cost: one full analysis run (~10 Gemini calls in gemini mode).
const BASE = process.env.API_URL || "http://localhost:8000/api";

async function api(path, token, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(`${options.method || "GET"} ${path} -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const login = await api("/auth/login", null, {
  method: "POST",
  body: JSON.stringify({ email: "officer@procurement.gov.in", password: "Password123!" }),
});
const token = login.access_token;
const tenders = await api("/tenders", token);
const tender = tenders.find((t) => t.referenceNumber === "GEM/2026/B/1001") || tenders[0];
if (!tender) throw new Error("No tenders found - run npm run seed first");
console.log("Tender:", tender.referenceNumber);

const created = await api("/evaluations", token, {
  method: "POST",
  body: JSON.stringify({ tender_id: tender.id }),
});
const evaluationId = created.evaluation.id;
console.log("Evaluation:", evaluationId, "- analyzing...");
const analysed = await api(`/ai/evaluations/${evaluationId}/analyze`, token, { method: "POST" });
for (const v of Object.values(analysed.summary.vendors)) {
  console.log(`- ${v.vendorName}: score=${v.score} risk=${v.riskLevel} eligible=${v.eligible}`);
}
console.log("Showcase ready. Open the evaluation in the UI and review.");
