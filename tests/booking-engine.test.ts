// ============================================================
// LabLoop Enterprise — Booking Engine & Fairness Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  calculatePriorityScore,
  computeWaitlistPosition,
  exceedsDailyQuota,
  applyNoShowPenalty,
} from '../src/lib/algorithms';
import {
  evaluateBookingRequest,
  intervalsOverlap,
} from '../src/lib/booking-engine';
import { verifyAuditChain, computeEntryHash } from '../src/lib/audit';
import { getSeedData } from '../src/lib/seed';
import { User, Resource, AuditLog } from '../src/lib/types';

describe('Fairness & Priority Score Algorithm', () => {
  it('calculates expected score for course project with clean history', () => {
    const score = calculatePriorityScore({
      fair_share_score: 100,
      weekly_booked_hours: 4,
      no_show_count: 0,
      purpose_type: 'course_project',
    });
    // 50 (course_project) + 100 - (4*2 = 8) - 0 = 142
    expect(score).toBe(142);
  });

  it('penalizes no-shows heavily to prevent equipment hoarding', () => {
    const score = calculatePriorityScore({
      fair_share_score: 100,
      weekly_booked_hours: 4,
      no_show_count: 2,
      purpose_type: 'course_project',
    });
    // 142 - (2*15 = 30) = 112
    expect(score).toBe(112);
  });

  it('prioritizes academic research and course work over casual use', () => {
    const scoreCourse = calculatePriorityScore({
      fair_share_score: 100,
      weekly_booked_hours: 0,
      no_show_count: 0,
      purpose_type: 'course_project',
    });
    const scoreCasual = calculatePriorityScore({
      fair_share_score: 100,
      weekly_booked_hours: 0,
      no_show_count: 0,
      purpose_type: 'casual_use',
    });
    expect(scoreCourse).toBeGreaterThan(scoreCasual);
  });
});

describe('Interval Overlap & Conflict Detection', () => {
  it('detects overlapping intervals correctly', () => {
    const aStart = new Date('2026-11-02T10:00:00Z');
    const aEnd = new Date('2026-11-02T12:00:00Z');

    const bStart = new Date('2026-11-02T11:00:00Z');
    const bEnd = new Date('2026-11-02T13:00:00Z');

    expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it('allows back-to-back non-overlapping intervals', () => {
    const aStart = new Date('2026-11-02T10:00:00Z');
    const aEnd = new Date('2026-11-02T12:00:00Z');

    const bStart = new Date('2026-11-02T12:00:00Z');
    const bEnd = new Date('2026-11-02T14:00:00Z');

    expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });
});

describe('Waitlist Positioning', () => {
  it('places higher priority scores ahead in the queue', () => {
    const existing = [
      { priority_score: 140, created_at: '2026-10-31T09:00:00Z' },
      { priority_score: 110, created_at: '2026-10-31T09:05:00Z' },
    ];

    // Score 125 should be in position 2 (after 140, ahead of 110)
    const position = computeWaitlistPosition(existing, 125);
    expect(position).toBe(2);

    // Score 150 should be position 1 (top of waitlist)
    const topPos = computeWaitlistPosition(existing, 150);
    expect(topPos).toBe(1);
  });
});

describe('Evaluate Booking Request Engine', () => {
  const seed = getSeedData();
  const alex = seed.users.find((u) => u.id === 'usr-alex')!;
  const laser = seed.resources.find((r) => r.id === 'res-laser')!;

  it('rejects booking in the past', () => {
    const res = evaluateBookingRequest(
      seed,
      alex,
      laser,
      '2020-01-01T10:00:00Z',
      '2020-01-01T12:00:00Z',
      'course_project'
    );
    expect(res.outcome).toBe('rejected');
    expect(res.explanation_code).toBe('REJECTED_PAST_TIME');
  });

  it('rejects booking outside operating hours', () => {
    const res = evaluateBookingRequest(
      seed,
      alex,
      laser,
      '2026-11-03T02:00:00Z',
      '2026-11-03T04:00:00Z',
      'course_project'
    );
    expect(res.outcome).toBe('rejected');
    expect(res.explanation_code).toBe('REJECTED_OUTSIDE_OPERATING_HOURS');
  });

  it('routes valid booking to pending_review without auto-approval', () => {
    const res = evaluateBookingRequest(
      seed,
      alex,
      laser,
      '2026-11-05T14:00:00Z',
      '2026-11-05T16:00:00Z',
      'course_project'
    );
    expect(res.outcome).toBe('pending_review');
    expect(res.explanation_code).toBe('PENDING_HUMAN_REVIEW');
    expect(res.priority_score).toBeGreaterThan(0);
  });
});

describe('Cryptographic SHA-256 Audit Chain', () => {
  it('detects tampering when an audit log payload is modified', async () => {
    const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const logData = {
      id: 'test-log-1',
      action: 'BOOKING_APPROVED',
      entity: 'booking',
      entity_id: 'bk-1',
      performed_by: 'usr-sarah',
      payload: { amount: 30 },
      timestamp: '2026-10-31T12:00:00Z',
    };

    const hash = await computeEntryHash(prevHash, logData);
    const validChain: AuditLog[] = [{ ...logData, prev_hash: prevHash, hash }];

    const check1 = await verifyAuditChain(validChain);
    expect(check1.valid).toBe(true);

    // Tamper with payload
    const tamperedChain: AuditLog[] = [
      {
        ...logData,
        payload: { amount: 99999 }, // modified!
        prev_hash: prevHash,
        hash,
      },
    ];

    const check2 = await verifyAuditChain(tamperedChain);
    expect(check2.valid).toBe(false);
    expect(check2.message).toContain('Tamper detected');
  });
});
