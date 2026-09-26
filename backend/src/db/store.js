// V1 prototype & V2 compatible file-backed data store.
// Serves as the embedded JSON database engine for zero-dependency execution.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATA_FILE =
  process.env.DB_FILE || path.join(process.cwd(), "data", "db.json");

const COLLECTIONS = [
  "users",
  "vendors",
  "tenders",
  "tender_requirements",
  "bids",
  "compliance_results",
  "evaluations",
  "contract_awards",
  "audit_logs",
  "documents",
  "document_extractions",
  "verification_results",
  "evidence",
  "aadhaar_registry",
];

function blankDb() {
  return Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
}

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return { ...blankDb(), ...parsed };
  } catch {
    return blankDb();
  }
}

let tables = load();

function persist() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(tables, null, 2));
  } catch {
    // persistence is best-effort; in-memory data still works for the demo
  }
}

function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === "$or" && Array.isArray(cond)) {
      return cond.some((subFilter) => matches(doc, subFilter));
    }
    const value = doc[key];
    if (cond !== null && typeof cond === "object" && !Array.isArray(cond)) {
      if ("$in" in cond) return cond.$in.includes(value);
      if ("$ne" in cond) return value !== cond.$ne;
      if ("$gte" in cond) return value >= cond.$gte;
      if ("$lte" in cond) return value <= cond.$lte;
      return false;
    }
    return value === cond;
  });
}

function sortRows(rows, spec = {}) {
  const keys = Object.entries(spec);
  if (!keys.length) return rows;
  return [...rows].sort((a, b) => {
    for (const [key, dir] of keys) {
      const av = a[key];
      const bv = b[key];
      if (av === bv) continue;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av > bv ? 1 : -1) * (dir === -1 ? -1 : 1);
    }
    return 0;
  });
}

const clone = (value) =>
  value === undefined ? value : JSON.parse(JSON.stringify(value));

function wrap(collection, doc) {
  if (!doc) return null;
  return {
    ...clone(doc),
    toObject() {
      const { toObject, save, updateOne, ...rest } = this;
      return clone(rest);
    },
    async save() {
      const idx = tables[collection].findIndex((d) => d._id === doc._id);
      const { toObject, save, updateOne, ...fields } = this;
      const next = { ...clone(fields), updatedAt: new Date().toISOString() };
      if (idx >= 0) tables[collection][idx] = { ...tables[collection][idx], ...next };
      else tables[collection].push(next);
      persist();
      return wrap(collection, tables[collection][idx] || next);
    },
    async updateOne(update) {
      const idx = tables[collection].findIndex((d) => d._id === doc._id);
      if (idx < 0) return;
      Object.assign(tables[collection][idx], clone(update), {
        updatedAt: new Date().toISOString(),
      });
      persist();
    },
  };
}

class ListQuery {
  constructor(collection, filter) {
    this.collection = collection;
    this.filter = filter;
    this._sort = null;
    this._limit = null;
  }
  sort(spec) {
    this._sort = spec;
    return this;
  }
  limit(n) {
    this._limit = n;
    return this;
  }
  lean() {
    return this;
  }
  _run() {
    let rows = tables[this.collection].filter((d) => matches(d, this.filter));
    if (this._sort) rows = sortRows(rows, this._sort);
    if (this._limit != null) rows = rows.slice(0, this._limit);
    return clone(rows);
  }
  then(resolve, reject) {
    return Promise.resolve(this._run()).then(resolve, reject);
  }
  catch(reject) {
    return Promise.resolve(this._run()).catch(reject);
  }
}

class SingleQuery {
  constructor(collection, filter) {
    this.collection = collection;
    this.filter = filter;
    this._lean = false;
    this._sort = null;
  }
  sort(spec) {
    this._sort = spec;
    return this;
  }
  lean() {
    this._lean = true;
    return this;
  }
  _run() {
    let rows = tables[this.collection].filter((d) => matches(d, this.filter));
    if (this._sort) rows = sortRows(rows, this._sort);
    const found = rows[0] || null;
    return this._lean ? clone(found) : wrap(this.collection, found);
  }
  then(resolve, reject) {
    return Promise.resolve(this._run()).then(resolve, reject);
  }
  catch(reject) {
    return Promise.resolve(this._run()).catch(reject);
  }
}

class UpdateQuery {
  constructor(run) {
    this._run = run;
    this._lean = false;
  }
  lean() {
    this._lean = true;
    return this;
  }
  sort() {
    return this;
  }
  async _exec() {
    const doc = await this._run();
    if (!doc) return null;
    if (this._lean) return clone(doc.toObject ? doc.toObject() : doc);
    return doc;
  }
  then(resolve, reject) {
    return this._exec().then(resolve, reject);
  }
  catch(reject) {
    return this._exec().catch(reject);
  }
}

function applyUpdate(doc, update) {
  const set = update?.$set || update || {};
  Object.assign(doc, clone(set), { updatedAt: new Date().toISOString() });
}

function createCollection(name) {
  return {
    async syncIndexes() {},
    find(filter = {}) {
      return new ListQuery(name, filter);
    },
    findOne(filter = {}) {
      return new SingleQuery(name, filter);
    },
    findById(id) {
      return new SingleQuery(name, { _id: id });
    },
    async exists(filter = {}) {
      return tables[name].some((d) => matches(d, filter));
    },
    async countDocuments(filter = {}) {
      return tables[name].filter((d) => matches(d, filter)).length;
    },
    async create(payload) {
      const now = new Date().toISOString();
      const doc = {
        _id: payload._id || randomUUID(),
        ...clone(payload),
        createdAt: payload.createdAt || now,
        updatedAt: payload.updatedAt || now,
      };
      tables[name].push(doc);
      persist();
      return wrap(name, doc);
    },
    async insertMany(rows) {
      const now = new Date().toISOString();
      const docs = rows.map((r) => ({
        _id: r._id || randomUUID(),
        ...clone(r),
        createdAt: r.createdAt || now,
        updatedAt: r.updatedAt || now,
      }));
      tables[name].push(...docs);
      persist();
      return docs.map((d) => wrap(name, d));
    },
    async deleteMany(filter = {}) {
      const before = tables[name].length;
      tables[name] = tables[name].filter((d) => !matches(d, filter));
      persist();
      return { deletedCount: before - tables[name].length };
    },
    findByIdAndUpdate(id, update, options = {}) {
      return new UpdateQuery(async () => {
        const idx = tables[name].findIndex((d) => d._id === id);
        if (idx < 0) return null;
        applyUpdate(tables[name][idx], update);
        persist();
        return wrap(name, tables[name][idx]);
      });
    },
    findOneAndUpdate(filter, update, options = {}) {
      return new UpdateQuery(async () => {
        let idx = tables[name].findIndex((d) => matches(d, filter));
        if (idx < 0 && options.upsert) {
          const now = new Date().toISOString();
          const base = { _id: randomUUID(), ...clone(filter), createdAt: now, updatedAt: now };
          Object.assign(base, clone(update?.$set || {}), clone(update?.$setOnInsert || {}));
          tables[name].push(base);
          persist();
          idx = tables[name].length - 1;
        }
        if (idx < 0) return null;
        if (!options.upsert) {
          const set = update?.$set || update;
          if (set && Object.keys(set).length) {
            applyUpdate(tables[name][idx], update);
            persist();
          }
        }
        return wrap(name, tables[name][idx]);
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
export const ComplianceResult = createCollection("compliance_results");
export const VerificationResult = createCollection("verification_results");
export const Evaluation = createCollection("evaluations");
export const Award = createCollection("contract_awards");
export const AuditLog = createCollection("audit_logs");
export const Document = createCollection("documents");
export const DocumentExtraction = createCollection("document_extractions");
export const Evidence = createCollection("evidence");
export const AadhaarRegistry = createCollection("aadhaar_registry");

export async function connectDatabase() {
  await Promise.all([
    User.syncIndexes(),
    Vendor.syncIndexes(),
    Tender.syncIndexes(),
    Bid.syncIndexes(),
    Requirement.syncIndexes(),
    ComplianceResult.syncIndexes(),
    Award.syncIndexes(),
    AuditLog.syncIndexes(),
    Document.syncIndexes(),
    DocumentExtraction.syncIndexes(),
    VerificationResult.syncIndexes(),
    Evidence.syncIndexes(),
    AadhaarRegistry.syncIndexes(),
  ]);
  return { mode: "file", file: DATA_FILE };
}

export function resetDatabase() {
  tables = blankDb();
  persist();
}
