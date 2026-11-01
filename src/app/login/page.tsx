// ============================================================
// LabLoop Enterprise — One-Click Fast Demo Login for Judges
// ============================================================

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/lib/context';
import { DEMO_ACCOUNTS } from '@/lib/seed';

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser, resetData } = useAppContext();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleSelectAccount = (id: string) => {
    login(id);
    router.push('/');
  };

  const handleResetData = () => {
    if (confirm('Reset demo database to fresh factory seed state?')) {
      resetData();
      alert('Demo data has been reset to pristine seed state.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center px-4">
        {/* App Branding */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-3xl shadow-xl shadow-indigo-500/25 mb-4">
          L
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          LabLoop Enterprise
        </h1>
        <p className="mt-2 text-base text-slate-300 max-w-xl mx-auto">
          "Unlock Underused Equipment & Spaces" — University makerspace & lab sharing platform with explainable fair-share allocation, verifiable badge prerequisites, and cryptographic SHA-256 audit ledger.
        </p>

        {/* Judge Quick Hint */}
        <div className="mt-4 inline-flex items-center gap-2 bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Hackathon Evaluation Sandbox: Select any pre-configured persona below to enter instant session</span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl px-4 sm:px-6">
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-700 gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Select Persona to Experience Full Journey</h2>
              <p className="text-xs text-slate-400 mt-1">
                Permissions, fairness scores, waitlist rankings, and audit views adapt dynamically to each role.
              </p>
            </div>
            <button
              onClick={handleResetData}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 bg-slate-900/60 hover:bg-rose-950/30 border border-slate-700 hover:border-rose-800 px-3 py-1.5 rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Seed Data
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {DEMO_ACCOUNTS.map((acc) => {
              const isCurrent = currentUser?.id === acc.id;
              const roleBadgeColors: Record<string, string> = {
                student: 'bg-blue-900/60 text-blue-300 border-blue-700',
                researcher: 'bg-cyan-900/60 text-cyan-300 border-cyan-700',
                owner: 'bg-purple-900/60 text-purple-300 border-purple-700',
                manager: 'bg-amber-900/60 text-amber-300 border-amber-700',
                admin: 'bg-rose-900/60 text-rose-300 border-rose-700',
              };

              return (
                <div
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc.id)}
                  className={`group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'bg-slate-900/60 border-slate-700/80 hover:border-indigo-500/80 hover:bg-slate-900/90 hover:scale-[1.02]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          roleBadgeColors[acc.role] || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {acc.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                      {acc.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {acc.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
                      Login as {acc.name.split(' ')[0]}
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verification Protocol Callout */}
          <div className="mt-8 pt-6 border-t border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold text-sm">✓</span>
              <span><strong>Fair Allocation:</strong> Priority algorithms prevent hoarding and give transparent waitlist placement.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400 font-bold text-sm">✓</span>
              <span><strong>Pre-flight Eligibility:</strong> Badges, safety certs, trust tiers, and good-standing gates checked automatically.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold text-sm">✓</span>
              <span><strong>SHA-256 Ledger:</strong> Every booking, condition photo, return, and penalty decision cryptographically chained.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
