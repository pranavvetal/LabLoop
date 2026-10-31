// ============================================================
// LabLoop Enterprise — Return Flow & Side-by-Side Inspection
// ============================================================

"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { getConditionReportsByBooking } from '@/lib/db';
import { Booking } from '@/lib/types';

export default function ReturnPage() {
  const router = useRouter();
  const {
    currentUser,
    bookings,
    resources,
    returnResource,
    requestExtension,
    isMounted,
  } = useAppContext();

  // Active bookings for user
  const activeBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.user_id === currentUser?.id && ['checked_in', 'overdue'].includes(b.status)
    );
  }, [bookings, currentUser]);

  const [selectedBookingId, setSelectedBookingId] = useState<string>(() => {
    return activeBookings[0]?.id || '';
  });

  const selectedBooking = useMemo(() => {
    return bookings.find((b) => b.id === selectedBookingId);
  }, [bookings, selectedBookingId]);

  const resource = useMemo(() => {
    return resources.find((r) => r.id === selectedBooking?.resource_id);
  }, [resources, selectedBooking]);

  // Fetch Check-In Condition Report for Side-by-Side comparison
  const checkInReport = useMemo(() => {
    if (!selectedBooking) return null;
    const reports = getConditionReportsByBooking(selectedBooking.id);
    return reports.find((r) => r.type === 'check_in') || null;
  }, [selectedBooking]);

  // Return checklist state
  const [returnChecklist, setReturnChecklist] = useState<{ label: string; ok: boolean }[]>([
    { label: 'Work area swept, honeycomb bed/platform vacuumed', ok: true },
    { label: 'No visible material warping, scorch marks, or mechanical fractures', ok: true },
    { label: 'Power switch turned OFF and water chiller/fume ventilation disengaged', ok: true },
    { label: 'Safety goggles and tools returned to designated wall rack', ok: true },
  ]);

  const [returnNotes, setReturnNotes] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(false);

  // Extension Modal
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionHours, setExtensionHours] = useState(1);
  const [isRequestingExtension, setIsRequestingExtension] = useState(false);
  const [extensionNotice, setExtensionNotice] = useState<string | null>(null);

  const handleToggleCheck = (index: number) => {
    const updated = [...returnChecklist];
    updated[index].ok = !updated[index].ok;
    setReturnChecklist(updated);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Detect abnormalities: If any item is marked false, force incident report flow
  const hasAbnormality = useMemo(() => {
    return returnChecklist.some((i) => !i.ok);
  }, [returnChecklist]);

  const handleCompleteReturn = async () => {
    if (!selectedBooking) return;
    if (!photoDataUrl) {
      alert('Return photo proof is mandatory before completing inspection.');
      return;
    }

    if (hasAbnormality) {
      // Force user to file incident report
      if (confirm('Anomalies detected in return inspection! Campus safety policy requires filing an incident report. Proceed to incident filing?')) {
        router.push(`/owner/incidents?booking_id=${selectedBooking.id}`);
        return;
      }
    }

    setIsSubmittingReturn(true);
    try {
      await returnResource(
        selectedBooking.id,
        returnChecklist,
        returnNotes || 'Completed return inspection. All safety checklist items OK.',
        photoDataUrl || undefined
      );
      setReturnSuccess(true);
      setTimeout(() => {
        router.push('/my-bookings');
      }, 3000);
    } catch (err: any) {
      alert(`Return error: ${err.message}`);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handleExtension = async () => {
    if (!selectedBooking) return;
    setIsRequestingExtension(true);
    try {
      await requestExtension(selectedBooking.id, extensionHours);
      setExtensionNotice(`Requested +${extensionHours}h extension. Dispatched to owner for instant review.`);
      setShowExtensionModal(false);
      setTimeout(() => setExtensionNotice(null), 4000);
    } catch (err: any) {
      alert(`Extension error: ${err.message}`);
    } finally {
      setIsRequestingExtension(false);
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Return Inspection & Equipment Checkout
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Side-by-side condition comparison with check-in baseline. Disengages credit holds upon clean checkout.
            </p>
          </div>

          {selectedBooking && (
            <button
              onClick={() => setShowExtensionModal(true)}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl text-xs font-bold transition shadow-xs"
            >
              ⏱ Need More Time? Request Extension
            </button>
          )}
        </div>

        {extensionNotice && (
          <div className="my-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold shadow-sm flex items-center gap-2">
            <span>✓</span> {extensionNotice}
          </div>
        )}

        {returnSuccess && (
          <div className="my-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold shadow-sm flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <p>Return inspection confirmed! Security credit hold released.</p>
              <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                Logged to immutable SHA-256 audit ledger. Redirecting...
              </p>
            </div>
          </div>
        )}

        {/* Active Booking Selector */}
        {activeBookings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400 mt-8">
            <p className="text-base font-bold text-slate-700">No active sessions in your custody</p>
            <p className="mt-1">You must check in via QR before initiating a return inspection.</p>
            <button
              onClick={() => router.push('/checkin')}
              className="mt-4 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition"
            >
              Go to Check-in →
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Session Selector if multiple */}
            {activeBookings.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Active Session to Check Out:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeBookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBookingId(b.id)}
                      className={`p-4 rounded-2xl border cursor-pointer text-xs ${
                        selectedBookingId === b.id
                          ? 'bg-indigo-50 border-indigo-500 font-bold'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <span>Booking {b.id}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Due: {new Date(b.end_time).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Side-by-Side Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Check-in Baseline */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs text-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Baseline State
                    </span>
                    <h3 className="text-base font-bold text-slate-900">Check-in Report</h3>
                  </div>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Certified Baseline
                  </span>
                </div>

                <div className="h-44 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative">
                  <img
                    src={
                      checkInReport?.photos?.[0] ||
                      resource?.image_url ||
                      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500'
                    }
                    alt="Check-in Photo"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Check-in Photo Proof
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600">
                  <p>
                    <strong>Timestamp:</strong>{' '}
                    {checkInReport ? new Date(checkInReport.recorded_at).toLocaleTimeString() : 'Baseline Start'}
                  </p>
                  <p>
                    <strong>Notes:</strong> {checkInReport?.notes || 'Clean baseline recorded.'}
                  </p>
                </div>

                {checkInReport?.checklist_items && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                    <span className="font-bold text-slate-700 block">Baseline Checklist:</span>
                    {checkInReport.checklist_items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-emerald-800">
                        <span>✓</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Return Condition Checklist */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs text-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Current Checkout State
                    </span>
                    <h3 className="text-base font-bold text-slate-900">Return Inspection</h3>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Active Session
                  </span>
                </div>

                {/* Return Photo Upload */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Post-Use Condition Photo *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="block w-full text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-2xl p-2 bg-slate-50"
                  />
                  {photoDataUrl && (
                    <div className="mt-2 h-36 rounded-xl overflow-hidden border border-slate-200 relative">
                      <img src={photoDataUrl} alt="Return state" className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 bg-emerald-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        ✓ Return Photo Captured
                      </span>
                    </div>
                  )}
                </div>

                {/* Return Checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-700 block">Clean &amp; Safe Shutdown Checklist:</span>
                  {returnChecklist.map((item, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        item.ok ? 'bg-emerald-50/50 border-emerald-200 text-slate-900' : 'bg-rose-50 border-rose-300 text-rose-900'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.ok}
                        onChange={() => handleToggleCheck(idx)}
                        className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                      />
                      <span className="flex-1 leading-snug">{item.label}</span>
                    </label>
                  ))}
                </div>

                {/* Return Notes */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Return Notes / Cleaning Confirmation
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Confirm power shutdown, area swept, waste disposed..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none"
                  />
                </div>

                {hasAbnormality && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-[11px] font-semibold">
                    ⚠ Damage or cleaning issue detected! Clicking submit will route this session to Incident Dispute Review.
                  </div>
                )}

                <button
                  onClick={handleCompleteReturn}
                  disabled={isSubmittingReturn || !photoDataUrl}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md ${
                    photoDataUrl
                      ? hasAbnormality
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isSubmittingReturn
                    ? 'Recording Return...'
                    : hasAbnormality
                    ? 'Flag Abnormality & File Incident'
                    : 'Complete Return & Release Deposit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Extension Modal */}
        {showExtensionModal && selectedBooking && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
              <h3 className="text-base font-bold text-slate-900">
                Request Session Extension
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Extensions verify that the subsequent slot is free without conflict and notify the equipment owner for instant approval.
              </p>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Extension Duration
                </label>
                <select
                  value={extensionHours}
                  onChange={(e) => setExtensionHours(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold cursor-pointer"
                >
                  <option value={1}>+1 Hour (${resource?.hourly_rate})</option>
                  <option value={2}>+2 Hours (${(resource?.hourly_rate || 0) * 2})</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtensionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRequestingExtension}
                  onClick={handleExtension}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition"
                >
                  {isRequestingExtension ? 'Checking Conflicts...' : 'Request Extension'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
