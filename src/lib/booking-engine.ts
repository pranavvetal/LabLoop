// ============================================================
// LabLoop Enterprise — Booking Engine
// ============================================================

/**
 * Phase 3 – Booking request evaluation
 * -----------------------------------------------------------
 * The engine receives a booking request and runs a deterministic series
 * of checks, returning an *explained* outcome.  The logic re‑uses the
 * functions in `src/lib/algorithms.ts` – we never duplicate the core
 * calculations.
 *
 * The return shape mirrors the spec:
 *   {
 *     outcome: 'pending_review' | 'waitlisted' | 'rejected',
 *     checks: CheckResult[],               // each check with pass/fail info
 *     priority_score?: number,
 *     score_breakdown?: Record<string, number>,
 *     explanation_code: string,
 *     message: string,
 *     position?: number                     // waitlist position when applicable
 *   }
 */

import type { User, Resource, Booking, PurposeType } from "./types";
import {
  PURPOSE_WEIGHTS,
  calculatePriorityScore,
  exceedsDailyQuota,
  explainDecision,
  computeWaitlistPosition,
  sumWeeklyHours,
} from "./algorithms";

/** Simple helper to determine overlap between two time intervals */
function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Helper to fetch bookings that are "active" for conflict detection */
function getActiveBookings(bookings: Booking[]): Booking[] {
  return bookings.filter(
    (b) => b.status === "approved" || b.status === "checked_in"
  );
}

/**
 * Evaluate a booking request against the current DB state.
 *
 * @param db          The shared DB object (any – we only read its arrays).
 * @param user        The requesting user.
 * @param resource    The target resource.
 * @param startISO    ISO‑string start time.
 * @param endISO      ISO‑string end time.
 * @param purpose_type The requested purpose type.
 */
export function evaluateBookingRequest(
  db: any,
  user: User,
  resource: Resource,
  startISO: string,
  endISO: string,
  purpose_type: PurposeType
) {
  const checks: Array<{ id: string; label: string; status: "pass" | "fail"; detail?: string }> = [];
  const start = new Date(startISO);
  const end = new Date(endISO);
  const now = new Date();

  // -----------------------------------------------------------
  // a) Hard rules
  // -----------------------------------------------------------
  // 1. Basic time validation
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    checks.push({ id: "time_invalid", label: "Valid start/end times", status: "fail", detail: "Unparseable timestamps" });
    const { explanation_code, message } = explainDecision("rejected", { eligible: false });
    return { outcome: "rejected" as const, checks, explanation_code, message };
  }
  if (end <= start) {
    checks.push({ id: "time_order", label: "End after start", status: "fail", detail: "End time precedes start time" });
    const { explanation_code, message } = explainDecision("rejected", { eligible: false });
    return { outcome: "rejected" as const, checks, explanation_code, message };
  }
  if (start < now) {
    checks.push({ id: "in_past", label: "Booking not in the past", status: "fail", detail: "Start time is before now" });
    const { explanation_code, message } = explainDecision("rejected", { eligible: false });
    return { outcome: "rejected" as const, checks, explanation_code, message };
  }

  // 2. Resource active flag
  if (!resource.is_active) {
    checks.push({ id: "resource_active", label: "Resource is active", status: "fail" });
    const { explanation_code, message } = explainDecision("rejected", { eligible: false });
    return { outcome: "rejected" as const, checks, explanation_code, message };
  }

  // 3. Operating hours (if defined)
  if (resource.operating_hours) {
    const [{ start: opStart, end: opEnd }] = [resource.operating_hours];
    const [hStart, mStart] = opStart.split(":").map(Number);
    const [hEnd, mEnd] = opEnd.split(":").map(Number);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const opStartM = hStart * 60 + mStart;
    const opEndM = hEnd * 60 + mEnd;
    if (startMinutes < opStartM || endMinutes > opEndM) {
      checks.push({ id: "operating_hours", label: "Within operating hours", status: "fail", detail: `Allowed ${opStart}-${opEnd}` });
      const { explanation_code, message } = explainDecision("rejected", { eligible: false });
      return { outcome: "rejected" as const, checks, explanation_code, message };
    }
  }

  // 4. Max booking hours per request
  if (resource.max_booking_hours) {
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diffHours > resource.max_booking_hours) {
      checks.push({ id: "max_booking_hours", label: "Within max booking hours", status: "fail", detail: `Limit ${resource.max_booking_hours}h` });
      const { explanation_code, message } = explainDecision("rejected", { eligible: false, reason: "hourly_cap" });
      return { outcome: "rejected" as const, checks, explanation_code, message };
    }
  }

  // -----------------------------------------------------------
  // b) Conflict detection
  // -----------------------------------------------------------
  const activeBookings = getActiveBookings(db.bookings ?? []);
  const overlapping = activeBookings.filter((b) => {
    const bStart = new Date(b.start_time);
    const bEnd = new Date(b.end_time);
    return intervalsOverlap(start, end, bStart, bEnd);
  });

  if (overlapping.length) {
    checks.push({ id: "conflict", label: "No overlapping bookings", status: "fail", detail: `Conflicts with ${overlapping.length} existing booking(s)` });
    // For simplicity we return a generic waitlist outcome; suggestion slots are stubbed.
    const priority_score = calculatePriorityScore({
      fair_share_score: user.fair_share_score,
      weekly_booked_hours: user.weekly_booked_hours,
      no_show_count: user.no_show_count,
      purpose_type,
    });
    const position = computeWaitlistPosition(db.waitlist?.filter((w: any) => w.resource_id === resource.id) ?? [], priority_score);
    const { explanation_code, message } = explainDecision("waitlisted", { priority_score, position, reason: "hourly_cap" });
    return {
      outcome: "waitlisted" as const,
      checks,
      priority_score,
      explanation_code,
      message,
      position,
    };
  }

  // -----------------------------------------------------------
  // c) Fair‑use rules
  // -----------------------------------------------------------
  // Daily quota per user (using resource.max_per_day if defined, else default)
  const dailyQuota = resource.max_per_day ?? 0;
  const userDailyBookings = db.bookings?.filter((b: Booking) => b.user_id === user.id && new Date(b.start_time).toDateString() === start.toDateString()).length ?? 0;
  if (dailyQuota && exceedsDailyQuota(userDailyBookings, dailyQuota)) {
    checks.push({ id: "daily_quota", label: "Within daily quota", status: "fail" });
    const priority_score = calculatePriorityScore({
      fair_share_score: user.fair_share_score,
      weekly_booked_hours: user.weekly_booked_hours,
      no_show_count: user.no_show_count,
      purpose_type,
    });
    const position = computeWaitlistPosition(db.waitlist?.filter((w: any) => w.resource_id === resource.id) ?? [], priority_score);
    const { explanation_code, message } = explainDecision("waitlisted", { priority_score, position, max_per_day: dailyQuota, daily_bookings: userDailyBookings });
    return {
      outcome: "waitlisted" as const,
      checks,
      priority_score,
      explanation_code,
      message,
      position,
    };
  }

  // Weekly hour cap – we reuse the weekly sum helper
  const weeklyHours = sumWeeklyHours(db.bookings?.filter((b: Booking) => b.user_id === user.id) ?? []);
  const weeklyCap = 40; // arbitrary cap; could be a resource field later
  if (weeklyHours + (end.getTime() - start.getTime()) / (1000 * 60 * 60) > weeklyCap) {
    checks.push({ id: "weekly_cap", label: "Within weekly hour cap", status: "fail" });
    const priority_score = calculatePriorityScore({
      fair_share_score: user.fair_share_score,
      weekly_booked_hours: user.weekly_booked_hours,
      no_show_count: user.no_show_count,
      purpose_type,
    });
    const position = computeWaitlistPosition(db.waitlist?.filter((w: any) => w.resource_id === resource.id) ?? [], priority_score);
    const { explanation_code, message } = explainDecision("waitlisted", { priority_score, position, reason: "weekly_cap" });
    return {
      outcome: "waitlisted" as const,
      checks,
      priority_score,
      explanation_code,
      message,
      position,
    };
  }

  // -----------------------------------------------------------
  // d) Competing pending requests (not implemented fully – stub)
  // -----------------------------------------------------------
  // For now we treat the request as pending_review – a human will decide.
  const priority_score = calculatePriorityScore({
    fair_share_score: user.fair_share_score,
    weekly_booked_hours: user.weekly_booked_hours,
    no_show_count: user.no_show_count,
    purpose_type,
  });
  const score_breakdown: Record<string, number> = {
    purpose_weight: PURPOSE_WEIGHTS[purpose_type] ?? 20,
    fair_share_score: user.fair_share_score,
    weekly_penalty: (user.weekly_booked_hours ?? 0) * 2,
    no_show_penalty: (user.no_show_count ?? 0) * 15,
  };

  const { explanation_code, message } = explainDecision("pending_review", {} as any);
  // Since `explainDecision` does not have a branch for pending_review, we craft a generic one.
  const pendingExplanation = {
    explanation_code: "PENDING_REVIEW",
    message: `Your request is pending review. Priority score: ${priority_score}`,
  };

  return {
    outcome: "pending_review" as const,
    checks,
    priority_score,
    score_breakdown,
    explanation_code: pendingExplanation.explanation_code,
    message: pendingExplanation.message,
  };
}

// Export type for the result (useful for callers & tests)
export type BookingEvaluationResult = ReturnType<typeof evaluateBookingRequest>;
