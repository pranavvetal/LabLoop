# LabLoop 🔬⚡

> **Unlocking Underused Equipment & Spaces** — A trusted platform for academic makerspaces, shared labs, and fabrication facilities. Featuring verified eligibility, explainable fair-share allocation, tamper-evident SHA-256 audit trails, and strict human-in-the-loop oversight.

## 🚀 Live Demo
Visit the production site: [https://labloop-go37.onrender.com/](https://labloop-go37.onrender.com/)

---

## 🎯 Problem & Vision
Academic institutions invest millions in high-end machinery (laser cutters, CNC mills, microscopes), yet these resources remain bottlenecked by:
1. **Underutilization**: Equipment sits idle while users lack discovery or clear access pathways.
2. **Safety Liability**: Operation requires verified training and credentials.
3. **Monopolisation**: Lack of fair allocation leads to hoarding.
4. **Accountability Disputes**: Paper logs offer zero proof of baseline condition or misuse.

**LabLoop** solves this through an audited lifecycle: verified equipment listings → automated eligibility checks → explainable fair-share scoring → owner review → QR check-in & return with condition reports → tamper-evident cryptographic audit ledger.

---

## 🧪 Quick Start & Demo Journey

### 1. Persona Login
Visit [https://labloop-go37.onrender.com/login](https://labloop-go37.onrender.com/login) to switch between personas:
| Persona | Role | Purpose |
| :--- | :--- | :--- |
| **Aarav Sharma** | Student | Test bookings, eligibility, fair queue |
| **Priya Patel** | Researcher | Upload certs, experience alternatives |
| **Dr. Ananya Iyer** | Owner | Review queue, fleet control |
| **Vikram Malhotra** | Manager | Verify badges, inspect incidents |

### 2. Follow the Flow
1. **Explore:** Search and filter by eligibility on the home page.
2. **Request:** Select equipment, see the priority score breakdown, and submit.
3. **Verify:** Upload safety certificates (simulated) on your profile.
4. **Approve:** Log in as **Dr. Ananya Iyer** (Owner) to review the queue.
5. **Check-in:** Use the QR kiosk flow with condition baseline photos.
6. **Audit:** Inspect the `/audit` page for immutable SHA-256 hash chains.

---

## 🏛️ Stack
*   Next.js 14 (App Router)
*   TypeScript & Tailwind CSS
*   Web Crypto API (for Audit Ledger)
*   HTML5-QRcode (for Check-in)
*   LocalStorage (Persistent State sync across tabs)
