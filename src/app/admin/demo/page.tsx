// ============================================================
// LabLoop Enterprise — Judge Demo Sandbox & Simulation Controls
// ============================================================

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { runOverdueCheck } from '@/lib/overdue';
import { getDB, saveDB } from '@/lib/db';
import { DEMO_ACCOUNTS } from '@/lib/seed';

export default function DemoControlsPage() {
  const router = useRouter();
  const {
    currentUser,
    login,
    resetData,
    refreshDB,
    logAudit,
    isMounted,
  } = useAppContext();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleResetData = () => {
    resetData();
    showToast('Database reset to clean factory seed state.');
  };

  const handleSimulateOverdue = async () => {
    const db = getDB();
    // Find active booking and set end time to 2 hours ago
    const active = db.bookings.find((b) => b.status === 'checked_in');
    if (active) {
      active.end_time = new Date(Date.now() - 2 * 3600000).toISOString();
      active.due_at = active.end_time;
      saveDB(db);
    }
    const res = await runOverdueCheck();
    refreshDB();
    showToast(`Simulated Overdue Session: ${res.newlyOverdue.length} booking flagged overdue with escalating notices.`);
  };

  const handleSimulateBusyWeek = async () => {
    const db = getDB();
    // Add extra competing bookings to res-laser
    const now = Date.now();
    db.bookings.push({
      id: `bk-busy-1`,
      resource_id: 'res-laser',
      user_id: 'usr-jamie',
      start_time: new Date(now + 24 * 3600000).toISOString(),
      end_time: new Date(now + 26 * 3600000).toISOString(),
      due_at: new Date(now + 26 * 3600000).toISOString(),
      purpose: 'Robotics chassis prototyping',
      purpose_type: 'course_project',
      status: 'waitlisted',
      priority_score: 95,
      explanation_code: 'WAITLISTED_CAPACITY_FULL',
      message: 'Position #2 on waitlist behind Priya Patel.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    saveDB(db);
    refreshDB();
    showToast('Busy week scenario loaded: High-demand waitlists populated on Industrial Laser Cutter.');
  };

  const handleTimeTravelForward = async () => {
    const db = getDB();
    // Advance all bookings forward by 2 hours
    db.bookings.forEach((b) => {
      b.start_time = new Date(new Date(b.start_time).getTime() - 2 * 3600000).toISOString();
      b.end_time = new Date(new Date(b.end_time).getTime() - 2 * 3600000).toISOString();
    });
    saveDB(db);
    await runOverdueCheck();
    refreshDB();
    showToast('Time advanced +2 hours forward: Sessions transitioned and deadlines evaluated.');
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <div className="pb-6 border-b border-slate-200">
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <span>Evaluation Toolkit</span>
            <span>•</span>
            <span>Interactive Sandbox</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Judge Demo Tooling &amp; Simulation Sandbox
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Simulate realistic edge cases in one click: test explainable waitlist promotions, trigger overdue escalations, and switch between roles.
          </p>
        </div>

        {toastMessage && (
          <div className="my-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold shadow-sm flex items-center gap-2">
            <span>✓</span> {toastMessage}
          </div>
        )}

        {/* Action Simulation Buttons */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xl block mb-1">🔄</span>
              <h2 className="font-bold text-slate-900">Reset Demo State</h2>
              <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Restore pristine factory seed data with mathematically valid SHA-256 hashes.
              </p>
            </div>
            <button
              onClick={handleResetData}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition border border-slate-200"
            >
              Reset Data
            </button>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xl block mb-1">📈</span>
              <h2 className="font-bold text-slate-900">Simulate Busy Week</h2>
              <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Inject competing requests and populate explainable waitlist queues to test priority sorting.
              </p>
            </div>
            <button
              onClick={handleSimulateBusyWeek}
              className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-bold transition border border-purple-200"
            >
              Populate Waitlist
            </button>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xl block mb-1">⏰</span>
              <h2 className="font-bold text-slate-900">Simulate Overdue Session</h2>
              <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Set active session end time 2h in past and trigger automated overdue holding alerts.
              </p>
            </div>
            <button
              onClick={handleSimulateOverdue}
              className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold transition border border-rose-200"
            >
              Trigger Overdue
            </button>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xl block mb-1">⏩</span>
              <h2 className="font-bold text-slate-900">Jump Time +2 Hours</h2>
              <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Advance mock clock forward by 2 hours to evaluate automatic grace window expirations.
              </p>
            </div>
            <button
              onClick={handleTimeTravelForward}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition border border-indigo-200"
            >
              Advance 2 Hours
            </button>
          </div>
        </div>

        {/* 10-Step Interactive Journey Guide for Judges */}
        <div className="mt-10 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h2 className="text-base font-black text-slate-900 mb-1">
            Judge 10-Step End-to-End Evaluation Flow
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Follow this sequential journey to verify every capability required in the hackathon brief:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              { step: '1', title: 'List Equipment', desc: 'Login as Dr. Ananya Iyer (Owner) and publish a resource with badge prerequisites and safety rules.', link: '/owner/resources/new' },
              { step: '2', title: 'Discover & Check Eligibility', desc: 'Switch to Alex (Student). Explore catalog, use "Show Eligible Only" filter, and view transparent "Am I Eligible?" checklist.', link: '/' },
              { step: '3', title: 'Upload & Verify Badge', desc: 'Upload safety certification on /profile. Switch to Marcus (Manager) on /manager/verifications to endorse and grant badge.', link: '/profile' },
              { step: '4', title: 'Request & Fairness Scoring', desc: 'Submit reservation request. Observe live explainable priority score breakdown (+50 course, +100 fair-share).', link: '/resources/res-laser' },
              { step: '5', title: 'Owner Decision & Conflict Check', desc: 'Switch to Dr. Sarah on /owner. Review requester score, competing requests, and approve with written reason.', link: '/owner' },
              { step: '6', title: 'QR Check-in with Baseline Photo', desc: 'Open /checkin on mobile or desktop. Scan visual QR, confirm baseline checklist, and capture photo proof.', link: '/checkin' },
              { step: '7', title: 'Active Session & Extension', desc: 'Session goes active. On /return, request a +1 hour extension with automatic conflict detection.', link: '/return' },
              { step: '8', title: 'Side-by-Side Return Inspection', desc: 'Complete checkout checklist and upload post-use photo. View side-by-side comparison before deposit release.', link: '/return' },
              { step: '9', title: 'Incident & Penalty Review', desc: 'Inspect /owner/incidents. Notice human confirmation requirement for penalties and user appeal rights.', link: '/owner/incidents' },
              { step: '10', title: 'Verify Cryptographic Ledger', desc: 'Open /audit. Click "Verify Chain Integrity" to validate SHA-256 merkle links. Test "Tamper Block" to watch it catch tampering.', link: '/audit' },
            ].map((item) => (
              <div
                key={item.step}
                onClick={() => router.push(item.link)}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 transition cursor-pointer flex gap-3"
              >
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Role Switcher */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            Instant Persona Switcher
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {DEMO_ACCOUNTS.map((acc) => (
              <div
                key={acc.id}
                onClick={() => {
                  login(acc.id);
                  showToast(`Switched active persona to ${acc.name} (${acc.label})`);
                }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                  currentUser?.id === acc.id
                    ? 'bg-indigo-50 border-indigo-500 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-900">{acc.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">{acc.label}</span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-2">{acc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
