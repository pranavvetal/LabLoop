# LabLoop

LabLoop is a campus lab & equipment sharing platform designed for academic makerspaces. It enables efficient resource management through fair-share allocation, automated eligibility verification, and high-accountability tracking.

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Testing the End-to-End Journey

### 1. Student Persona (Alex Chen)
- **Browse & Book**: Navigate to the Home page, browse available equipment (e.g., Epilog Laser Cutter), and click "Request Booking".
- **Safety Training**: On the reservation page, perform a simulated OCR verification by clicking "Upload Safety Certificate" to unlock booking.
- **Submit**: Fill in the form and submit your request.

### 2. Owner Persona (Sarah Jenkins)
- **Manage Requests**: Navigate to the **Owner Dashboard** (/owner).
- **Approve/Waitlist**: Review pending requests, approve the student's booking, or move it to the Waitlist.
- **Fleet Control**: Toggle equipment status (e.g., set Trotec Laser to "Maintenance").

### 3. Admin/Security Persona (Dr. Marcus Vance)
- **Check-in/Out**: Navigate to the **Check-in Kiosk** (/checkin), "scan" a reservation, and perform the baseline/final condition photo capture.
- **Audit Ledger**: Navigate to the **Audit Trail** (/audit) to verify the immutability of actions (JSON payload inspection, cryptographic signatures, IP logging).

## Hackathon Solution Features
- **OCR Eligibility Verification**: Instant safety certificate validation simulator for instant compliance.
- **Fair-Share Waiting List**: Automated promotion logic when slots open.
- **Immutable Audit Trail**: Cryptographically-signed logs capturing action, actor, payload, and machine state.
- **Condition Reporting**: Baseline and end-session photography to enforce damage accountability and deposit protection.
