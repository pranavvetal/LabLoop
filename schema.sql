-- ============================================================
-- LabLoop Enterprise — Database Schema
-- Target: PostgreSQL (Supabase or local Postgres)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE user_role AS ENUM ('student', 'faculty', 'researcher', 'owner', 'manager', 'admin');
CREATE TYPE resource_category AS ENUM ('equipment', 'lab_space', 'device');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'waitlisted', 'checked_in', 'returned', 'cancelled', 'overdue');
CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE incident_status AS ENUM ('open', 'under_review', 'resolved');
CREATE TYPE condition_type AS ENUM ('check_in', 'return');

-- 1. USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    has_safety_training BOOLEAN DEFAULT FALSE,
    verification_docs JSONB DEFAULT '{}',
    fair_share_score INT NOT NULL DEFAULT 100,
    credits INT NOT NULL DEFAULT 10,
    no_show_count INT NOT NULL DEFAULT 0,
    weekly_booked_hours NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. RESOURCES
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category resource_category NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    hourly_rate NUMERIC(6,2) DEFAULT 0.00,
    deposit_amount NUMERIC(6,2) DEFAULT 0.00,
    max_per_day INT DEFAULT 2,
    rules TEXT,
    baseline_photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. AVAILABILITY SLOTS
CREATE TABLE availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    CONSTRAINT valid_slot_time CHECK (end_time > start_time)
);

-- 4. BOOKINGS
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id),
    user_id UUID NOT NULL REFERENCES users(id),
    slot_id UUID NOT NULL REFERENCES availability_slots(id),
    purpose TEXT NOT NULL,
    status booking_status NOT NULL DEFAULT 'pending',
    explanation_code TEXT,
    priority_score INT DEFAULT 50,
    rejection_reason TEXT,
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. WAITLIST
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id),
    slot_id UUID NOT NULL REFERENCES availability_slots(id),
    user_id UUID NOT NULL REFERENCES users(id),
    position INT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CONDITION REPORTS
CREATE TABLE condition_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    type condition_type NOT NULL,
    photo_url TEXT,
    checklist JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INCIDENTS
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    reporter_id UUID NOT NULL REFERENCES users(id),
    severity incident_severity NOT NULL DEFAULT 'medium',
    status incident_status NOT NULL DEFAULT 'open',
    description TEXT NOT NULL,
    ai_summary TEXT,
    damage_photo_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. AUDIT LOG (Append-Only)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    entity TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES users(id),
    reason TEXT,
    payload JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_bookings_resource ON bookings(resource_id, start_time, end_time);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_waitlist_resource ON waitlist(resource_id, position);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_condition_reports_booking ON condition_reports(booking_id);
CREATE INDEX idx_incidents_booking ON incidents(booking_id);