// ============================================================
// LabLoop Enterprise — Privacy, Data Security & Audit Governance
// ============================================================

"use client";

import React from 'react';
import { Navbar } from '@/components/Navbar';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <div className="pb-6 border-b border-slate-200">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <span>Security by Design</span>
            <span>•</span>
            <span>FERPA &amp; Institutional Governance Compliant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Privacy, Accountability &amp; Security Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            How LabLoop protects student privacy, restricts personal data exposure, and maintains mathematical audit accountability.
          </p>
        </div>

        <div className="mt-8 space-y-6 text-xs text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              1. What Information is Collected &amp; Stored
            </h2>
            <p>
              LabLoop collects minimal institutional data required for physical safety, equipment tracking, and insurance compliance:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li><strong>Institutional Identity:</strong> University email, full name, and academic role (student, faculty, researcher). No national identifiers or financial payment tokens.</li>
              <li><strong>Prerequisite Verification:</strong> Digital safety training certificates (PDF or photographic receipts) uploaded for departmental review.</li>
              <li><strong>Visual Baseline Condition Proof:</strong> Pre-use check-in photos and post-use return photos captured to verify hardware integrity.</li>
              <li><strong>Ledger State Events:</strong> Timestamps of bookings, check-in scans, returns, and dispute resolutions linked via SHA-256 cryptographic hashes.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              2. Privacy Boundaries &amp; Role-Based Access
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Pre-Approval Privacy</span>
                <p className="text-slate-500 text-[11px]">
                  Equipment owners see only academic purpose, priority scores, and verified badge credentials before approving. Direct contact details remain obscured until booking confirmation.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Waitlist Anonymization</span>
                <p className="text-slate-500 text-[11px]">
                  Students on waitlists see only their own relative queue position (e.g. &ldquo;Position #1&rdquo;). Other applicants on the waitlist are completely anonymized to prevent social pressure.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              3. Cryptographic Ledger vs. Traditional Databases
            </h2>
            <p>
              Unlike conventional database systems where administrative accounts can silently delete logs, LabLoop implements a <strong>merkle-linked SHA-256 hash chain</strong>. Each event records the hash of the preceding block:
            </p>
            <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] space-y-1">
              <p className="text-emerald-400">// Mathematical integrity rule:</p>
              <p>Block[N].hash = SHA-256(Block[N-1].hash + CanonicalJSON(Block[N].data))</p>
            </div>
            <p className="text-slate-500 text-[11px]">
              Any retroactive tampering or unauthorized modification of past records mathematically invalidates all subsequent block hashes, instantly alerting university compliance auditors.
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              4. Human Oversight &amp; Non-Automated Penalties
            </h2>
            <p>
              In strict accordance with the LabLoop Governance Charter, algorithmic intelligence operates strictly in an advisory capacity:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li><strong>Zero Automatic Disciplinary Sanctions:</strong> Automated scans (e.g. overdue session detection) only generate <em>Pending Proposals</em>.</li>
              <li><strong>Mandatory Human Confirmation:</strong> Fines, deposit deductions, or reservation suspensions must be reviewed and confirmed by a human Lab Manager or Facility Director.</li>
              <li><strong>Guaranteed Due Process:</strong> All users possess the right to file an instant administrative appeal on /owner/incidents, reassigning disputes to an independent System Administrator.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
