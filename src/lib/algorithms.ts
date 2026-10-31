// ============================================================
// LabLoop Enterprise — Fair-Share & Priority Engine
// ============================================================

import type { PurposeType } from './types';

// Base weights for different booking purposes
export const PURPOSE_WEIGHTS: Record<PurposeType, number> = {
  course_project: 50,
  research: 45,
  startup_prototype: 35,
  casual_use: 20,
};

// Daily cap per user (hours) before being waitlisted
export const DEFAULT_DAILY_HOUR_CAP = 10;

export interface FairShareContext {
  fair_share_score: number;
  weekly_booked_hours: number;
  no_show_count: number;
  purpose_type: PurposeType;
}

/**
 * Calculate the priority score for a booking request.
 *
 * Formula:
 *   Priority = PurposeWeight + FairShareScore - (WeeklyHours * 2) - (NoShows * 15)
 *
 * Higher scores get priority in the waitlist and approval queue.
 */
export function calculatePriorityScore(ctx: FairShareContext): number {
  const base = PURPOSE_WEIGHTS[ctx.purpose_type] ?? 20;
  const fairShare = ctx.fair_share_score ?? 100;
  const weeklyPenalty = (ctx.weekly_booked_hours ?? 0) * 2;
  const noShowPenalty = (ctx.no_show_count ?? 0) * 15;
  return Math.max(0, Math.round(base + fairShare - weeklyPenalty - noShowPenalty));
}

/**
 * Check whether a user has exceeded their daily usage quota.
 * Returns true if the user should be auto-waitlisted.
 */
export function exceedsDailyQuota(
  dailyBookings: number,
  maxPerDay: number
): boolean {
  return dailyBookings >= maxPerDay;
}

/**
 * Generate an explainable decision payload.
 * Every booking outcome returns a human-readable reason code.
 */
export function explainDecision(
  status: 'approved' | 'waitlisted' | 'rejected' | 'pending_review',
  ctx: {
    priority_score?: number;
    position?: number;
    reason?: string;
    max_per_day?: number;
    daily_bookings?: number;
    eligible?: boolean;
  }
): { explanation_code: string; message: string } {
  const score = ctx.priority_score ?? 0;

  switch (status) {
    case 'pending_review':
      return {
        explanation_code: 'PENDING_HUMAN_REVIEW',
        message: `Request submitted for owner/manager review. Priority score is ${score}.`,
      };
    case 'approved':
      if (score >= 70) {
        return {
          explanation_code: 'APPROVED_HIGH_PRIORITY',
          message: `Approved. Your priority score is ${score} — strong academic/startup need and clean usage record.`,
        };
      }
      return {
        explanation_code: 'APPROVED_STANDARD',
        message: `Approved. Your priority score is ${score} — within fair usage limits.`,
      };

    case 'waitlisted':
      if (ctx.max_per_day && ctx.daily_bookings !== undefined && ctx.daily_bookings >= ctx.max_per_day) {
        return {
          explanation_code: 'WAITLISTED_DAILY_QUOTA_EXCEEDED',
          message: `Waitlisted: you've used your daily quota of ${ctx.max_per_day} bookings. Position #${ctx.position ?? '?'}. Your priority score is ${score}.`,
        };
      }
      if (ctx.reason === 'hourly_cap') {
        return {
          explanation_code: 'WAITLISTED_HOURLY_CAP_REACHED',
          message: `Waitlisted: this resource is fully booked for your requested slot. Position #${ctx.position ?? '?'}. Your priority score is ${score}.`,
        };
      }
      return {
        explanation_code: 'WAITLISTED_CAPACITY_FULL',
        message: `Waitlisted: resource capacity reached. Position #${ctx.position ?? '?'}. Your priority score is ${score}.`,
      };

    case 'rejected':
      if (ctx.eligible === false) {
        return {
          explanation_code: 'REJECTED_PREREQUISITE_MISSING',
          message: 'Rejected: required training certificate or qualification is missing. Complete the training to book this resource.',
        };
      }
      return {
        explanation_code: 'REJECTED_NO_AVAILABILITY',
        message: 'Rejected: no available slots match your requested time. Try another slot.',
      };
  }
}

/**
 * Compute the waitlist position for a new entry.
 * Lower position = higher priority (sorted by priority score descending, then created_at).
 */
export function computeWaitlistPosition(
  existingEntries: { priority_score: number; created_at: string }[],
  newScore: number
): number {
  let position = 1;
  for (const entry of existingEntries) {
    if (entry.priority_score >= newScore) {
      position++;
    }
  }
  return position;
}

/**
 * Apply no-show penalty to a user's fair share score.
 * Reduces priority for future bookings — reviewable by a manager.
 */
export function applyNoShowPenalty(currentScore: number, currentNoShows: number): number {
  return Math.max(0, currentScore - currentNoShows * 15);
}

/**
 * Format a human-readable timestamp for the audit timeline.
 */
export function formatAuditTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate weekly booked hours from a list of bookings.
 */
export function sumWeeklyHours(bookings: { start_time: string; end_time: string }[]): number {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  let total = 0;
  for (const b of bookings) {
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    if (start >= weekStart && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      total += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }
  }
  return Math.round(total * 100) / 100;
}