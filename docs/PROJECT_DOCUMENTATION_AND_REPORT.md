# LabLoop Enterprise — Comprehensive Project Documentation & Final Report

## Executive Summary
**LabLoop** is an enterprise-grade academic lab & equipment sharing platform designed to maximize utilization of underused campus assets (e.g., laser cutters, electron microscopes, autoclaves, cleanrooms) while guaranteeing safety, fair allocation, and absolute operational accountability.

---

## 1. System Architecture & Workflows

### 1.1 Complete Lifecycle Workflow
```
[ User Discovery ] ──> [ Pre-Flight Eligibility Check ] ──> [ Fair-Share Priority Scoring ]
                                                                      │
                                                                      ▼
[ Cryptographic Audit Log ] <── [ Owner/Manager Review ] <── [ Booking Queue / Waitlist ]
            │
            ▼
[ QR Kiosk Activation ] ──> [ Baseline Safety & Photo Report ] ──> [ Active Session ]
                                                                          │
                                                                          ▼
[ Incident / Penalty Queue ] <── [ Damage/Delay Inspection ] <── [ Return Check-out ]
```

### 1.2 Core Data Models
*   **User & Trust Tier:** Roles (`student`, `faculty`, `researcher`, `owner`, `manager`, `admin`), Trust Tiers (0–3), Fair-Share Score, No-Show Penalties.
*   **Resource & Fleet Control:** Equipment specs, hourly rates in Rupees (`₹`), required badges, operating hours, daily booking caps, status (`available`, `maintenance`, `retired`).
*   **Booking & Explainable Allocation:** Purpose weighting, priority score breakdown, waitlist positions, decision reasons.
*   **Condition Reports:** Pre-use baseline vs. Post-use inspection checklists, notes, photo proofs.
*   **Audit Ledger:** Append-only SHA-256 hash-chained event logs (`hash = sha256(prev_hash + canonical_json)`).

---

## 2. Key Modules & Features

### 2.1 Explainable Fair-Allocation Engine
Priority scores are calculated deterministically to prevent equipment monopolization:
$$\text{Priority Score} = \text{Purpose Weight} + \text{Fair-Share Score} - (\text{Weekly Hours} \times 2) - (\text{No-Shows} \times 15) + \text{Waiting Boost}$$
*   **Course Projects:** +50 Base
*   **Research:** +45 Base
*   **Startup Prototypes:** +35 Base
*   **Casual Usage:** +20 Base

### 2.2 Pre-Flight Eligibility Engine
Automated checks ensure compliance before booking:
1.  **Required Badge:** Validates active certification (e.g., *Laser Safety Level 2*).
2.  **Trust Tier Requirement:** High-risk assets require higher trust levels (0–3).
3.  **Sanctions Check:** Blocks users with active suspensions or unpaid damage penalties.
4.  **Quota Verification:** Enforces per-day and weekly hour limits.

### 2.3 Cryptographic Audit Ledger
*   Every critical event (listing, request, approval, check-in, return, penalty) appends an immutable block to the ledger.
*   The `/audit` page provides a **Verify Chain Integrity** engine that detects any payload or hash tampering.
*   Includes a **Tamper Demonstration Mode** for hackathon judges to verify mathematical detection.

### 2.4 Incident & Dispute Handling
*   Human-in-the-Loop governance: AI/Rules propose penalties, but **only human managers/directors can confirm penalties**.
*   Users are granted an automatic appeal window (`APPEAL_FILED`).

---

## 3. Indian Context & Localization
*   **Currency:** All pricing, hourly rates, and security holds use Indian Rupees (`₹`).
*   **Personas & Locations:**
    *   **Aarav Sharma** (Student, IIT Bombay)
    *   **Priya Patel** (Researcher, IISc Bangalore)
    *   **Dr. Ananya Iyer** (Lab Owner & Director)
    *   **Vikram Malhotra** (Facility Manager)
    *   **Aditi Rao** (Student)

---

## 4. Testing & Verification Suite
Run the test suite covering priority scoring, conflict matrix, waitlist ordering, and audit chain verification:
```bash
npm test
```

## 5. Quick Start & Deployment
```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Production build
npm run build
```

---
*Created for the Hackathon Submission — LabLoop Enterprise.*
