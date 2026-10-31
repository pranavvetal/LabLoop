// ============================================================
// LabLoop Enterprise — Resource Detail, Eligibility & Booking
// ============================================================

"use client";

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { checkEligibility } from '@/lib/eligibility';
import { PurposeType, Booking } from '@/lib/types';
import { calculatePriorityScore, PURPOSE_WEIGHTS } from '@/lib/algorithms';

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = params?.id as string;

  const {
    resources,
    currentUser,
    users,
    badges,
    bookings,
    requestBooking,
    isMounted,
  } = useAppContext();

  const resource = useMemo(() => {
    return resources.find((r) => r.id === resourceId) || resources[0];
  }, [resources, resourceId]);

  const owner = useMemo(() => {
    return users.find((u) => u.id === resource?.owner_id);
  }, [users, resource]);

  const requiredBadge = useMemo(() => {
    return badges.find((b) => b.id === resource?.required_badge_id);
  }, [badges, resource]);

  // Eligibility evaluation
  const eligibility = useMemo(() => {
    return checkEligibility(currentUser, resource);
  }, [currentUser, resource]);

  // Booking Form State
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 3600000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [purposeType, setPurposeType] = useState<PurposeType>('course_project');
  const [purpose, setPurpose] = useState('');
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute duration
  const durationHours = useMemo(() => {
    if (!startTime || !endTime) return 2;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const diff = endH + endM / 60 - (startH + startM / 60);
    return Math.max(0.5, Math.round(diff * 10) / 10);
  }, [startTime, endTime]);

  // Live Priority Score Preview
  const scoreBreakdown = useMemo(() => {
    const baseWeight = PURPOSE_WEIGHTS[purposeType] || 20;
    const fairShare = currentUser?.fair_share_score || 100;
    const weeklyUsagePenalty = (currentUser?.weekly_booked_hours || 0) * 2;
    const noShowPenalty = (currentUser?.no_show_count || 0) * 15;
    const waitingBoost = 5; // standard bonus for new request
    const net = Math.max(0, baseWeight + fairShare - weeklyUsagePenalty - noShowPenalty + waitingBoost);

    return {
      purpose_weight: baseWeight,
      fair_share_score: fairShare,
      weekly_usage_penalty: -weeklyUsagePenalty,
      no_show_penalty: -noShowPenalty,
      waiting_time_boost: waitingBoost,
      net_score: net,
    };
  }, [purposeType, currentUser]);

  // Conflict Check with Existing Bookings
  const hasConflict = useMemo(() => {
    if (!bookingDate || !startTime || !endTime) return false;
    const reqStart = new Date(`${bookingDate}T${startTime}:00Z`).getTime();
    const reqEnd = new Date(`${bookingDate}T${endTime}:00Z`).getTime();

    return bookings.some(
      (b) =>
        b.resource_id === resource.id &&
        ['approved', 'checked_in'].includes(b.status) &&
        new Date(b.start_time).getTime() < reqEnd &&
        new Date(b.end_time).getTime() > reqStart
    );
  }, [bookings, resource.id, bookingDate, startTime, endTime]);

  const totalCost = (resource.hourly_rate * durationHours).toFixed(2);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (!eligibility.isEligible) {
      setErrorMessage('You must satisfy all prerequisite requirements before requesting this equipment.');
      return;
    }
    if (!agreedToRules) {
      setErrorMessage('You must accept the facility usage rules checklist before proceeding.');
      return;
    }
    if (durationHours <= 0) {
      setErrorMessage('End time must be after start time.');
      return;
    }
    if (resource.max_booking_hours && durationHours > resource.max_booking_hours) {
      setErrorMessage(`Maximum booking length for this resource is ${resource.max_booking_hours} hours.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const startIso = `${bookingDate}T${startTime}:00Z`;
      const endIso = `${bookingDate}T${endTime}:00Z`;

      const newBooking: Booking = {
        id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        resource_id: resource.id,
        user_id: currentUser.id,
        start_time: startIso,
        end_time: endIso,
        due_at: endIso,
        purpose,
        purpose_type: purposeType,
        status: hasConflict ? 'waitlisted' : 'pending',
        priority_score: scoreBreakdown.net_score,
        score_breakdown: scoreBreakdown,
        explanation_code: hasConflict ? 'WAITLISTED_SLOT_CONFLICT' : 'PENDING_HUMAN_REVIEW',
        message: hasConflict
          ? `Requested slot overlaps with an approved booking. You have been placed in position #1 on the waitlist with a priority score of ${scoreBreakdown.net_score}.`
          : `Request routed for owner review. Priority score is ${scoreBreakdown.net_score}. Credits will be held only upon confirmation.`,
        credit_hold: resource.hourly_rate * durationHours,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await requestBooking(newBooking);
      setSubmittedSuccess(true);
      setTimeout(() => {
        router.push('/my-bookings');
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit booking request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted || !resource) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
          >
            ← Back to Equipment Catalog
          </button>
          <span className="text-xs text-slate-500 font-mono">ID: {resource.id}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {submittedSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top-2">
            <span className="text-2xl">✓</span>
            <div>
              <p className="font-bold text-sm">
                Booking request successfully submitted to Dr. Ananya Iyer!
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Cryptographic audit log recorded. Redirecting to your bookings ledger...
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-center gap-3 text-rose-900 shadow-sm">
            <span className="text-xl">⚠</span>
            <p className="font-semibold text-xs">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Media, Specs, Owner Info & Rules (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="h-72 w-full relative bg-slate-900">
                <img
                  src={
                    resource.image_url ||
                    resource.image ||
                    resource.baselinePhotoUrl ||
                    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'
                  }
                  alt={resource.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {resource.category.replace('_', ' ')}
                  </span>
                  <span
                    className={`backdrop-blur-md text-xs font-bold px-3 py-1 rounded-full uppercase ${
                      resource.status === 'available'
                        ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/40'
                        : 'bg-rose-900/80 text-rose-200 border border-rose-500/40'
                    }`}
                  >
                    {resource.status}
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                      {resource.name}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {resource.location}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-indigo-900">
                      ₹${resource.hourly_rate}
                    </span>
                    <span className="text-xs text-slate-500"> / hour</span>
                    {resource.deposit_amount > 0 && (
                      <span className="text-[11px] text-slate-400 block font-medium">
                        +₹${resource.deposit_amount} refundable security hold
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="mt-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Equipment Overview
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {resource.description}
                  </p>
                </div>

                {/* Technical Specifications */}
                {resource.specs && Object.keys(resource.specs).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Hardware Specifications
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(resource.specs).map(([key, val]) => (
                        <div
                          key={key}
                          className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex justify-between items-center text-xs"
                        >
                          <span className="font-semibold text-slate-500">{key}:</span>
                          <span className="font-bold text-slate-800 text-right">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Facility Usage Rules */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Facility Safety Protocols & Rules
                  </h3>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-mono">
                    {resource.rules}
                  </div>
                </div>

                {/* Verified Owner Card */}
                {owner && (
                  <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={owner.avatar_url || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'}
                        alt={owner.full_name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900">{owner.full_name}</span>
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-indigo-200">
                            Verified Faculty Owner ✓
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{owner.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Trust Tier 3 Director</span>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Availability Schedule Preview */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span>Weekly Operational Hours</span>
                <span className="text-xs text-slate-400 font-normal">
                  (Operating: {resource.operating_hours?.start || '08:00'} – {resource.operating_hours?.end || '20:00'})
                </span>
              </h3>
              <div className="grid grid-cols-7 gap-2 text-center text-xs mt-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                  const key = day.toLowerCase();
                  const avail = resource.weekly_availability?.[key];
                  const isOpen = avail ? avail.open : day !== 'Sun';
                  return (
                    <div
                      key={day}
                      className={`p-3 rounded-xl border ${
                        isOpen
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <p className="font-bold">{day}</p>
                      <p className="text-[10px] mt-1 font-medium">{isOpen ? 'Open' : 'Closed'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Pre-Flight Eligibility & Booking Form (1 col) */}
          <div className="space-y-6">
            {/* Interactive "Am I Eligible?" Checklist */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span>Am I Eligible to Book?</span>
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    eligibility.isEligible
                      ? 'bg-emerald-100 text-emerald-800'
                      : eligibility.hasPending
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {eligibility.isEligible ? 'Passed' : eligibility.hasPending ? 'Pending' : 'Action Required'}
                </span>
              </div>

              <div className="divide-y divide-slate-100 mt-2">
                {eligibility.checks.map((check) => (
                  <div key={check.id} className="py-3 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-sm leading-none mt-0.5">
                        {check.status === 'pass' ? (
                          <span className="text-emerald-600">✓</span>
                        ) : check.status === 'pending' ? (
                          <span className="text-amber-500">⏳</span>
                        ) : (
                          <span className="text-rose-600">✗</span>
                        )}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{check.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {check.detail}
                        </p>
                        {check.fix_action && check.status !== 'pass' && (
                          <p className="text-[11px] text-indigo-600 font-semibold mt-1">
                            Action: {check.fix_action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!eligibility.isEligible && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => router.push('/profile')}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition text-center"
                  >
                    Upload Missing Safety Certificate →
                  </button>
                </div>
              )}
            </div>

            {/* Booking Request Form */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100">
                Reserve Equipment
              </h3>

              <form onSubmit={handleSubmitBooking} className="mt-4 space-y-4 text-xs">
                {/* Date */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Reservation Date
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Time Window */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Purpose Type */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Purpose Category (Affects Fairness Score)
                  </label>
                  <select
                    value={purposeType}
                    onChange={(e) => setPurposeType(e.target.value as PurposeType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="course_project">Course Project (+50 priority)</option>
                    <option value="research">Academic Research (+45 priority)</option>
                    <option value="startup_prototype">Startup Prototype (+35 priority)</option>
                    <option value="casual_use">Casual / Personal (+20 priority)</option>
                  </select>
                </div>

                {/* Purpose Statement */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Project Description & Materials
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe specific components, material thickness, and intended fabrication steps..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Fairness Priority Score Breakdown */}
                <div className="bg-indigo-50/70 rounded-2xl p-3 border border-indigo-100 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center font-bold text-indigo-950">
                    <span>Explainable Fairness Score:</span>
                    <span className="text-sm font-black text-indigo-700">
                      {scoreBreakdown.net_score} pts
                    </span>
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>• Purpose Weight:</span>
                    <span>+{scoreBreakdown.purpose_weight}</span>
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>• Baseline Fair-Share:</span>
                    <span>+{scoreBreakdown.fair_share_score}</span>
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>• Weekly Hours Used:</span>
                    <span>{scoreBreakdown.weekly_usage_penalty}</span>
                  </div>
                  {scoreBreakdown.no_show_penalty !== 0 && (
                    <div className="text-rose-600 flex justify-between font-semibold">
                      <span>• No-Show Penalty:</span>
                      <span>{scoreBreakdown.no_show_penalty}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-indigo-800/80 pt-1 border-t border-indigo-200/60 italic">
                    "What-if: Booking 2 more hours this week will decrease score by 4 pts."
                  </p>
                </div>

                {/* Conflict Notice if any */}
                {hasConflict && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                    <span className="font-bold block">Notice: Slot has competing booking</span>
                    Submitting will place you on the explainable waitlist based on your priority score ({scoreBreakdown.net_score}).
                  </div>
                )}

                {/* Agree to Usage Rules */}
                <label className="flex items-start gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreedToRules}
                    onChange={(e) => setAgreedToRules(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 mt-0.5"
                  />
                  <span className="text-[11px] text-slate-700 font-medium">
                    I have read and agree to all facility safety checklists and cleanliness guidelines.
                  </span>
                </label>

                {/* Cost Preview */}
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-600">Estimated Total ({durationHours} hrs):</span>
                  <span className="text-base font-black text-indigo-900">₹${totalCost}</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !eligibility.isEligible || !agreedToRules}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all ${
                    eligibility.isEligible && agreedToRules
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting
                    ? 'Submitting Request...'
                    : hasConflict
                    ? 'Join Explainable Waitlist'
                    : 'Submit Booking Request'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
