// ============================================================
// LabLoop Enterprise — Anti-Monopolisation & Fairness Monitor
// ============================================================

"use client";

import React, { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { updateUser, addNotification } from '@/lib/db';

export default function FairnessDashboard() {
  const {
    currentUser,
    users,
    bookings,
    resources,
    refreshDB,
    logAudit,
    isMounted,
  } = useAppContext();

  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Compute usage and detect potential hoarding signals
  const flaggedUsers = useMemo(() => {
    return users.map((u) => {
      const uBookings = bookings.filter((b) => b.user_id === u.id);
      const weeklyHours = u.weekly_booked_hours || 0;
      const cancels = uBookings.filter((b) => b.status === 'cancelled').length;

      const signals: string[] = [];

      if (weeklyHours >= 12) {
        signals.push(`High weekly volume: ${weeklyHours} hrs consumed`);
      }
      if (u.no_show_count >= 1) {
        signals.push(`${u.no_show_count} unexcused no-show incident(s)`);
      }
      if (cancels >= 2) {
        signals.push(`Elevated cancellation frequency (${cancels} cancelled bookings)`);
      }
      if (u.fair_share_score < 70) {
        signals.push(`Reduced Fair-Share Score (${u.fair_share_score} pts)`);
      }

      return {
        user: u,
        weeklyHours,
        cancels,
        signals,
        isFlagged: signals.length > 0,
      };
    });
  }, [users, bookings]);

  const handleIssueWarning = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    try {
      addNotification(
        userId,
        'Fair-Share Usage Advisory Notice',
        `Facility administration has issued a reminder regarding campus equipment allocation policies. Please ensure all booked slots are utilized.`,
        '/my-bookings'
      );

      await logAudit(
        'FAIRNESS_WARNING_ISSUED',
        'user',
        userId,
        `Manager ${currentUser?.full_name} issued fair-share usage advisory to ${targetUser.full_name}.`,
        { user_id: userId, issuer: currentUser?.id }
      );

      refreshDB();
      setActionNotice(`Advisory notice issued to ${targetUser.full_name}.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Error issuing notice: ${err.message}`);
    }
  };

  const handleAdjustScore = async (userId: string, delta: number) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    try {
      const newScore = Math.max(20, Math.min(150, targetUser.fair_share_score + delta));
      updateUser(userId, { fair_share_score: newScore });

      await logAudit(
        'FAIR_SHARE_SCORE_ADJUSTED',
        'user',
        userId,
        `Manager ${currentUser?.full_name} adjusted fair-share score of ${targetUser.full_name} from ${targetUser.fair_share_score} to ${newScore}.`,
        { oldScore: targetUser.fair_share_score, newScore, delta }
      );

      refreshDB();
      setActionNotice(`Updated ${targetUser.full_name}'s score to ${newScore} pts.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Error updating score: ${err.message}`);
    }
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <div className="pb-6 border-b border-slate-200">
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <span>Fair Allocation Oversight</span>
            <span>•</span>
            <span>Anti-Monopolisation Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Fair-Share &amp; Allocation Integrity Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Detect equipment hoarding, multi-account quota pooling, and back-to-back reservation locking. Flags require human evaluation; automated penalties are strictly prohibited.
          </p>
        </div>

        {actionNotice && (
          <div className="my-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold shadow-sm flex items-center gap-2">
            <span>✓</span> {actionNotice}
          </div>
        )}

        {/* User Usage Ledger Table */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">
              User Rolling Fair-Share Ledger
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {flaggedUsers.filter((u) => u.isFlagged).length} Flagged for Review
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {flaggedUsers.map(({ user, weeklyHours, cancels, signals, isFlagged }) => (
              <div
                key={user.id}
                className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition ${
                  isFlagged ? 'bg-amber-50/20' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={user.full_name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900">{user.full_name}</span>
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {user.role}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono">ID: {user.id}</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">{user.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-[11px]">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block">Fair-Share Score</span>
                      <span className="font-black text-indigo-700 text-sm mt-0.5 block">
                        {user.fair_share_score} pts
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block">Weekly Volume</span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                        {weeklyHours} hrs
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block">No-Shows</span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                        {user.no_show_count}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block">Trust Tier</span>
                      <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                        Tier {user.trust_tier}
                      </span>
                    </div>
                  </div>

                  {/* Signals List */}
                  {signals.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {signals.map((sig, idx) => (
                        <span
                          key={idx}
                          className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-amber-300"
                        >
                          ⚠ {sig}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manager Review Controls */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 min-w-[170px]">
                  <button
                    onClick={() => handleIssueWarning(user.id)}
                    className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-bold text-[11px] transition text-center"
                  >
                    Issue Usage Advisory
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAdjustScore(user.id, -10)}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 rounded-xl font-bold text-[10px] transition text-center"
                      title="Adjust priority score down by 10 points"
                    >
                      -10 Pts
                    </button>
                    <button
                      onClick={() => handleAdjustScore(user.id, 10)}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-xl font-bold text-[10px] transition text-center"
                      title="Restore priority score up by 10 points"
                    >
                      +10 Pts
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
