// ============================================================
// LabLoop Enterprise — Booking Audit Timeline & Verification
// ============================================================

"use client";

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { getConditionReportsByBooking } from '@/lib/db';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.id as string;

  const {
    currentUser,
    bookings,
    resources,
    users,
    auditLogs,
    incidents,
    isMounted,
  } = useAppContext();

  const booking = useMemo(() => {
    return bookings.find((b) => b.id === bookingId) || bookings[0];
  }, [bookings, bookingId]);

  const resource = useMemo(() => {
    return resources.find((r) => r.id === booking?.resource_id);
  }, [resources, booking]);

  const applicant = useMemo(() => {
    return users.find((u) => u.id === booking?.user_id);
  }, [users, booking]);

  const relatedLogs = useMemo(() => {
    if (!booking) return [];
    return auditLogs.filter(
      (l) => l.entity_id === booking.id || l.payload?.booking_id === booking.id
    );
  }, [auditLogs, booking]);

  const conditionReports = useMemo(() => {
    if (!booking) return [];
    return getConditionReportsByBooking(booking.id);
  }, [booking]);

  const relatedIncidents = useMemo(() => {
    if (!booking) return [];
    return incidents.filter((i) => i.booking_id === booking.id);
  }, [incidents, booking]);

  if (!isMounted || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <button
              onClick={() => router.back()}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
            >
              ← Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Session Timeline &amp; Proof Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Booking Hash Entity: {booking.id}
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition print:hidden"
          >
            🖨 Export Official Audit Certificate
          </button>
        </div>

        {/* Overview Summary Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Equipment Resource
              </span>
              <h2 className="text-xl font-bold text-slate-900">{resource?.name}</h2>
              <p className="text-xs text-slate-500">{resource?.location}</p>
            </div>

            <div className="sm:text-right">
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-indigo-200">
                {booking.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-500 block mt-1 font-medium">
                Fairness Priority: <strong>{booking.priority_score} pts</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                Applicant
              </span>
              <span className="font-bold text-slate-900 mt-0.5 block">{applicant?.full_name}</span>
              <span className="text-slate-500 text-[11px]">{applicant?.email}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                Reservation Window
              </span>
              <span className="font-bold text-slate-900 mt-0.5 block">
                {new Date(booking.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-slate-500 text-[11px]">
                {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                Credit Deposit Hold
              </span>
              <span className="font-bold text-slate-900 mt-0.5 block">
                ₹{booking.credit_hold || 30}.00
              </span>
              <span className="text-slate-500 text-[11px]">
                {['returned', 'cancelled'].includes(booking.status) ? 'Hold Released ✓' : 'Held in Escrow'}
              </span>
            </div>
          </div>

          {booking.decision_reason && (
            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 text-xs text-emerald-950">
              <span className="font-bold block text-emerald-900">Owner Written Justification:</span>
              &ldquo;{booking.decision_reason}&rdquo;
            </div>
          )}
        </div>

        {/* Condition Reports Showcase */}
        {conditionReports.length > 0 && (
          <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Verified Condition Inspections ({conditionReports.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {conditionReports.map((cr) => (
                <div key={cr.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold uppercase tracking-wider text-slate-900">
                      {cr.type.replace('_', ' ')} Report
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(cr.recorded_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {cr.photos?.[0] && (
                    <div className="h-36 rounded-xl overflow-hidden border border-slate-300">
                      <img src={cr.photos[0]} alt="Condition" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <p className="text-slate-600 text-[11px] italic">
                    &ldquo;{cr.notes}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cryptographic Audit Trail Timeline */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
            Immutable SHA-256 Event Chain
          </h3>

          <div className="mt-6 space-y-6">
            {relatedLogs.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-4">
                Initial state record registered on genesis block.
              </div>
            ) : (
              relatedLogs.map((log, index) => (
                <div key={log.id} className="flex gap-4 items-start text-xs">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {index + 1}
                    </div>
                    {index < relatedLogs.length - 1 && (
                      <div className="w-0.5 h-12 bg-indigo-200 my-1" />
                    )}
                  </div>

                  <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 text-sm">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {log.reason}
                    </p>

                    <div className="pt-2 border-t border-slate-200/60 font-mono text-[9px] text-slate-400 space-y-0.5 break-all">
                      <p>Block Hash: {log.hash}</p>
                      <p>Prev Hash:  {log.prev_hash}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
