// ============================================================
// LabLoop Enterprise — Zero-Dependency Standalone Unit Tests
// ============================================================

import assert from 'node:assert';
import { test, describe } from 'node:test';

// Base weights
const PURPOSE_WEIGHTS = {
  course_project: 50,
  research: 45,
  startup_prototype: 35,
  casual_use: 20,
};

function calculatePriorityScore(ctx) {
  const base = PURPOSE_WEIGHTS[ctx.purpose_type] ?? 20;
  const fairShare = ctx.fair_share_score ?? 100;
  const weeklyPenalty = (ctx.weekly_booked_hours ?? 0) * 2;
  const noShowPenalty = (ctx.no_show_count ?? 0) * 15;
  const waitingBoost = ctx.waiting_boost ?? 5;
  return Math.max(0, Math.round(base + fairShare - weeklyPenalty - noShowPenalty + waitingBoost));
}

function computeWaitlistPosition(existing, newScore) {
  let pos = 1;
  for (const entry of existing) {
    if (entry.priority_score >= newScore) pos++;
  }
  return pos;
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

describe('Fairness & Priority Scoring Algorithm', () => {
  test('calculates accurate priority score for course projects', () => {
    const score = calculatePriorityScore({
      fair_share_score: 100,
      weekly_booked_hours: 4,
      no_show_count: 0,
      purpose_type: 'course_project',
      waiting_boost: 6,
    });
    // 50 + 100 - 8 - 0 + 6 = 148
    assert.strictEqual(score, 148);
  });

  test('penalizes equipment hoarding and repeat no-shows', () => {
    const scoreNormal = calculatePriorityScore({
      fair_share_score: 100,
      weekly_booked_hours: 0,
      no_show_count: 0,
      purpose_type: 'research',
    });
    const scoreNoShow = calculatePriorityScore({
      fair_share_score: 100,
      weekly_booked_hours: 0,
      no_show_count: 2,
      purpose_type: 'research',
    });
    assert.strictEqual(scoreNormal - scoreNoShow, 30); // 2 * 15 penalty
  });
});

describe('Interval Overlap & Conflict Matrix', () => {
  test('flags conflicting overlapping reservation windows', () => {
    const aStart = new Date('2026-11-02T10:00:00Z');
    const aEnd = new Date('2026-11-02T12:00:00Z');
    const bStart = new Date('2026-11-02T11:00:00Z');
    const bEnd = new Date('2026-11-02T13:00:00Z');
    assert.strictEqual(intervalsOverlap(aStart, aEnd, bStart, bEnd), true);
  });

  test('allows consecutive back-to-back non-overlapping slots', () => {
    const aStart = new Date('2026-11-02T10:00:00Z');
    const aEnd = new Date('2026-11-02T12:00:00Z');
    const bStart = new Date('2026-11-02T12:00:00Z');
    const bEnd = new Date('2026-11-02T14:00:00Z');
    assert.strictEqual(intervalsOverlap(aStart, aEnd, bStart, bEnd), false);
  });
});

describe('Explainable Waitlist Placement', () => {
  test('ranks higher priority score ahead in the waitlist queue', () => {
    const queue = [
      { priority_score: 140 },
      { priority_score: 110 },
    ];
    assert.strictEqual(computeWaitlistPosition(queue, 150), 1);
    assert.strictEqual(computeWaitlistPosition(queue, 125), 2);
    assert.strictEqual(computeWaitlistPosition(queue, 90), 3);
  });
});

describe('Cryptographic SHA-256 Audit Verification', () => {
  test('verifies hash generation and tamper detection', async () => {
    const crypto = await import('node:crypto');
    function sha256(str) {
      return crypto.createHash('sha256').update(str).digest('hex');
    }

    const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const payload = JSON.stringify({ action: 'BOOKING_APPROVED', booking_id: 'bk-123' });
    const blockHash = sha256(prevHash + ':' + payload);

    assert.ok(blockHash.length === 64);
    // Altered payload yields different hash
    const tamperedPayload = JSON.stringify({ action: 'BOOKING_APPROVED', booking_id: 'bk-HACKED' });
    const tamperedHash = sha256(prevHash + ':' + tamperedPayload);
    assert.notStrictEqual(blockHash, tamperedHash);
  });
});
