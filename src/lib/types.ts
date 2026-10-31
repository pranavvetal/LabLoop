// ============================================================
// LabLoop Enterprise — Canonical Unified Domain Models
// ============================================================

export type UserRole = 'student' | 'faculty' | 'researcher' | 'owner' | 'manager' | 'admin';
export type ResourceCategory = 'equipment' | 'lab_space' | 'device' | 'instrument';
export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'checked_in'
  | 'returned'
  | 'cancelled'
  | 'overdue'
  | 'no_show';
export type IncidentType = 'damage' | 'delay' | 'safety' | 'no_show' | 'misuse' | 'scheduling_conflict';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'under_review' | 'resolved';
export type PurposeType = 'course_project' | 'research' | 'startup_prototype' | 'casual_use';
export type TrustTier = 0 | 1 | 2 | 3;

export interface Badge {
  id: string;
  name: string;
  description: string;
  issued_by: string;
  valid_days: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  issued_at: string;
  expires_at: string;
  verified: boolean;
  verified_by?: string;
  certificate_url?: string;
}

export interface Group {
  id: string;
  name: string;
  member_ids: string[];
  created_by: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  name: string; // alias for display convenience
  role: UserRole;
  avatar_url?: string;
  avatar?: string; // alias
  hasSafetyTraining?: boolean; // alias
  trust_tier: TrustTier;
  fair_share_score: number;
  credits: number;
  no_show_count: number;
  weekly_booked_hours: number;
  on_time_returns: number;
  clean_condition_reports: number;
  open_incidents: number;
  good_standing: boolean;
  created_at: string;
}

export interface Resource {
  id: string;
  owner_id: string;
  manager_id?: string;
  name: string;
  category: ResourceCategory;
  description: string;
  location: string;
  image_url?: string;
  image?: string; // alias
  baselinePhotoUrl?: string; // alias
  type?: string; // alias
  requiredQualification?: string; // alias
  hourlyRate?: number; // alias
  specs?: Record<string, string>;
  hourly_rate: number;
  deposit_amount: number;
  max_per_day: number;
  max_booking_hours: number;
  operating_hours?: { start: string; end: string };
  required_badge_id?: string | null;
  requires_supervisor: boolean;
  min_trust_tier: TrustTier;
  rules: string;
  usage_checklist?: string[];
  weekly_availability?: Record<string, { open: boolean; start: string; end: string }>;
  blackout_dates?: string[];
  status: 'available' | 'maintenance' | 'retired';
  is_active: boolean;
  created_at: string;
  owner?: User;
}

export interface Booking {
  id: string;
  resource_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  due_at?: string;
  purpose: string;
  purpose_type: PurposeType;
  status: BookingStatus;
  priority_score: number;
  score_breakdown?: Record<string, number>;
  explanation_code: string;
  message: string;
  decision_by?: string;
  decision_reason?: string;
  decision_at?: string;
  checked_in_at?: string;
  returned_at?: string;
  extension_requested?: boolean;
  extension_until?: string;
  credit_hold?: number;
  created_at: string;
  updated_at: string;
  resource?: Resource;
  user?: User;
}

export interface WaitlistEntry {
  id: string;
  resource_id: string;
  user_id: string;
  position: number;
  priority_score: number;
  explanation: string;
  created_at: string;
  user?: User;
}

export interface ConditionReport {
  id: string;
  booking_id: string;
  type: 'check_in' | 'return';
  checklist_items: { label: string; ok: boolean }[];
  photos?: string[];
  notes?: string;
  submitted_by: string;
  recorded_at: string;
}

export interface Incident {
  id: string;
  booking_id: string;
  reporter_id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  reporter_statement?: string;
  owner_statement?: string;
  photos?: string[];
  ai_summary?: string;
  resolution?: string;
  penalty_proposal?: string;
  penalty_confirmed?: boolean;
  appeal_filed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  performed_by: string | null;
  reason?: string;
  payload: Record<string, unknown>;
  timestamp: string;
  prev_hash: string;
  hash: string;
}

export interface Certificate {
  id: string;
  user_id: string;
  name: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  review_reason?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface ExplainableDecision {
  status: BookingStatus;
  position?: number;
  explanation_code: string;
  message: string;
  priority_score?: number;
  score_breakdown?: Record<string, number>;
}
