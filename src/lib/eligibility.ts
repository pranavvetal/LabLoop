// ============================================================
// LabLoop Enterprise — Pre-flight Eligibility & Verification Logic
// ============================================================

import { User, Resource, UserBadge, Certificate } from './types';
import { getDB } from './db';

export interface EligibilityCheckItem {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'pending';
  detail: string;
  fix_action?: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  hasPending: boolean;
  score: number;
  checks: EligibilityCheckItem[];
}

/**
 * Perform transparent, deterministic pre-flight eligibility checks for a user on a resource.
 */
export function checkEligibility(
  user: User | null | undefined,
  resource: Resource
): EligibilityResult {
  const checks: EligibilityCheckItem[] = [];

  if (!user) {
    return {
      isEligible: false,
      hasPending: false,
      score: 0,
      checks: [
        {
          id: 'auth_required',
          label: 'Authentication Required',
          status: 'fail',
          detail: 'You must be signed in with a verified university campus account to request lab equipment.',
          fix_action: 'Sign in via one-click demo accounts or institutional SSO',
        },
      ],
    };
  }

  const db = getDB();

  // 1. Resource Availability Gate
  if (resource.status !== 'available' || !resource.is_active) {
    checks.push({
      id: 'resource_status',
      label: 'Resource Operational Status',
      status: 'fail',
      detail: `Asset is currently marked as "${resource.status}". Preventative maintenance or calibration in progress.`,
      fix_action: 'Monitor status or select an alternative available resource',
    });
  } else {
    checks.push({
      id: 'resource_status',
      label: 'Resource Operational Status',
      status: 'pass',
      detail: 'Asset is calibrated, inspected, and active for booking.',
    });
  }

  // 2. Good Standing & Account Sanctions
  if (!user.good_standing) {
    checks.push({
      id: 'good_standing',
      label: 'Account Standing & Safety Record',
      status: 'fail',
      detail: `Your account is flagged for review (${user.open_incidents} open incident / ${user.no_show_count} no-shows). Reservation privileges temporarily paused.`,
      fix_action: 'Contact facility manager Marcus Lee to resolve open safety inquiries',
    });
  } else {
    checks.push({
      id: 'good_standing',
      label: 'Account Standing & Safety Record',
      status: 'pass',
      detail: 'Clean disciplinary record. Account in good institutional standing.',
    });
  }

  // 3. No Overdue Sessions
  const userBookings = db.bookings.filter((b) => b.user_id === user.id);
  const overdueBooking = userBookings.find((b) => b.status === 'overdue');
  if (overdueBooking) {
    checks.push({
      id: 'no_overdue',
      label: 'Zero Overdue Equipment Holdings',
      status: 'fail',
      detail: `You currently have an active overdue session for booking ${overdueBooking.id}. Equipment must be checked out.`,
      fix_action: 'Complete Return Inspection immediately to clear hold',
    });
  } else {
    checks.push({
      id: 'no_overdue',
      label: 'Zero Overdue Equipment Holdings',
      status: 'pass',
      detail: 'No overdue equipment in your custody.',
    });
  }

  // 4. Minimum Trust Tier
  const requiredTier = resource.min_trust_tier ?? 0;
  if (user.trust_tier < requiredTier) {
    const tierLabels = ['0 (New User)', '1 (Verified)', '2 (Trusted)', '3 (Expert Lab Director)'];
    checks.push({
      id: 'trust_tier',
      label: 'Minimum Trust Tier Gate',
      status: 'fail',
      detail: `Requires Trust Tier ${tierLabels[requiredTier]} or higher. Your current tier is ${tierLabels[user.trust_tier]}.`,
      fix_action: 'Complete on-time returns and verified safety workshops to advance your Trust Tier',
    });
  } else {
    checks.push({
      id: 'trust_tier',
      label: 'Minimum Trust Tier Gate',
      status: 'pass',
      detail: `Your Trust Tier (${user.trust_tier}) meets or exceeds the required threshold (${requiredTier}).`,
    });
  }

  // 5. Mandatory Badge Qualification Check
  if (resource.required_badge_id) {
    const badge = db.badges.find((b) => b.id === resource.required_badge_id);
    const badgeName = badge?.name || resource.required_badge_id;

    // Check verified user badges
    const userBadge = db.user_badges.find(
      (ub) => ub.user_id === user.id && ub.badge_id === resource.required_badge_id
    );

    const now = new Date();
    const isVerifiedAndValid =
      userBadge && userBadge.verified && new Date(userBadge.expires_at) > now;

    if (isVerifiedAndValid) {
      checks.push({
        id: 'mandatory_badge',
        label: `Required Prerequisite: ${badgeName}`,
        status: 'pass',
        detail: `Verified badge active (valid until ${new Date(userBadge.expires_at).toLocaleDateString()}).`,
      });
    } else {
      // Check if user has uploaded a certificate pending manager verification
      const pendingCert = db.certificates.find(
        (c) => c.user_id === user.id && c.status === 'pending'
      );

      if (pendingCert) {
        checks.push({
          id: 'mandatory_badge',
          label: `Required Prerequisite: ${badgeName}`,
          status: 'pending',
          detail: `Certificate "${pendingCert.name}" submitted. Awaiting manager review and endorsement.`,
          fix_action: 'Manager verification pending in staff queue',
        });
      } else {
        checks.push({
          id: 'mandatory_badge',
          label: `Required Prerequisite: ${badgeName}`,
          status: 'fail',
          detail: `Mandatory institutional certification "${badgeName}" is missing or unverified.`,
          fix_action: 'Upload training certificate on your Profile page or take departmental workshop',
        });
      }
    }
  } else {
    checks.push({
      id: 'mandatory_badge',
      label: 'Specialized Safety Certification',
      status: 'pass',
      detail: 'No specialized prerequisite badge required for this equipment tier.',
    });
  }

  // 6. Weekly Hour Allocation
  const weeklyHours = user.weekly_booked_hours || 0;
  const maxBooking = resource.max_booking_hours || 4;
  const weeklyCap = 30; // standard university policy cap

  if (weeklyHours + maxBooking > weeklyCap) {
    checks.push({
      id: 'weekly_allocation',
      label: 'Fair-Share Weekly Allocation Cap',
      status: 'fail',
      detail: `You have consumed ${weeklyHours} hrs of your ${weeklyCap} hrs weekly fair-share allotment.`,
      fix_action: 'Fair-share credits refresh every Monday morning at 00:00',
    });
  } else {
    checks.push({
      id: 'weekly_allocation',
      label: 'Fair-Share Weekly Allocation Cap',
      status: 'pass',
      detail: `${weeklyCap - weeklyHours} hrs remaining in your personal fair-share allocation this week.`,
    });
  }

  // Determine overall verdict
  const anyFail = checks.some((c) => c.status === 'fail');
  const hasPending = checks.some((c) => c.status === 'pending');
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const score = Math.round((passCount / checks.length) * 100);

  return {
    isEligible: !anyFail && !hasPending,
    hasPending,
    score,
    checks,
  };
}
