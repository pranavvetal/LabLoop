// ============================================================
// LabLoop Enterprise — Explainable Fair-Allocation Booking Engine
// ============================================================

import type { User, Resource, Booking, PurposeType } from './types';
import { LabloopDB } from './db';
import { checkEligibility } from './eligibility';
import {
  PURPOSE_WEIGHTS,
  calculatePriorityScore,
  exceedsDailyQuota,
  explainDecision,
  computeWaitlistPosition,
  sumWeeklyHours,
} from './algorithms';

export interface CheckResult {
  id: string;
  label: string;
  status: 'pass' | 'fail';
  detail?: string;
}

export interface SuggestedSlot {
  start: string;
  end: string;
  label: string;
}

export interface BookingEvaluationResult {
  outcome: 'pending_review' | 'waitlisted' | 'rejected';
  checks: CheckResult[];
  priority_score: number;
  score_breakdown: Record<string, number>;
  explanation_code: string;
  message: string;
  position?: number;
  suggested_slots?: SuggestedSlot[];
  credit_hold?: number;
}

/** Check if two time intervals overlap */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Find the 3 nearest available free slots on the same resource.
 */
export function findNearestFreeSlots(
  resource: Resource,
  requestedStart: Date,
  durationHours: number,
  existingBookings: Booking[]
): SuggestedSlot[] {
  const suggestions: SuggestedSlot[] = [];
  const durationMs = durationHours * 3600000;

  // Search forward in 1-hour increments for the next 48 hours
  let testStart = new Date(requestedStart.getTime() + 2 * 3600000);
  const maxSearch = requestedStart.getTime() + 48 * 3600000;

  while (testStart.getTime() < maxSearch && suggestions.length < 3) {
    const testEnd = new Date(testStart.getTime() + durationMs);

    // Check operating hours
    let inHours = true;
    if (resource.operating_hours) {
      const [hStart, mStart] = resource.operating_hours.start.split(':').map(Number);
      const [hEnd, mEnd] = resource.operating_hours.end.split(':').map(Number);
      const startMinutes = testStart.getHours() * 60 + testStart.getMinutes();
      const endMinutes = testEnd.getHours() * 60 + testEnd.getMinutes();
      const opStartM = hStart * 60 + mStart;
      const opEndM = hEnd * 60 + mEnd;
      if (startMinutes < opStartM || endMinutes > opEndM) inHours = false;
    }

    if (inHours) {
      const conflict = existingBookings.some((b) => {
        if (!['approved', 'checked_in'].includes(b.status)) return false;
        return intervalsOverlap(testStart, testEnd, new Date(b.start_time), new Date(b.end_time));
      });

      if (!conflict) {
        suggestions.push({
          start: testStart.toISOString(),
          end: testEnd.toISOString(),
          label: `${testStart.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${testStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
        // Jump ahead by the duration
        testStart = new Date(testEnd.getTime() + 3600000);
        continue;
      }
    }
    testStart = new Date(testStart.getTime() + 3600000);
  }

  return suggestions;
}

/**
 * Deterministically evaluate a booking request with explainability.
 * ENGINE NEVER AUTO-APPROVES: every valid request goes to human review.
 */
export function evaluateBookingRequest(
  db: LabloopDB | any,
  user: User,
  resource: Resource,
  startISO: string,
  endISO: string,
  purpose_type: PurposeType
): BookingEvaluationResult {
  const checks: CheckResult[] = [];
  const start = new Date(startISO);
  const end = new Date(endISO);
  const now = new Date();

  const durationHours = (end.getTime() - start.getTime()) / 3600000;

  // Compute Priority Score
  const baseWeight = PURPOSE_WEIGHTS[purpose_type] || 20;
  const fairShare = user.fair_share_score ?? 100;
  const weeklyUsagePenalty = (user.weekly_booked_hours ?? 0) * 2;
  const noShowPenalty = (user.no_show_count ?? 0) * 15;
  const waitingBoost = 5;
  const priority_score = Math.max(
    0,
    Math.round(baseWeight + fairShare - weeklyUsagePenalty - noShowPenalty + waitingBoost)
  );

  const score_breakdown: Record<string, number> = {
    purpose_weight: baseWeight,
    fair_share_score: fairShare,
    weekly_usage_penalty: -weeklyUsagePenalty,
    no_show_penalty: -noShowPenalty,
    waiting_time_boost: waitingBoost,
    net_score: priority_score,
  };

  // -----------------------------------------------------------
  // a) Hard Rejects
  // -----------------------------------------------------------

  // 1. Invalid time formatting
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    checks.push({ id: 'time_valid', label: 'Valid Time Format', status: 'fail', detail: 'Invalid date/time provided.' });
    return {
      outcome: 'rejected',
      checks,
      priority_score,
      score_breakdown,
      explanation_code: 'REJECTED_INVALID_TIME',
      message: 'Rejected: Reservation timestamps are invalid or unparseable.',
    };
  }

  if (end <= start) {
    checks.push({ id: 'time_order', label: 'End After Start', status: 'fail', detail: 'End time must be after start time.' });
    return {
      outcome: 'rejected',
      checks,
      priority_score,
      score_breakdown,
      explanation_code: 'REJECTED_INVALID_INTERVAL',
      message: 'Rejected: Reservation end time must be chronologically after start time.',
    };
  }

  if (start < now) {
    checks.push({ id: 'future_time', label: 'Booking in Future', status: 'fail', detail: 'Requested start time is in the past.' });
    return {
      outcome: 'rejected',
      checks,
      priority_score,
      score_breakdown,
      explanation_code: 'REJECTED_PAST_TIME',
      message: 'Rejected: You cannot book a slot in the past.',
    };
  }

  // 2. Pre-flight Eligibility Check (Prerequisite badges, trust tier, sanctions)
  const eligibility = checkEligibility(user, resource);
  if (!eligibility.isEligible) {
    const failedChecks = eligibility.checks.filter((c) => c.status !== 'pass');
    failedChecks.forEach((fc) => {
      checks.push({
        id: fc.id,
        label: fc.label,
        status: 'fail',
        detail: fc.detail,
      });
    });

    return {
      outcome: 'rejected',
      checks,
      priority_score,
      score_breakdown,
      explanation_code: 'REJECTED_INELIGIBLE',
      message: `Rejected: Ineligible to book ${resource.name}. ${failedChecks.map((f) => f.detail).join(' ')}`,
    };
  }

  // 3. Resource Operational Status
  if (resource.status !== 'available' || !resource.is_active) {
    checks.push({
      id: 'resource_status',
      label: 'Resource Available',
      status: 'fail',
      detail: `Resource is currently ${resource.status}.`,
    });
    return {
      outcome: 'rejected',
      checks,
      priority_score,
      score_breakdown,
      explanation_code: 'REJECTED_RESOURCE_UNAVAILABLE',
      message: `Rejected: ${resource.name} is currently under maintenance or calibration.`,
    };
  }

  // 4. Operating Hours
  if (resource.operating_hours) {
    const [hStart, mStart] = resource.operating_hours.start.split(':').map(Number);
    const [hEnd, mEnd] = resource.operating_hours.end.split(':').map(Number);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const opStartM = hStart * 60 + mStart;
    const opEndM = hEnd * 60 + mEnd;

    if (startMinutes < opStartM || endMinutes > opEndM) {
      checks.push({
        id: 'operating_hours',
        label: 'Within Operating Hours',
        status: 'fail',
        detail: `Operating window is ${resource.operating_hours.start} – ${resource.operating_hours.end}.`,
      });
      return {
        outcome: 'rejected',
        checks,
        priority_score,
        score_breakdown,
        explanation_code: 'REJECTED_OUTSIDE_OPERATING_HOURS',
        message: `Rejected: Requested time falls outside facility operating hours (${resource.operating_hours.start} - ${resource.operating_hours.end}).`,
      };
    }
  }

  // 5. Max Booking Duration
  if (resource.max_booking_hours && durationHours > resource.max_booking_hours) {
    checks.push({
      id: 'max_duration',
      label: 'Within Max Duration',
      status: 'fail',
      detail: `Requested ${durationHours}h exceeds maximum allowed limit of ${resource.max_booking_hours}h.`,
    });
    return {
      outcome: 'rejected',
      checks,
      priority_score,
      score_breakdown,
      explanation_code: 'REJECTED_EXCEEDS_MAX_HOURS',
      message: `Rejected: Requested booking duration of ${durationHours} hours exceeds per-booking cap of ${resource.max_booking_hours} hours.`,
    };
  }

  // -----------------------------------------------------------
  // b) Conflict Detection & Double-Booking
  // -----------------------------------------------------------

  // Check if same user is double-booked on another equipment at the same time
  const userOverlappingBookings = (db.bookings || []).filter(
    (b: Booking) =>
      b.user_id === user.id &&
      ['approved', 'checked_in'].includes(b.status) &&
      intervalsOverlap(start, end, new Date(b.start_time), new Date(b.end_time))
  );

  if (userOverlappingBookings.length > 0) {
    checks.push({
      id: 'user_double_booking',
      label: 'No Concurrent Double Booking',
      status: 'fail',
      detail: `You already have an approved reservation for resource "${userOverlappingBookings[0].resource_id}" during this exact timeframe.`,
    });
    return {
      outcome: 'rejected',
      checks,
      priority_score,
      score_breakdown,
      explanation_code: 'REJECTED_USER_DOUBLE_BOOKED',
      message: 'Rejected: You are already confirmed on another campus asset during this window. Concurrent bookings are disallowed.',
    };
  }

  // Check if target resource is occupied
  const resourceConflicts = (db.bookings || []).filter(
    (b: Booking) =>
      b.resource_id === resource.id &&
      ['approved', 'checked_in'].includes(b.status) &&
      intervalsOverlap(start, end, new Date(b.start_time), new Date(b.end_time))
  );

  if (resourceConflicts.length > 0) {
    checks.push({
      id: 'slot_free',
      label: 'Slot Available Without Conflict',
      status: 'fail',
      detail: `Slot conflicts with confirmed session ${resourceConflicts[0].id}.`,
    });

    const waitlistEntries = (db.waitlist || []).filter((w: any) => w.resource_id === resource.id);
    const position = computeWaitlistPosition(waitlistEntries, priority_score);
    const suggested_slots = findNearestFreeSlots(resource, start, durationHours, db.bookings || []);

    return {
      outcome: 'waitlisted',
      checks,
      priority_score,
      score_breakdown,
      position,
      suggested_slots,
      explanation_code: 'WAITLISTED_SLOT_CONFLICT',
      message: `Waitlisted: Requested window is reserved by another lab session. You are placed in position #${position} on the explainable waitlist based on your priority score (${priority_score}).`,
    };
  }

  // -----------------------------------------------------------
  // c) Fair-Use Quotas & Group Allocation Limits
  // -----------------------------------------------------------

  // Group / Shared usage detection
  const userGroups = (db.groups || []).filter((g: any) => g.member_ids.includes(user.id));
  const teamMemberIds = userGroups.flatMap((g: any) => g.member_ids);

  // Daily quota per user (and team)
  const dayBookings = (db.bookings || []).filter((b: Booking) => {
    const isSameDate = new Date(b.start_time).toDateString() === start.toDateString();
    const isUserOrTeam = b.user_id === user.id || teamMemberIds.includes(b.user_id);
    return isSameDate && isUserOrTeam && ['approved', 'checked_in', 'pending'].includes(b.status);
  });

  const dailyCap = resource.max_per_day || 2;
  if (dayBookings.length >= dailyCap) {
    checks.push({
      id: 'daily_quota',
      label: 'Within Daily Booking Cap',
      status: 'fail',
      detail: `Daily cap of ${dailyCap} sessions reached for today (including shared team quota).`,
    });

    const waitlistEntries = (db.waitlist || []).filter((w: any) => w.resource_id === resource.id);
    const position = computeWaitlistPosition(waitlistEntries, priority_score);

    return {
      outcome: 'waitlisted',
      checks,
      priority_score,
      score_breakdown,
      position,
      explanation_code: 'WAITLISTED_DAILY_CAP_REACHED',
      message: `Waitlisted: You or your registered team have used your daily fair-share cap of ${dailyCap} bookings. Position #${position}.`,
    };
  }

  // -----------------------------------------------------------
  // d) All Checks Passed -> Route for Human Approval
  // -----------------------------------------------------------

  checks.push({ id: 'all_passed', label: 'All Eligibility & Fairness Policies Satisfied', status: 'pass' });

  return {
    outcome: 'pending_review',
    checks,
    priority_score,
    score_breakdown,
    explanation_code: 'PENDING_HUMAN_REVIEW',
    message: `Request routed for owner verification. Explainable priority score: ${priority_score}. Human review required.`,
    credit_hold: resource.hourly_rate * durationHours,
  };
}
