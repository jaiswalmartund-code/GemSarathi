// Supabase PostgreSQL implementation of the collection API for V2.
// Maps CRUD operations to PostgreSQL tables:
// users, vendors, tenders, tender_requirements, bids, documents,
// document_extractions, verification_results, evidence, aadhaar_registry.
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY).

let clientPromise = null;

async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const rawUrl = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
      if (!rawUrl || !key) {
        throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for DB_MODE=supabase");
      }
      return createClient(rawUrl, key, { auth: { persistSession: false } });
    })();
  }
  return clientPromise;
}

// Convert camelCase JS key to snake_case Postgres column name
function toColumnName(key) {
  if (key === "_id") return "id";
  const map = {
    referenceNumber: "tender_number",
    tenderRef: "tender_number",
    legalName: "company_name",
    companyName: "company_name",
    userId: "user_id",
    contactPerson: "contact_person",
    udyamNumber: "udyam_number",
    submissionDeadline: "submission_deadline",
    requirementName: "requirement_name",
    requirementType: "requirement_type",
    expectedValue: "expected_value",
    expectedUnit: "expected_unit",
    requiredDocumentType: "required_document_type",
    verificationRule: "verification_rule",
    tenderId: "tender_id",
    vendorId: "vendor_id",
    submittedAt: "submitted_at",
    complianceScore: "compliance_score",
    officerDecision: "officer_decision",
    officerNotes: "officer_notes",
    bidId: "bid_id",
    documentType: "document_type",
    originalFilename: "original_filename",
    storagePath: "storage_path",
    mimeType: "mime_type",
    fileSize: "file_size",
    fileHash: "file_hash",
    uploadStatus: "upload_status",
    uploadedAt: "uploaded_at",
    documentId: "document_id",
    extractionStatus: "extraction_status",
    extractedData: "extracted_data",
    extractedText: "extracted_text",
    extractionMethod: "extraction_method",
    requirementId: "requirement_id",
    verificationResultId: "verification_result_id",
    pageNumber: "page_number",
    evidenceText: "evidence_text",
    extractedValue: "extracted_value",
    aadhaarNumber: "aadhaar_number",
    dateOfBirth: "date_of_birth",
    referenceDocumentId: "reference_document_id",
    providerType: "provider_type",
    referenceData: "reference_data",
    createdAt: "created_at",
    updatedAt: "updated_at",
  };
  if (map[key]) return map[key];
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

// Convert snake_case Postgres column to camelCase JS property
function toPropName(col) {
  if (col === "id") return "_id";
  return col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

const TABLE_COLUMNS = {
  users: ["id", "name", "email", "password_hash", "role", "created_at", "updated_at"],
  vendors: ["id", "user_id", "company_name", "contact_person", "email", "phone", "address", "gstin", "pan", "udyam_number", "created_at", "updated_at"],
  tenders: ["id", "tender_number", "title", "organization", "description", "submission_deadline", "status", "created_at", "updated_at"],
  tender_requirements: ["id", "tender_id", "requirement_name", "description", "requirement_type", "expected_value", "expected_unit", "mandatory", "required_document_type", "verification_rule", "created_at", "updated_at"],
  bids: ["id", "tender_id", "vendor_id", "submitted_at", "status", "compliance_score", "officer_decision", "officer_notes", "created_at", "updated_at"],
  documents: ["id", "bid_id", "document_type", "original_filename", "storage_path", "mime_type", "file_size", "file_hash", "upload_status", "uploaded_at", "created_at", "updated_at"],
  document_extractions: ["id", "document_id", "extraction_status", "extracted_data", "extracted_text", "extraction_method", "confidence", "created_at", "updated_at"],
  verification_results: ["id", "bid_id", "requirement_id", "status", "extracted_value", "expected_value", "compliance_score", "explanation", "created_at", "updated_at"],
  evidence: ["id", "verification_result_id", "document_id", "page_number", "evidence_text", "extracted_value", "created_at", "updated_at"],
  aadhaar_registry: ["id", "aadhaar_number", "name", "date_of_birth", "address", "reference_document_id", "created_at", "updated_at"],
  mock_provider_records: ["id", "provider_type", "identifier", "vendor_id", "status", "reference_data", "created_at", "updated_at"],
};

// Convert input JS filter/payload object to Postgres column object
function toPostgresRow(table, obj = {}) {
  const row = {};
  const validCols = TABLE_COLUMNS[table] ? new Set(TABLE_COLUMNS[table]) : null;

  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    const col = toColumnName(key);
    if (!validCols || validCols.has(col)) {
      row[col] = val;
    }
  }

  if (table === "documents" && row.document_type) {
    const valid = new Set(["PAN", "AADHAAR", "FINANCIAL_STATEMENT", "EXPERIENCE_CERTIFICATE", "COMPANY_REGISTRATION", "GST", "TECHNICAL_BID", "TENDER_NOTICE", "OTHER"]);
    const upper = String(row.document_type).toUpperCase();
    if (valid.has(upper)) {
      row.document_type = upper;
    } else {
      const text = `${row.document_type} ${row.original_filename || ""}`.toLowerCase();
      if (text.includes("pan")) row.document_type = "PAN";
      else if (text.includes("gst")) row.document_type = "GST";
      else if (text.includes("aadhaar") || text.includes("identity")) row.document_type = "AADHAAR";
      else if (text.includes("financial") || text.includes("turnover") || text.includes("itr") || text.includes("balance")) row.document_type = "FINANCIAL_STATEMENT";
      else if (text.includes("experience")) row.document_type = "EXPERIENCE_CERTIFICATE";
      else if (text.includes("company") || text.includes("mca") || text.includes("registration") || text.includes("incorporation")) row.document_type = "COMPANY_REGISTRATION";
      else if (text.includes("technical")) row.document_type = "TECHNICAL_BID";
      else if (text.includes("notice") || text.includes("tender")) row.document_type = "TENDER_NOTICE";
      else row.document_type = "OTHER";
    }
  }

  return row;
}

// Convert output Postgres row object to JS domain object
function fromPostgresRow(row) {
  if (!row) return null;
  const obj = {};
  for (const [col, val] of Object.entries(row)) {
    const prop = toPropName(col);
    obj[prop] = val;
  }
  // Standardize aliases for V1 backward compatibility
  if (row.id) obj.id = row.id;
  if (row.tender_number) obj.referenceNumber = row.tender_number;
  if (row.company_name) {
    obj.legalName = row.company_name;
    obj.companyName = row.company_name;
  }
  if (row.requirement_name) obj.title = row.requirement_name;
  if (row.requirement_type) obj.category = row.requirement_type;
  return obj;
}

const cleanRow = (value) => JSON.parse(JSON.stringify(value));

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidColumn(col) {
  return col === "id" || col.endsWith("_id");
}

function isValidUuid(val) {
  return typeof val === "string" && UUID_REGEX.test(val);
}

function applyFilter(query, table, filter = {}) {
  let q = query;
  const { $or, $and, ...rest } = filter;
  const validCols = TABLE_COLUMNS[table] ? new Set(TABLE_COLUMNS[table]) : null;

  if (Array.isArray($and) && $and.length > 0) {
    for (const subFilter of $and) {
      q = applyFilter(q, table, subFilter);
    }
  }

  if (Array.isArray($or) && $or.length > 0) {
    const orParts = [];
    for (const sub of $or) {
      const parts = [];
      for (const [k, v] of Object.entries(sub)) {
        if (v !== undefined && v !== null) {
          const col = toColumnName(k);
          if (validCols && !validCols.has(col)) continue;
          if (isUuidColumn(col) && typeof v === "string" && !isValidUuid(v)) {
            continue;
          }
          if (typeof v === "object" && !Array.isArray(v) && "$in" in v) {
            const validVals = isUuidColumn(col) ? v.$in.filter(isValidUuid) : v.$in;
            if (validVals.length > 0) {
              parts.push(`${col}.in.(${validVals.join(",")})`);
            }
          } else {
            const formattedVal = typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v;
            parts.push(`${col}.eq.${formattedVal}`);
          }
        }
      }
      if (parts.length > 0) {
        orParts.push(parts.length > 1 ? `and(${parts.join(",")})` : parts[0]);
      }
    }
    if (orParts.length > 0) {
      const uniqueOr = [...new Set(orParts)];
      q = q.or(uniqueOr.join(","));
    }
  }

  for (const [key, cond] of Object.entries(rest)) {
    const col = toColumnName(key);
    if (validCols && !validCols.has(col)) continue;
    if (isUuidColumn(col) && typeof cond === "string" && !isValidUuid(cond)) {
      continue;
    }
    if (cond !== null && typeof cond === "object" && !Array.isArray(cond)) {
      if ("$in" in cond) {
        const validVals = isUuidColumn(col) ? cond.$in.filter(isValidUuid) : cond.$in;
        if (validVals.length > 0) q = q.in(col, validVals);
      } else if ("$ne" in cond) {
        if (!isUuidColumn(col) || isValidUuid(cond.$ne)) q = q.neq(col, cond.$ne);
      } else if ("$gte" in cond) q = q.gte(col, cond.$gte);
      else if ("$lte" in cond) q = q.lte(col, cond.$lte);
      else throw new Error(`Unsupported filter operator on ${table}.${col}`);
    } else if (cond === undefined) {
      q = q.is(col, null);
    } else {
      q = q.eq(col, cond);
    }
  }
  return q;
}

function applySort(table, query, spec = {}) {
  let q = query;
  const validCols = TABLE_COLUMNS[table] ? new Set(TABLE_COLUMNS[table]) : null;
  for (const [key, dir] of Object.entries(spec)) {
    const col = toColumnName(key);
    if (!validCols || validCols.has(col)) {
      q = q.order(col, { ascending: dir !== -1 });
    }
  }
  return q;
}

function wrap(table, row) {
  if (!row) return null;
  const data = fromPostgresRow(row);
  return {
    ...data,
    toObject() {
      const { toObject, save, updateOne, ...rest } = this;
      return cleanRow(rest);
    },
    async save() {
      const supabase = await getClient();
      const { toObject, save, updateOne, _id, id, ...fields } = this;
      const targetId = _id || id;
      const payload = { ...toPostgresRow(table, cleanRow(fields)), updated_at: new Date().toISOString() };
      const { data: updated, error } = await supabase.from(table).update(payload).eq("id", targetId).select().single();
      if (error) throw error;
      Object.assign(this, fromPostgresRow(updated));
      return this;
    },
    async updateOne(update) {
      const supabase = await getClient();
      const set = update?.$set || update || {};
      const targetId = data._id || data.id;
      const payload = { ...toPostgresRow(table, cleanRow(set)), updated_at: new Date().toISOString() };
      const { error } = await supabase.from(table).update(payload).eq("id", targetId);
      if (error) throw error;
    },
  };
}

function isTableMissingError(error) {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  const code = error.code || "";
  if (code === "42703") return false; // column undefined
  return code === "PGRST116" || code === "42P01" || (msg.includes("table") && msg.includes("does not exist")) || (msg.includes("relation") && msg.includes("does not exist"));
}

class ListQuery {
  constructor(table, filter) {
    this.table = table;
    this.filter = filter;
    this._sort = null;
    this._limit = null;
  }
  sort(spec) { this._sort = spec; return this; }
  limit(n) { this._limit = n; return this; }
  lean() { return this; }
  async _run() {
    const supabase = await getClient();
    let q = applyFilter(supabase.from(this.table).select("*"), this.table, this.filter);
    if (this._sort) q = applySort(this.table, q, this._sort);
    if (this._limit != null) q = q.limit(this._limit);
    const { data, error } = await q;
    if (error) {
      if (isTableMissingError(error)) return [];
      throw error;
    }
    return (data || []).map(fromPostgresRow);
  }
  then(resolve, reject) { return this._run().then(resolve, reject); }
  catch(reject) { return this._run().catch(reject); }
}

class SingleQuery {
  constructor(table, filter) {
    this.table = table;
    this.filter = filter;
    this._lean = false;
    this._sort = null;
  }
  sort(spec) { this._sort = spec; return this; }
  lean() { this._lean = true; return this; }
  async _run() {
    const supabase = await getClient();
    let q = applyFilter(supabase.from(this.table).select("*"), this.table, this.filter);
    if (this._sort) q = applySort(this.table, q, this._sort);
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) {
      if (isTableMissingError(error)) return null;
      throw error;
    }
    if (!data) return null;
    const mapped = fromPostgresRow(data);
    return this._lean ? mapped : wrap(this.table, data);
  }
  then(resolve, reject) { return this._run().then(resolve, reject); }
  catch(reject) { return this._run().catch(reject); }
}

class UpdateQuery {
  constructor(run) { this._run = run; this._lean = false; }
  lean() { this._lean = true; return this; }
  sort() { return this; }
  async _exec() {
    try {
      const doc = await this._run();
      if (!doc) return null;
      if (this._lean) return cleanRow(doc.toObject ? doc.toObject() : doc);
      return doc;
    } catch (err) {
      if (isTableMissingError(err)) return null;
      throw err;
    }
  }
  then(resolve, reject) { return this._exec().then(resolve, reject); }
  catch(reject) { return this._exec().catch(reject); }
}

function createCollection(table) {
  return {
    async syncIndexes() { },
    find(filter = {}) { return new ListQuery(table, filter); },
    findOne(filter = {}) { return new SingleQuery(table, filter); },
    findById(id) { return new SingleQuery(table, { _id: id }); },
    async exists(filter = {}) {
      const supabase = await getClient();
      const q = applyFilter(supabase.from(table).select("id", { count: "exact", head: true }), table, filter);
      const { count, error } = await q;
      if (error) {
        if (isTableMissingError(error)) return false;
        throw error;
      }
      return (count || 0) > 0;
    },
    async countDocuments(filter = {}) {
      const supabase = await getClient();
      const q = applyFilter(supabase.from(table).select("id", { count: "exact", head: true }), table, filter);
      const { count, error } = await q;
      if (error) {
        if (isTableMissingError(error)) return 0;
        throw error;
      }
      return count || 0;
    },
    async create(payload) {
      const supabase = await getClient();
      const { randomUUID } = await import("node:crypto");
      const now = new Date().toISOString();
      const row = toPostgresRow(table, cleanRow(payload));
      if (!row.id) row.id = payload._id || payload.id || randomUUID();
      if (!row.created_at) row.created_at = now;
      if (!row.updated_at) row.updated_at = now;
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) {
        if (isTableMissingError(error)) return wrap(table, row);
        throw error;
      }
      return wrap(table, data);
    },
    async insertMany(rows) {
      const supabase = await getClient();
      const { randomUUID } = await import("node:crypto");
      const now = new Date().toISOString();
      const payload = rows.map((r) => {
        const row = toPostgresRow(table, cleanRow(r));
        if (!row.id) row.id = r._id || r.id || randomUUID();
        if (!row.created_at) row.created_at = now;
        if (!row.updated_at) row.updated_at = now;
        return row;
      });
      const { data, error } = await supabase.from(table).insert(payload).select();
      if (error) {
        if (isTableMissingError(error)) return payload.map((d) => wrap(table, d));
        throw error;
      }
      return (data || []).map((d) => wrap(table, d));
    },
    async deleteMany(filter = {}) {
      const supabase = await getClient();
      let q = supabase.from(table).delete();
      if (!filter || Object.keys(filter).length === 0) {
        q = q.neq("id", "00000000-0000-0000-0000-000000000000");
      } else {
        q = applyFilter(q, table, filter);
      }
      const { error, count } = await q;
      if (error) {
        if (isTableMissingError(error)) return { deletedCount: 0 };
        throw error;
      }
      return { deletedCount: count || 0 };
    },
    findByIdAndUpdate(id, update) {
      return new UpdateQuery(async () => {
        const supabase = await getClient();
        const payload = { ...toPostgresRow(table, cleanRow(update?.$set || update || {})), updated_at: new Date().toISOString() };
        const { data, error } = await supabase.from(table).update(payload).eq("id", id).select().maybeSingle();
        if (error) throw error;
        return wrap(table, data);
      });
    },
    findOneAndUpdate(filter, update, options = {}) {
      return new UpdateQuery(async () => {
        const supabase = await getClient();
        const existing = await applyFilter(supabase.from(table).select("*"), table, filter).limit(1).maybeSingle().then((r) => {
          if (r.error) throw r.error;
          return r.data;
        });
        if (!existing && options.upsert) {
          const { randomUUID } = await import("node:crypto");
          const now = new Date().toISOString();
          const row = {
            id: randomUUID(),
            ...toPostgresRow(table, cleanRow(filter)),
            ...toPostgresRow(table, cleanRow(update?.$set || {})),
            ...toPostgresRow(table, cleanRow(update?.$setOnInsert || {})),
            created_at: now,
            updated_at: now,
          };
          const { data, error } = await supabase.from(table).insert(row).select().single();
          if (error) throw error;
          return wrap(table, data);
        }
        if (!existing) return null;
        if (!options.upsert) {
          const set = update?.$set || update;
          if (set && Object.keys(set).length) {
            const payload = { ...toPostgresRow(table, cleanRow(set)), updated_at: new Date().toISOString() };
            const { data, error } = await supabase.from(table).update(payload).eq("id", existing.id).select().single();
            if (error) throw error;
            return wrap(table, data);
          }
        }
        return wrap(table, existing);
      });
    },
  };
}

export const User = createCollection("users");
export const Vendor = createCollection("vendors");
export const Tender = createCollection("tenders");
export const Requirement = createCollection("tender_requirements");
export const TenderRequirement = Requirement;
export const Bid = createCollection("bids");
export const Document = createCollection("documents");
export const DocumentExtraction = createCollection("document_extractions");
export const VerificationResult = createCollection("verification_results");
export const ComplianceResult = VerificationResult; // alias
export const Evidence = createCollection("evidence");
export const AadhaarRegistry = createCollection("aadhaar_registry");
export const MockProviderRecord = createCollection("mock_provider_records");

// Historic fallback models for V1 compatibility
export const Evaluation = createCollection("evaluations");
export const Award = createCollection("contract_awards");
export const AuditLog = createCollection("audit_logs");

export async function connectDatabase() {
  const supabase = await getClient();
  const { error } = await supabase.from("tenders").select("id", { count: "exact", head: true });
  if (error && error.code !== "PGRST116") {
    const { error: usersErr } = await supabase.from("users").select("id", { count: "exact", head: true });
    if (usersErr) {
      throw new Error(`Supabase connection failed: ${error.message || usersErr.message}. Run migration 001_v2_initial_schema.sql first.`);
    }
  }
  return { mode: "supabase" };
}

export async function resetDatabase() {
  const supabase = await getClient();
  for (const table of [
    "evidence",
    "verification_results",
    "document_extractions",
    "documents",
    "bids",
    "tender_requirements",
    "tenders",
    "vendors",
    "users",
    "aadhaar_registry",
  ]) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error && error.code !== "42P01") throw error;
  }
}
