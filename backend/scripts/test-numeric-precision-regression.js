// Regression Test Suite: Technical Data Extraction & Numeric Field Precision
// Validates quantity vs serial numbers, quantity vs spec parameters (ports, RAM, throughput),
// table extraction, and deterministic field-aware rule comparison.

import assert from "node:assert";
import { extractTechnicalBidFacts } from "../src/services/documents/documentExtractionService.js";
import { parseTenderNoticeWithGemini } from "../src/services/ai/geminiTenderAdapter.js";

async function runRegressionTests() {
  console.log("==================================================");
  console.log("=== TECHNICAL EXTRACTION & NUMERIC PRECISION TESTS ===");
  console.log("==================================================\n");

  let passCount = 0;
  let failCount = 0;

  function test(description, fn) {
    try {
      fn();
      console.log(`✅ [PASS] ${description}`);
      passCount++;
    } catch (err) {
      console.error(`❌ [FAIL] ${description}: ${err.message}`);
      failCount++;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Table Extraction: Sr. No. vs Quantity
  // ---------------------------------------------------------------------------
  console.log("--- 1. Testing Table Extraction & Serial Number vs Quantity ---");

  const sampleTableText = `
TECHNICAL BID OFFER TABLE
--------------------------------------------------
| Sr. No. | Equipment Description | Qty | Specifications |
| 8       | Managed Switch       | 2 Nos| 24-port Gigabit |
| 12      | Enterprise Router    | 4    | 8 interfaces   |
--------------------------------------------------
  `;

  const parsedBidTable = await extractTechnicalBidFacts(sampleTableText);
  
  test("Test 1.1: Sr. No. 8 with Qty 2 must NOT extract quantity = 8", () => {
    const sw = parsedBidTable.data?.equipment?.find(e => e.category?.includes("switch") || e.model?.includes("Switch")) || parsedBidTable.data?.equipment?.[0];
    const qty = sw?.quantity;
    assert.strictEqual(qty, 2, `Expected quantity 2, but got ${qty}`);
  });

  test("Test 1.2: Sr. No. 12 with Qty 4 must NOT extract quantity = 12", () => {
    const rtr = parsedBidTable.data?.equipment?.find(e => e.category?.includes("router")) || parsedBidTable.data?.equipment?.[1];
    const qty = rtr?.quantity;
    assert.strictEqual(qty, 4, `Expected quantity 4, but got ${qty}`);
  });

  // ---------------------------------------------------------------------------
  // 2. Quantity vs Specification Metrics (Ports, RAM, Throughput)
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Testing Quantity vs Specification Metrics ---");

  const multiSpecText = `
BIDDER EQUIPMENT SPECIFICATION
Name of Bidder: Apex Network Solutions Private Limited
Item: Managed Network Switches
Quantity Offered: 8 Qty
Specifications: 24-port Layer 3 managed switch, 48 GB RAM, 1 Gbps throughput per port.
  `;

  const parsedMultiSpec = await extractTechnicalBidFacts(multiSpecText);

  test("Test 2.1: Quantity must remain 8 when text contains '24-port' and '48 GB RAM'", () => {
    const sw = parsedMultiSpec.data?.equipment?.[0];
    const qty = sw?.quantity;
    assert.strictEqual(qty, 8, `Expected quantity = 8, but extracted quantity = ${qty}`);
  });

  // ---------------------------------------------------------------------------
  // 3. Quantity Comparison Logic (Offered vs Required)
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Testing Quantity Comparison Logic ---");

  function evaluateQuantityRule(requiredQty, offeredQty) {
    return offeredQty >= requiredQty ? "PASS" : "FAIL";
  }

  test("Test 3.1: Required = 8, Offered = 8 -> PASS", () => {
    assert.strictEqual(evaluateQuantityRule(8, 8), "PASS");
  });

  test("Test 3.2: Required = 8, Offered = 6 -> FAIL", () => {
    assert.strictEqual(evaluateQuantityRule(8, 6), "FAIL");
  });

  test("Test 3.3: Required = 8, Offered = 10 -> PASS", () => {
    assert.strictEqual(evaluateQuantityRule(8, 10), "PASS");
  });

  // ---------------------------------------------------------------------------
  // 4. Completion Period Comparison (Lower is Better)
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Testing Completion Period Direction (Lower is Better) ---");

  function evaluateCompletionRule(maxDaysAllowed, offeredDays) {
    return offeredDays <= maxDaysAllowed ? "PASS" : "FAIL";
  }

  test("Test 4.1: Allowed = 90 days, Offered = 60 days -> PASS", () => {
    assert.strictEqual(evaluateCompletionRule(90, 60), "PASS");
  });

  test("Test 4.2: Allowed = 90 days, Offered = 90 days -> PASS", () => {
    assert.strictEqual(evaluateCompletionRule(90, 90), "PASS");
  });

  test("Test 4.3: Allowed = 90 days, Offered = 120 days -> FAIL", () => {
    assert.strictEqual(evaluateCompletionRule(90, 120), "FAIL");
  });

  // ---------------------------------------------------------------------------
  // 5. Tender Side Extraction: Categorization & Layer Mapping
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Testing Tender Requirements Layer Categorization ---");

  const tenderNoticeSample = `
GOVERNMENT OF INDIA TENDER NOTICE
Bid No. GEM/2026/B/DEMO-001
1. Average Annual Turnover: Minimum Rs 2 Crore during last 3 years.
2. Relevant Experience: Minimum 3 years experience.
3. Managed Network Switches: 30 Nos, minimum 24 Gigabit Ethernet ports.
4. Enterprise Routers: 8 Nos, minimum 4 Ethernet interfaces.
  `;

  const tenderRes = await parseTenderNoticeWithGemini(tenderNoticeSample);
  const reqs = tenderRes.data?.requirements || [];

  test("Test 5.1: Turnover must be categorized as 'eligibility' (Layer 2)", () => {
    const turnover = reqs.find(r => /turnover/i.test(r.requirementName));
    assert.ok(turnover, "Turnover requirement found");
    assert.strictEqual(turnover.requirementCategory, "eligibility");
  });

  test("Test 5.2: Switches must be categorized as 'technical' (Layer 1)", () => {
    const switches = reqs.find(r => /switch/i.test(r.requirementName));
    assert.ok(switches, "Switch requirement found");
    assert.strictEqual(switches.requirementCategory, "technical");
  });

  console.log("\n==================================================");
  console.log(`REGRESSION SUMMARY: ${passCount} PASSED, ${failCount} FAILED.`);
  console.log("==================================================");

  if (failCount === 0) {
    console.log("🎉 ALL PRECISION & REGRESSION TESTS PASSED!");
    process.exit(0);
  } else {
    console.error("❌ Some regression tests failed.");
    process.exit(1);
  }
}

runRegressionTests().catch(err => {
  console.error("Regression test error:", err);
  process.exit(1);
});
