# LabLoop Enterprise — Judge Demo Script

## 🎯 2-Minute Judge Quick-Start
If you have 2 minutes to evaluate LabLoop's end-to-end functionality, follow these exact steps:

1. **Open the App**: Visit `http://localhost:3000` (or the deployed URL). You will see the **One-Click Demo Personas** on `/login`.
2. **Step 1: Check Eligibility (Student)**
   - Click **"Login as Alex (Student)"**.
   - Browse the catalog on `/`.
   - Check the **"Show Only Eligible for Me"** filter — see how the 500W Laser Cutter shows **Eligible ✓** while high-containment bio instruments show **Prerequisites Needed ⚠**.
   - Click the Laser Cutter (`/resources/res-laser`) and inspect the **"Am I Eligible?"** checklist.
3. **Step 2: Request & Fairness Scoring**
   - In the booking form, change Purpose to **Course Project (+50 pts)**. Notice the live **Explainable Priority Score (138 pts)** and the *"What-if: Booking 2 more hours lowers score by 4 pts"* notice.
   - Click **"Submit Booking Request"**.
4. **Step 3: Human Owner Review & Conflict Check**
   - Click the top-right Persona switcher and select **Dr. Sarah Jenkins (Owner)**.
   - Navigate to **Owner Portal** (`/owner`).
   - Review Alex's pending request, verified badges, and priority breakdown.
   - Click **Approve Reservation** with note *"Approved for capstone"*.
5. **Step 4: Check-in with Condition Proof & Return**
   - Switch back to **Alex (Student)**.
   - Navigate to **Check-in & Out** (`/checkin`).
   - Click **"Simulate Scan Event"** on the approved reservation.
   - Review baseline safety checklist, upload/capture photo proof, and click **"Confirm & Activate Hardware Access"**.
   - Go to **Return Inspection** (`/return`), verify post-use condition, upload return photo, and click **"Complete Return & Release Deposit"**.
6. **Step 5: Mathematical Audit Chain & Tamper Demo**
   - Navigate to **Audit Trail** (`/audit`).
   - Click **"Verify Chain Integrity"** → Watch all events mathematically validated with SHA-256 merkle linkage.
   - Click **"Tamper with Block (Demo)"** → Modify a block's payload in memory.
   - Click **"Verify Chain Integrity"** again → Watch the validator instantly flag the exact block where tampering occurred!
   - Click **"Repair Chain"** to restore.

---

## ⏱ 3-Minute Live Presentation Script

### Minute 1: The Problem & Discovery (0:00 - 1:00)
- *"Across university campuses, millions of dollars in advanced equipment — laser cutters, incubators, spectrometers — sit idle up to 70% of the week because verified owners lack trust, and students face opaque booking queues."*
- *"LabLoop unlocks underused hardware through four pillars: verifiable safety prerequisites, explainable fair-share allocation, before-and-after condition inspections, and an immutable SHA-256 audit ledger."*
- *[Show `/`] — "Here on the discovery catalog, students don't guess if they can use a machine. The engine checks their active training badges, Trust Tier (0 to 3), and good-standing record before they even request."*

### Minute 2: Explainable Fair-Share & Owner Review (1:00 - 2:00)
- *[Open `/resources/res-laser`] — "When requesting a slot, the student sees a transparent score breakdown: Course Project adds +50 points, Fair-Share baseline gives +100, while heavy weekly usage subtracts points to prevent hoarding."*
- *[Switch to Dr. Sarah Jenkins on `/owner`] — "The engine recommends, but humans always decide. Dr. Jenkins reviews competing student requests ranked by priority, confirms zero slot overlap with an atomic conflict check, and approves with a written justification."*

### Minute 3: Physical Check-in, Return & Audit Ledger (2:00 - 3:00)
- *[Open `/checkin`] — "Students scan the machine's physical QR placard, compare against a certified baseline photo, and upload condition proof. If the machine requires staff supervision, Marcus Lee's supervisor PIN is required."*
- *[Open `/return`] — "At checkout, a side-by-side inspection confirms the machine is clean and powered down. Any damage forces an incident review before deposit release."*
- *[Open `/audit`] — "Finally, every single action is recorded in an immutable SHA-256 hash-chained ledger. Compliance officers can click 'Verify Integrity' at any time to mathematically guarantee zero data tampering."*
