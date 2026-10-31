// ============================================================
// LabLoop Enterprise — Role-Based Permission Control System
// ============================================================

import { User, Resource, Booking, AuditLog } from './types';

export type Action =
  | 'view_resource'
  | 'book_resource'
  | 'manage_resource'
  | 'approve_booking'
  | 'view_own_audit'
  | 'view_all_audit'
  | 'view_resource_audit'
  | 'manage_users'
  | 'confirm_penalty'
  | 'verify_certificate'
  | 'manage_incidents'
  | 'reset_demo'
  | 'check_in'
  | 'return_resource'
  | 'tamper_audit';

/**
 * Centrally check whether a given user has authority to perform an action.
 * Enforced inside mutation functions, not only on UI buttons.
 */
export function can(
  user: User | null | undefined,
  action: Action,
  subject?: Resource | Booking | AuditLog | Record<string, unknown> | null
): boolean {
  if (!user) return false;

  // 1. System Admin: full oversight
  if (user.role === 'admin') {
    return true;
  }

  // 2. Lab Manager / Supervisor
  if (user.role === 'manager') {
    switch (action) {
      case 'approve_booking':
      case 'manage_resource':
        // Managers can oversee resources assigned to them or unassigned campus gear
        if (subject && 'manager_id' in subject && (subject as Resource).manager_id) {
          return (subject as Resource).manager_id === user.id;
        }
        return true;
      case 'manage_incidents':
      case 'confirm_penalty':
      case 'verify_certificate':
      case 'view_resource_audit':
      case 'view_all_audit':
      case 'view_own_audit':
      case 'view_resource':
      case 'book_resource':
      case 'check_in':
      case 'return_resource':
        return true;
      case 'reset_demo':
      case 'manage_users':
      case 'tamper_audit':
        return false;
      default:
        return false;
    }
  }

  // 3. Equipment Owner
  if (user.role === 'owner') {
    switch (action) {
      case 'manage_resource':
        return !subject || !('owner_id' in subject) || (subject as Resource).owner_id === user.id;
      case 'approve_booking':
        if (!subject) return true;
        if ('resource' in subject && (subject as Booking).resource) {
          return (subject as Booking).resource?.owner_id === user.id;
        }
        return true;
      case 'view_resource_audit':
        return true;
      case 'manage_incidents':
        return true;
      case 'view_own_audit':
      case 'view_resource':
      case 'book_resource':
      case 'check_in':
      case 'return_resource':
        return true;
      default:
        return false;
    }
  }

  // 4. Students, Faculty & Researchers
  if (user.role === 'student' || user.role === 'researcher' || user.role === 'faculty') {
    switch (action) {
      case 'view_resource':
        return true;
      case 'book_resource':
        // Must be in good standing (no unaddressed penalties/suspensions)
        return user.good_standing;
      case 'check_in':
      case 'return_resource':
        if (!subject) return true;
        if ('user_id' in subject) {
          return (subject as Booking).user_id === user.id;
        }
        return true;
      case 'view_own_audit':
        return true;
      case 'view_all_audit':
      case 'view_resource_audit':
      case 'manage_resource':
      case 'approve_booking':
      case 'confirm_penalty':
      case 'verify_certificate':
      case 'manage_incidents':
      case 'manage_users':
      case 'reset_demo':
      case 'tamper_audit':
        return false;
      default:
        return false;
    }
  }

  return false;
}
