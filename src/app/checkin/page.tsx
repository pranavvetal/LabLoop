// ============================================================
// LabLoop Enterprise — QR Check-in & Baseline Condition Inspection
// ============================================================

"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { verifyResourceToken } from '@/lib/qr';
import { Booking } from '@/lib/types';

export default function CheckInPage() {
  const router = useRouter();
  const {
    currentUser,
    bookings,
    resources,
    checkIn,
    isMounted,
  } = useAppContext();

  // Multi-step flow: 1. scan -> 2. condition_report -> 3. supervisor_pin -> 4. activated
  const [step, setStep] = useState<'scan' | 'checklist' | 'supervisor' | 'success'>('scan');

  // Input code / Scanned result
  const [manualCode, setManualCode] = useState('');
  const [scannedResourceId, setScannedResourceId] = useState<string | null>(null);
  const [matchedBooking, setMatchedBooking] = useState<Booking | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Condition report state
  const [checklistState, setChecklistState] = useState<{ label: string; ok: boolean }[]>([]);
  const [notes, setNotes] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  // Eligible bookings for the current user (approved or active)
  const myApprovedBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.user_id === currentUser?.id && b.status === 'approved'
    );
  }, [bookings, currentUser]);

  const matchedResource = useMemo(() => {
    return resources.find((r) => r.id === (scannedResourceId || matchedBooking?.resource_id));
  }, [resources, scannedResourceId, matchedBooking]);

  const handleProcessCode = (code: string) => {
    setScanError(null);
    const result = verifyResourceToken(code);
    if (!result.valid || !result.resourceId) {
      setScanError('Unrecognized QR token format. Enter resource ID (e.g. res-laser) or scan valid placard.');
      return;
    }

    const resId = result.resourceId;
    setScannedResourceId(resId);

    // Find user's approved booking for this resource
    const booking = myApprovedBookings.find((b) => b.resource_id === resId);

    if (!booking) {
      setScanError(
        `No approved reservation found for resource "${resId}" under your account. Ensure your request has been confirmed by Dr. Ananya Iyer.`
      );
      return;
    }

    setMatchedBooking(booking);

    // Initialize checklist items from resource
    const res = resources.find((r) => r.id === resId);
    const initialChecklist = (res?.usage_checklist || [
      'Visual exterior inspection clear of debris and damage',
      'Power connections grounded and switches intact',
      'Safety emergency stop button accessible and clear',
      'Personal Protective Equipment (glasses/lab coat) donned',
    ]).map((label) => ({ label, ok: true }));

    setChecklistState(initialChecklist);
    setStep('checklist');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be under 2MB.');
      return;
    }

    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleCheckItem = (index: number) => {
    const updated = [...checklistState];
    updated[index].ok = !updated[index].ok;
    setChecklistState(updated);
  };

  const handleProceedFromChecklist = () => {
    if (!photoDataUrl) {
      alert('Mandatory safety requirement: Capture or upload pre-use baseline photo before activation.');
      return;
    }

    if (matchedResource?.requires_supervisor) {
      setStep('supervisor');
    } else {
      handleCompleteActivation();
    }
  };

  const handleCompleteActivation = async () => {
    if (!matchedBooking) return;

    if (matchedResource?.requires_supervisor && supervisorPin !== '1234') {
      alert('Invalid Supervisor PIN. Facility supervisor Vikram Malhotra must provide sign-off PIN (Demo PIN: 1234).');
      return;
    }

    setIsActivating(true);
    try {
      await checkIn(
        matchedBooking.id,
        checklistState,
        notes || 'Check-in baseline verified clean and operational.',
        photoDataUrl || undefined,
        supervisorPin || undefined
      );
      setStep('success');
    } catch (err: any) {
      alert(`Activation error: ${err.message}`);
    } finally {
      setIsActivating(false);
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 text-xs font-bold">
          <span className={`px-3 py-1 rounded-full ${step === 'scan' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            1. Scan QR
          </span>
          <span className="text-slate-300">→</span>
          <span className={`px-3 py-1 rounded-full ${step === 'checklist' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            2. Safety Baseline
          </span>
          {matchedResource?.requires_supervisor && (
            <>
              <span className="text-slate-300">→</span>
              <span className={`px-3 py-1 rounded-full ${step === 'supervisor' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                3. Supervisor PIN
              </span>
            </>
          )}
          <span className="text-slate-300">→</span>
          <span className={`px-3 py-1 rounded-full ${step === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            Ready
          </span>
        </div>

        {/* STEP 1: Scan & Verify */}
        {step === 'scan' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-6">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center mx-auto mb-3 text-xl">
                📷
              </div>
              <h1 className="text-2xl font-black text-slate-900">
                Hardware QR Check-in
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Scan the visual placard mounted on the equipment to activate power and record baseline inspection.
              </p>
            </div>

            {scanError && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs font-semibold text-left">
                ⚠ {scanError}
              </div>
            )}

            {/* Quick One-Click Approved Reservations */}
            {myApprovedBookings.length > 0 && (
              <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Your Confirmed Bookings Ready to Scan:
                </span>
                <div className="space-y-2">
                  {myApprovedBookings.map((b) => {
                    const r = resources.find((res) => res.id === b.resource_id);
                    return (
                      <div
                        key={b.id}
                        className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{r?.name}</span>
                          <span className="text-[11px] text-slate-500">
                            {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                            {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleProcessCode(b.resource_id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition shadow-sm"
                        >
                          Simulate Scan Event →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual Code Input Fallback */}
            <div className="pt-4 border-t border-slate-100 text-left">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Manual Code / Token Entry
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. res-laser or LABLOOP:eyJyaWQ..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleProcessCode(manualCode)}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                >
                  Verify Code
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
              <button
                onClick={() => router.push('/return')}
                className="text-indigo-600 font-bold hover:underline"
              >
                Returning equipment instead? Open Return Inspection →
              </button>
              <span className="text-slate-400">Grace window: ±30 min</span>
            </div>
          </div>
        )}

        {/* STEP 2: Pre-Use Safety Checklist & Condition Photo */}
        {step === 'checklist' && matchedResource && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Step 2 of 3 • Safety Verification
                </span>
                <h1 className="text-xl font-black text-slate-900">
                  {matchedResource.name}
                </h1>
                <p className="text-xs text-slate-500">{matchedResource.location}</p>
              </div>
              <button
                onClick={() => setStep('scan')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            {/* Baseline Photo Reference */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 text-xs">
              <img
                src={
                  matchedResource.image_url ||
                  matchedResource.image ||
                  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'
                }
                alt="Baseline equipment"
                className="w-24 h-24 rounded-xl object-cover border border-slate-300"
              />
              <div>
                <span className="font-bold text-slate-900 block">Baseline Reference Condition</span>
                <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                  Compare the machine physical state to this certified baseline photo. Ensure bed is level, lenses intact, and no residual cutting debris remains from prior users.
                </p>
              </div>
            </div>

            {/* Interactive Checklist */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Mandatory Operational Checklist Items:
              </span>
              {checklistState.map((item, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer text-xs ${
                    item.ok
                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                      : 'bg-rose-50/60 border-rose-200 text-rose-900'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.ok}
                    onChange={() => handleToggleCheckItem(idx)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="font-semibold block">{item.label}</span>
                    {!item.ok && (
                      <span className="text-[10px] text-rose-700 font-bold block mt-0.5">
                        ⚠ Flagged abnormality — this will be noted in the condition report
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* Pre-Inspection Photo Proof */}
            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">
                Pre-Use Photo Proof * (Mandatory for liability protection)
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="block w-full text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-2xl p-2 bg-slate-50"
              />
              {photoDataUrl ? (
                <div className="mt-2 flex items-center gap-3 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-900">
                  <span className="text-base font-bold">✓</span>
                  <span className="font-semibold truncate">Photo recorded: {photoName || 'Captured Asset'}</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Take a photo of the machine work area and control panel before starting.
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="text-xs">
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Condition Notes or Existing Wear
              </label>
              <textarea
                rows={2}
                placeholder="Note any existing scratches, minor cosmetic blemishes, or anomalous sounds..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleProceedFromChecklist}
              disabled={!photoDataUrl}
              className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md ${
                photoDataUrl
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {matchedResource.requires_supervisor
                ? 'Proceed to Supervisor PIN Verification →'
                : 'Confirm & Activate Hardware Access'}
            </button>
          </div>
        )}

        {/* STEP 3: Supervisor Sign-off (if required) */}
        {step === 'supervisor' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-6 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 font-bold flex items-center justify-center mx-auto text-xl">
              🛡
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                Staff Supervision Required
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                This high-containment asset requires on-site supervisor endorsement before firing. Vikram Malhotra must enter safety PIN.
              </p>
            </div>

            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-[11px] text-amber-900 font-medium">
              Demo Sandbox Hint: Use PIN <strong>1234</strong>
            </div>

            <div>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value)}
                className="w-36 text-center text-2xl tracking-widest font-black bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('checklist')}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              >
                Back
              </button>
              <button
                onClick={handleCompleteActivation}
                disabled={isActivating || supervisorPin.length < 4}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                {isActivating ? 'Verifying...' : 'Unlock Power'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success & Session Active */}
        {step === 'success' && matchedBooking && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 font-black text-3xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              ✓
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                Equipment Session Activated!
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Check-in logged to cryptographic SHA-256 audit ledger. Baseline photos and checklists signed.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Asset:</span>
                <span className="font-bold text-slate-900">{matchedResource?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Return:</span>
                <span className="font-bold text-indigo-700">
                  {new Date(matchedBooking.end_time).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Audit Proof:</span>
                <span className="font-mono text-[10px] text-slate-400">CHECK_IN_RECORDED</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => router.push('/return')}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition shadow-md"
              >
                Go to Return Flow →
              </button>
              <button
                onClick={() => router.push('/my-bookings')}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition"
              >
                View in My Bookings
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
