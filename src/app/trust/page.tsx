// ============================================================
// LabLoop Enterprise — Trust Tiers & Reputation Level-Up
// ============================================================

"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { TRUST_TIER_DEFINITIONS, getTierActionsToLevelUp } from '@/lib/trust';

export default function TrustPage() {
  const router = useRouter();
  const { currentUser, userBadges, isMounted } = useAppContext();

  const myBadges = useMemo(() => {
    return userBadges.filter((ub) => ub.user_id === currentUser?.id && ub.verified);
  }, [userBadges, currentUser]);

  const levelUpTasks = useMemo(() => {
    if (!currentUser) return [];
    return getTierActionsToLevelUp(currentUser, myBadges.length);
  }, [currentUser, myBadges]);

  const completedCount = levelUpTasks.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedCount / (levelUpTasks.length || 1)) * 100);

  if (!isMounted || !currentUser) {
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
        {/* Header */}
        <div className="pb-6 border-b border-slate-200">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <span>Progressive Trust Architecture</span>
            <span>•</span>
            <span>Zero Opaque Penalties</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Trust Tier &amp; Clearance Standing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Higher-risk equipment requires higher Trust Tiers. Earn progression through verified training, on-time returns, and clean inspection reports.
          </p>
        </div>

        {/* Current Standing Card */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Standing
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  Trust Tier {currentUser.trust_tier}
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                  {TRUST_TIER_DEFINITIONS[currentUser.trust_tier].title.split('—')[1]}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {TRUST_TIER_DEFINITIONS[currentUser.trust_tier].description}
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-2xl font-black text-indigo-700">
                {progressPercent}%
              </span>
              <span className="text-xs text-slate-400 block font-semibold">
                Milestone Progress
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
              <span>Next Tier Milestone: Tier {Math.min(3, currentUser.trust_tier + 1)}</span>
              <span>{completedCount} of {levelUpTasks.length} Requirements Complete</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Checklist to Level Up */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Exact Actions to Advance Your Tier:
            </h3>
            <div className="space-y-2.5 text-xs">
              {levelUpTasks.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border flex items-center justify-between ${
                    t.completed
                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <span className="font-semibold">{t.task}</span>
                  <span className={`font-bold ${t.completed ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {t.completed ? 'Completed ✓' : 'In Progress'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => router.push('/profile')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Upload Safety Certificate to Fulfill Requirement →
              </button>
            </div>
          </div>
        </div>

        {/* Tier Roadmap Matrix */}
        <div className="mt-10">
          <h2 className="text-base font-black text-slate-900 mb-4">
            University Equipment Trust Hierarchy
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {TRUST_TIER_DEFINITIONS.map((def) => {
              const isCurrent = currentUser.trust_tier === def.tier;

              return (
                <div
                  key={def.tier}
                  className={`p-5 rounded-3xl border flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">
                        Tier {def.tier}
                      </span>
                      {isCurrent && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.2 rounded-full uppercase">
                          You Are Here
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{def.title.split('—')[1]}</h3>
                    <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                      {def.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-indigo-900 uppercase block">
                      Unlocked Hardware:
                    </span>
                    <span className="text-[11px] text-slate-700 font-medium mt-0.5 block">
                      {def.allowedEquipment}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
