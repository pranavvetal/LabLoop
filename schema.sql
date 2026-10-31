-- ============================================================
-- LabLoop Enterprise — Canonical Database Schema (PostgreSQL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE user_role AS ENUM ('student', 'faculty', 'researcher', 'owner', 'manager', 'admin');
CREATE TYPE resource_category AS ENUM ('equipment', 'lab_space', 'device', 'instrument');
CREATE TYPE booking_status AS ENUM (
    'pending', 'approved', 'rejected', 'waitlisted', 'checked_in', 'returned', 'cancelled', 'overdue', 'no_show'
);
CREATE TYPE incident_type AS ENUM ('damage', 'delay', 'safety', 'no_show', 'misuse', 'scheduling_conflict');
CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE incident_status AS ENUM ('open', 'under_review', 'resolved');
CREATE TYPE condition_type AS ENUM ('check_in', 'return');
CREATE TYPE purpose_type AS ENUM ('course_project', 'research', 'startup_prototype', 'casual_use');

-- 1. BADGES
CREATE TABLE badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    issued_by TEXT NOT NULL,
    valid_days INT NOT NULL DEFAULT 365,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USERS
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    trust_tier INT NOT NULL DEFAULT 0 CHECK (trust_tier BETWEEN 0 AND 3),
    fair_share_score INT NOT NULL DEFAULT 100,
    credits INT NOT NULL DEFAULT 50,
    no_show_count INT NOT NULL DEFAULT 0,
    weekly_booked_hours NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    on_time_returns INT NOT NULL DEFAULT 0,
    clean_condition_reports INT NOT NULL DEFAULT 0,
    open_incidents INT NOT NULL DEFAULT 0,
    good_standing BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. USER BADGES
CREATE TABLE user_badges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by TEXT REFERENCES users(id),
    certificate_url TEXT
);

-- 4. GROUPS
CREATE TABLE groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    member_ids TEXT[] NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL REFERENCES users(id)
);

-- 5. RESOURCES
CREATE TABLE resources (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    manager_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    category resource_category NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    image_url TEXT,
    specs JSONB DEFAULT '{}',
    hourly_rate NUMERIC(6,2) DEFAULT 0.00,
    deposit_amount NUMERIC(6,2) DEFAULT 0.00,
    max_per_day INT DEFAULT 2,
    max_booking_hours INT DEFAULT 4,
    operating_hours JSONB DEFAULT '{"start": "08:00", "end": "20:00"}',
    required_badge_id TEXT REFERENCES badges(id),
    requires_supervisor BOOLEAN DEFAULT FALSE,
    min_trust_tier INT DEFAULT 0 CHECK (min_trust_tier BETWEEN 0 AND 3),
    rules TEXT NOT NULL,
    usage_checklist TEXT[] DEFAULT '{}',
    weekly_availability JSONB,
    blackout_dates TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'available',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. BOOKINGS
CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    due_at TIMESTAMPTZ,
    purpose TEXT NOT NULL,
    purpose_type purpose_type NOT NULL DEFAULT 'course_project',
    status booking_status NOT NULL DEFAULT 'pending',
    priority_score INT DEFAULT 50,
    score_breakdown JSONB DEFAULT '{}',
    explanation_code TEXT NOT NULL,
    message TEXT NOT NULL,
    decision_by TEXT REFERENCES users(id),
    decision_reason TEXT,
    decision_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    extension_requested BOOLEAN DEFAULT FALSE,
    extension_until TIMESTAMPTZ,
    credit_hold NUMERIC(6,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_booking_interval CHECK (end_time > start_time)
);

-- 7. WAITLIST
CREATE TABLE waitlist (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position INT NOT NULL,
    priority_score INT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CONDITION REPORTS
CREATE TABLE condition_reports (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    type condition_type NOT NULL,
    checklist_items JSONB NOT NULL DEFAULT '[]',
    photos TEXT[] DEFAULT '{}',
    notes TEXT,
    submitted_by TEXT NOT NULL REFERENCES users(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. INCIDENTS
CREATE TABLE incidents (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reporter_id TEXT NOT NULL REFERENCES users(id),
    type incident_type NOT NULL,
    severity incident_severity NOT NULL DEFAULT 'medium',
    status incident_status NOT NULL DEFAULT 'open',
    description TEXT NOT NULL,
    reporter_statement TEXT,
    owner_statement TEXT,
    photos TEXT[] DEFAULT '{}',
    ai_summary TEXT,
    resolution TEXT,
    penalty_proposal TEXT,
    penalty_confirmed BOOLEAN DEFAULT FALSE,
    appeal_filed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. NOTIFICATIONS
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AUDIT LOG (SHA-256 Hash Chained, Append-Only)
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    performed_by TEXT REFERENCES users(id),
    reason TEXT,
    payload JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    prev_hash TEXT NOT NULL,
    hash TEXT NOT NULL
);

-- 12. CERTIFICATES
CREATE TABLE certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by TEXT REFERENCES users(id),
    review_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- INDEXES
CREATE INDEX idx_bookings_resource_window ON bookings(resource_id, start_time, end_time);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_waitlist_resource_pos ON waitlist(resource_id, position);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_condition_reports_booking ON condition_reports(booking_id);
CREATE INDEX idx_incidents_booking ON incidents(booking_id);
