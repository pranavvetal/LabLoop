// ============================================================
// LabLoop Enterprise — TypeScript Domain Models
// ============================================================

export type UserRole = 'student' | 'faculty' | 'researcher' | 'owner' | 'manager' | 'admin';
export type ResourceType = 'equipment' | 'lab_space' | 'device';
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted' | 'checked_in' | 'returned' | 'cancelled' | 'overdue';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'under_review' | 'resolved';
export type ConditionType = 'check_in' | 'return';
export type PurposeType = 'course_project' | 'startup_prototype' | 'casual_use';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  has_safety_training: boolean;
  verification_docs: Record<string, unknown>;
  fair_share_score: number;
  credits: number;
  no_show_count: number;
  weekly_booked_hours: number;
  created_at: string;
}

export interface Resource {
  id: string;
  owner_id: string;
  name: string;
  category: ResourceType;
  description: string;
  location: string;
  hourly_rate: number;
  deposit_amount: number;
  max_per_day: number;
  rules: string;
  baseline_photo_url: string;
  is_active: boolean;
  created_at: string;
  owner?: User;
}

export interface AvailabilitySlot {
  id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export interface Booking {
  id: string;
  resource_id: string;
  user_id: string;
  slot_id: string;
  purpose: string;
  status: BookingStatus;
  explanation_code: string;
  priority_score: number;
  rejection_reason: string;
  stripe_payment_intent_id: string;
  created_at: string;
  updated_at: string;
  resource?: Resource;
  user?: User;
  condition_reports?: ConditionReport[];
  incident?: Incident;
}

export interface WaitlistEntry {
  id: string;
  resource_id: string;
  slot_id: string;
  user_id: string;
  position: number;
  explanation: string;
  created_at: string;
  user?: User;
}

export interface ConditionReport {
  id: string;
  booking_id: string;
  type: ConditionType;
  photo_url: string;
  checklist: Record<string, boolean>;
  notes: string;
  recorded_at: string;
}

export interface Incident {
  id: string;
  booking_id: string;
  reporter_id: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  ai_summary: string;
  damage_photo_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  entity: string;
  entity_id: string;
  action: string;
  performed_by: string | null;
  reason: string;
  payload: Record<string, unknown>;
  timestamp: string;
  actor?: User;
}

export interface BookingRequest {
  resource_id: string;
  slot_id: string;
  purpose: string;
  purpose_type: PurposeType;
}

export interface ExplainableDecision {
  status: BookingStatus;
  position?: number;
  explanation_code: string;
  message: string;
  priority_score?: number;
}