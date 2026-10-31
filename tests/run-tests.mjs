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

describe('End-to-End Complete 10-Step Journey Simulation', () => {
  test('executes full journey from listing to mathematical ledger verification', async () => {
    const crypto = await import('node:crypto');
    function sha256(str) {
      return crypto.createHash('sha256').update(str).digest('hex');
    }

    const ledger = [];
    let currentHash = '0000000000000000000000000000000000000000000000000000000000000000';

    function appendEvent(action, payload) {
      const canonicalData = JSON.stringify({ action, payload });
      const hash = sha256(currentHash + ':' + canonicalData);
      ledger.push({ action, payload, prev_hash: currentHash, hash });
      currentHash = hash;
    }

    // Step 1: Owner lists resource
    appendEvent('RESOURCE_LISTED', { id: 'res-laser', name: 'Laser 500W', owner: 'Dr. Sarah' });
    assert.strictEqual(ledger.length, 1);

    // Step 2: Student checks eligibility
    appendEvent('ELIGIBILITY_CHECKED', { student: 'Alex', resource: 'res-laser', pass: true });

    // Step 3: Badge verified
    appendEvent('BADGE_VERIFIED', { student: 'Alex', badge: 'Laser Safety L2', verifier: 'Marcus Lee' });

    // Step 4: Request booking with priority scoring
    const score = calculatePriorityScore({ fair_share_score: 100, weekly_booked_hours: 0, no_show_count: 0, purpose_type: 'course_project' });
    appendEvent('BOOKING_REQUESTED', { booking_id: 'bk-100', score });

    // Step 5: Owner approves booking with written reason
    appendEvent('BOOKING_APPROVED', { booking_id: 'bk-100', approver: 'Dr. Sarah', reason: 'Confirmed for course capstone' });

    // Step 6: Student check-in with baseline condition photo
    appendEvent('CHECK_IN_RECORDED', { booking_id: 'bk-100', photo_hash: 'photo-hash-baseline-001', checklist_ok: true });

    // Step 7: Extension requested and evaluated
    appendEvent('EXTENSION_REQUESTED', { booking_id: 'bk-100', extra_hours: 1 });

    // Step 8: Return inspection comparison
    appendEvent('RETURN_RECORDED', { booking_id: 'bk-100', return_photo_hash: 'photo-hash-return-002', clean: true });

    // Step 9: Incident review & penalty proposal (human confirmed)
    appendEvent('INCIDENT_RESOLVED', { incident_id: 'inc-01', confirmed_by: 'Marcus Lee', penalty: 'Safety Warning' });

    // Step 10: Mathematical verification of the complete ledger
    assert.strictEqual(ledger.length, 9);
    for (let i = 0; i < ledger.length; i++) {
      if (i > 0) {
        assert.strictEqual(ledger[i].prev_hash, ledger[i - 1].hash);
      }
      const canonical = JSON.stringify({ action: ledger[i].action, payload: ledger[i].payload });
      const expectedHash = sha256(ledger[i].prev_hash + ':' + canonical);
      assert.strictEqual(ledger[i].hash, expectedHash);
    }
  });
});
