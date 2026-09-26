// Deterministic Scoring & Compliance Aggregation Engine
// Responsibilities:
//   - Compliance score calculation (weighted percentage)
//   - Requirement weighting
//   - Pass/fail/review aggregation
//   - Risk level & eligibility recommendation synthesis
// Note: AI NEVER directly generates the final compliance score. All scores are deterministically computed.

export const KEY_TO_REQ = [
  [/udyam|msme/i, "udyam"],
  [/gst/i, "gst"],
  [/pan|income tax|\bitr\b/i, "pan_itr"],
  [/epfo|esic|provident/i, "epfo_esic"],
  [/startup|nsic|dpiit/i, "startup_nsic"],
  [/debar|blacklist/i, "debarment"],
  [/digilocker|authentic/i, "digilocker"],
  [/turnover/i, "turnover"],
  [/experience/i, "experience"],
  [/emd|earnest/i, "emd"],
  [/iso/i, "iso"],
  [/oem|authori[sz]ation/i, "oem"],
  [/local content|make in india/i, "make_in_india"],
  [/warranty/i, "warranty"],
];

const labelOf = (c) => c.requirementTitle || c.key;

/**
 * Deterministically calculates score, risk level, recommendation, and eligibility status.
 * @param {Array} checks - List of verified requirement checks.
 * @param {Object} vendor - Vendor profile details.
 */
export function calculateComplianceScore(checks = [], vendor = {}) {
  const totalWeight = checks.reduce((s, c) => s + (c.weight || 5), 0);
  const earned = checks.reduce((s, c) => {
    const weight = c.weight || 5;
    if (c.status === "compliant" || c.status === "PASS") return s + weight;
    if (c.status === "needs_review") return s + weight * 0.4;
    return s;
  }, 0);

  const score = totalWeight ? Math.round((earned / totalWeight) * 100) : 0;
  const mandatoryFails = checks.filter((c) => c.mandatory && (c.status === "non_compliant" || c.status === "FAIL"));
  const reviewItems = checks.filter((c) => c.status === "needs_review");
  const debarred = checks.some((c) => c.key === "debarment" && (c.status === "non_compliant" || c.status === "FAIL"));

  let riskLevel = "LOW";
  if (debarred || mandatoryFails.length > 0) riskLevel = debarred ? "CRITICAL" : "HIGH";
  else if (reviewItems.length > 0 || score < 80) riskLevel = "MEDIUM";

  const eligible = !debarred && mandatoryFails.length === 0 && reviewItems.length === 0 && score >= 80;
  const recommendation = debarred
    ? `NOT ELIGIBLE - ${vendor?.legalName || "Vendor"} appears on the debarment list. Recommend rejection per GeM GTC.`
    : mandatoryFails.length > 0
      ? `NOT ELIGIBLE - failed mandatory check(s): ${mandatoryFails.map(labelOf).join(", ")}. Recommend disqualification unless clarified.`
      : reviewItems.length > 0
        ? `CONDITIONAL - ${reviewItems.length} item(s) need officer review (${reviewItems.map(labelOf).join(", ")}). May qualify after verification.`
        : `ELIGIBLE - all ${checks.length} checks passed with score ${score}%. Recommend qualification.`;

  return { score, riskLevel, recommendation, eligible, totalWeight, earned };
}
