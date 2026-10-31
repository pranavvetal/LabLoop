// ============================================================
// LabLoop Enterprise — My Bookings & Waitlist Management
// ============================================================

"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { BookingStatus, Booking } from '@/lib/types';

export default function MyBookingsPage() {
  const router = useRouter();
  const {
    currentUser,
    bookings,
    resources,
    cancelBooking,
    isMounted,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<
    'upcoming' | 'waitlisted' | 'active' | 'past' | 'cancelled'
  >('upcoming');

  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Filter bookings for current user
  const userBookings = useMemo(() => {
    return bookings.filter((b) => b.user_id === currentUser?.id);
  }, [bookings, currentUser]);

  const filteredBookings = useMemo(() => {
    switch (activeTab) {
      case 'upcoming':
        return userBookings.filter((b) => ['pending', 'approved'].includes(b.status));
      case 'waitlisted':
        return userBookings.filter((b) => b.status === 'waitlisted');
      case 'active':
        return userBookings.filter((b) => ['checked_in', 'overdue'].includes(b.status));
      case 'past':
        return userBookings.filter((b) => ['returned', 'rejected'].includes(b.status));
      case 'cancelled':
        return userBookings.filter((b) => b.status === 'cancelled');
      default:
        return userBookings;
    }
  }, [userBookings, activeTab]);

  const handleConfirmCancel = async () => {
    if (!cancelModalId) return;
    setIsCancelling(true);
    try {
      await cancelBooking(cancelModalId, cancelReason || 'User requested cancellation');
      setCancelModalId(null);
      setCancelReason('');
    } catch (err: any) {
      alert(`Error cancelling booking: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    const config: Record<string, { label: string; bg: string; text: string }> = {
      pending: { label: 'Pending Review', bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800' },
      approved: { label: 'Approved ✓', bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800' },
      checked_in: { label: 'Active (Checked In)', bg: 'bg-indigo-100 border-indigo-300', text: 'text-indigo-800' },
      overdue: { label: 'Overdue ⚠', bg: 'bg-rose-100 border-rose-300', text: 'text-rose-800' },
      returned: { label: 'Returned & Closed', bg: 'bg-slate-100 border-slate-300', text: 'text-slate-800' },
      rejected: { label: 'Declined', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
      waitlisted: { label: 'On Waitlist', bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800' },
      cancelled: { label: 'Cancelled', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-500' },
    };

    const c = config[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              My Reservations & Waitlist
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track explainable review status, waitlist rankings, check-in access QR, and full audit timelines.
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            + Browse More Equipment
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 mt-6 pb-2 scrollbar-none">
          {[
            { id: 'upcoming', label: 'Upcoming / Pending', count: userBookings.filter((b) => ['pending', 'approved'].includes(b.status)).length },
            { id: 'waitlisted', label: 'Waitlist', count: userBookings.filter((b) => b.status === 'waitlisted').length },
            { id: 'active', label: 'Active Sessions', count: userBookings.filter((b) => ['checked_in', 'overdue'].includes(b.status)).length },
            { id: 'past', label: 'Completed', count: userBookings.filter((b) => ['returned', 'rejected'].includes(b.status)).length },
            { id: 'cancelled', label: 'Cancelled', count: userBookings.filter((b) => b.status === 'cancelled').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Bookings List */}
        <div className="mt-6 space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              No reservations found in the &ldquo;{activeTab}&rdquo; view.
            </div>
          ) : (
            filteredBookings.map((bk) => {
              const res = resources.find((r) => r.id === bk.resource_id);

              return (
                <div
                  key={bk.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-slate-300 transition"
                >
                  {/* Left Column: Details */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {getStatusBadge(bk.status)}
                      <span className="text-[11px] font-mono text-slate-400">ID: {bk.id}</span>
                      {bk.status === 'waitlisted' && (
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Position #1 on Waitlist
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-slate-900">
                      {res?.name || bk.resource_id}
                    </h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {res?.location || 'Campus Lab'}
                    </p>

                    {/* Window & Purpose */}
                    <div className="mt-3 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                          Reserved Slot
                        </span>
                        <span className="font-bold text-slate-800">
                          {new Date(bk.start_time).toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          • {new Date(bk.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                          {new Date(bk.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                          Purpose ({bk.purpose_type.replace('_', ' ')})
                        </span>
                        <span className="text-slate-800 italic truncate block">
                          &ldquo;{bk.purpose}&rdquo;
                        </span>
                      </div>
                    </div>

                    {/* Explainable Decision Note */}
                    <div className="mt-3 text-xs bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100/80">
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950 mb-1">
                        <span>Explainable Engine Reason ({bk.explanation_code}):</span>
                        {bk.priority_score > 0 && (
                          <span className="text-indigo-700 font-black">
                            Score: {bk.priority_score} pts
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {bk.message}
                      </p>
                      {bk.decision_reason && (
                        <p className="text-[11px] text-emerald-800 font-semibold mt-1">
                          Owner Note: &ldquo;{bk.decision_reason}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 items-stretch min-w-[200px]">
                    {/* Approved Action -> Check-in */}
                    {bk.status === 'approved' && (
                      <button
                        onClick={() => router.push('/checkin')}
                        className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm text-center"
                      >
                        Start Check-in Scan →
                      </button>
                    )}

                    {/* Checked In -> Return flow */}
                    {bk.status === 'checked_in' && (
                      <button
                        onClick={() => router.push('/checkin')}
                        className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm text-center"
                      >
                        Return Equipment Inspection →
                      </button>
                    )}

                    {/* View Booking Timeline */}
                    <button
                      onClick={() => router.push(`/bookings/${bk.id}`)}
                      className="py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition text-center"
                    >
                      Audit Trail & Timeline
                    </button>

                    {/* Cancel Action */}
                    {['pending', 'approved', 'waitlisted'].includes(bk.status) && (
                      <button
                        onClick={() => setCancelModalId(bk.id)}
                        className="py-2 px-4 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold transition text-center"
                      >
                        {bk.status === 'waitlisted' ? 'Leave Waitlist' : 'Cancel Booking'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cancellation Confirmation Modal */}
        {cancelModalId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Cancellation
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Cancelling releases any held credit and immediately promotes the next student on the fair-allocation waitlist.
              </p>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Schedule conflict with midterm exam..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalId(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Keep Reservation
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleConfirmCancel}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition"
                >
                  {isCancelling ? 'Releasing Slot...' : 'Confirm Release Slot'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
