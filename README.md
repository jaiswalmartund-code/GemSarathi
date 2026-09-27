# GemSarathi — AI-Powered GeM Technical Bid Verification Platform

An automated, AI-assisted bid verification platform for **Government e-Marketplace (GeM)** tenders. **GemSarathi** streamlines technical bid evaluations using a two-layer verification engine:

1. **Layer 1 — Technical Bid Evaluation**: Extracts technical specifications from PDF bids and evaluates them deterministically against tender requirements.
2. **Layer 2 — Credential & Statutory Verification**: Cross-verifies vendor credentials across 7 government provider registries (PAN, GST, Udyam, Experience, ITR, Aadhaar Identity, MCA).

---

## 💡 Core Principle

> **AI Understands. Rules Verify. Humans Decide.**  
> Google Gemini extracts structured evidence from PDF bid documents. Deterministic rule engines evaluate compliance to eliminate hallucination. Procurement officers retain full control over final contract decisions.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React (Vite) Single Page Application with tailored portals for **Procurement Officers** and **Vendors**.
- **Backend**: Node.js + Express REST API (Modular Monolith architecture).
- **AI Processing**: Google Gemini API (`@google/genai`) for PDF document understanding and structured extraction.
- **Database**: Dual-Mode Persistence (Embedded File JSON DB for local demo, Supabase PostgreSQL for cloud production).

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v20 or higher

### 2. Run Backend
```bash
cd backend
npm install
npm run dev
# Backend API runs at http://localhost:8000
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend UI runs at http://localhost:5173
```

---

## 🔐 Role Credentials

- **Procurement Officer**: `officer@gem.gov.in` / `officer123`
- **Vendor**: `apex@apexnet.in` / `vendor123`

---

## ⚡ Useful Scripts (Backend)

```bash
# Verify canonical tender data
npm run verify:canonical

# Run technical bid pipeline test
npm run test:technical-bid

# Run full 2-layer verification engine test
npm run test:two-layer

# Reset bid data cleanly (Preserves Tenders, Users & Mock Data)
npm run clean:0
```
