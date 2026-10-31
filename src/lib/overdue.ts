// ============================================================
// LabLoop Enterprise — Automated Overdue Detection & Delays
// ============================================================

import { getDB, updateBooking, addNotification, appendAuditLog } from './db';
import { Booking } from './types';

export interface OverdueCheckResult {
  checkedCount: number;
  newlyOverdue: string[];
  notificationsSent: number;
}

/**
 * Scan active sessions and flag overdue equipment holdings.
 * Creates PENDING proposals only — never automatic penalties without human confirmation.
 */
export async function runOverdueCheck(): Promise<OverdueCheckResult> {
  const db = getDB();
  const now = new Date();
  const newlyOverdue: string[] = [];
  let notificationsSent = 0;

  for (const b of db.bookings) {
    if (b.status === 'checked_in') {
      const dueTime = new Date(b.due_at || b.end_time);

      if (now > dueTime) {
        // Mark as overdue
        updateBooking(b.id, {
          status: 'overdue',
          explanation_code: 'OVERDUE_AUTOMATED_FLAG',
          message: `Session exceeded scheduled checkout time of ${dueTime.toLocaleTimeString()}. Return immediately to avoid disciplinary hold.`,
        });

        newlyOverdue.push(b.id);

        // Send escalating notification to student
        addNotification(
          b.user_id,
          'URGENT: Equipment Holding Overdue ⚠',
          `Your session for booking ${b.id} ended at ${dueTime.toLocaleTimeString()}. Complete Return Inspection immediately to prevent security hold.`,
          '/return'
        );
        notificationsSent++;

        // Escalate to manager & owner
        const res = db.resources.find((r) => r.id === b.resource_id);
        if (res) {
          addNotification(
            res.owner_id,
            'Session Overdue Escalation',
            `User on ${res.name} has not checked out. Session is overdue by ${Math.round((now.getTime() - dueTime.getTime()) / 60000)} minutes.`,
            '/owner'
          );
          notificationsSent++;
        }

        // Log audit event
        await appendAuditLog({
          action: 'OVERDUE_HOLDING_FLAGGED',
          entity: 'booking',
          entity_id: b.id,
          performed_by: 'system_daemon',
          reason: `Session elapsed by ${Math.round((now.getTime() - dueTime.getTime()) / 60000)} minutes. Automated reminders dispatched.`,
          payload: { booking_id: b.id, due_at: b.due_at, now: now.toISOString() },
        });
      }
    }
  }

  return {
    checkedCount: db.bookings.filter((b) => b.status === 'checked_in' || b.status === 'overdue').length,
    newlyOverdue,
    notificationsSent,
  };
}
