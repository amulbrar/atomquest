-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Enums ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE role AS ENUM ('employee', 'manager', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sheet_status AS ENUM ('draft', 'submitted', 'approved', 'locked', 'reopened');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE uom_type AS ENUM ('numeric', 'percent', 'timeline', 'zero');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE uom_direction AS ENUM ('min', 'max', 'na');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE quarter AS ENUM ('q1', 'q2', 'q3', 'q4');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE checkin_status AS ENUM ('not_started', 'on_track', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE escalation_trigger AS ENUM ('no_submit', 'no_approve', 'no_checkin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE escalation_event_status AS ENUM ('open', 'resolved');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Core tables ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  role role NOT NULL DEFAULT 'employee',
  manager_id TEXT REFERENCES users(id),
  department_id TEXT REFERENCES departments(id),
  entra_oid TEXT,
  teams_webhook_url TEXT,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  teams_notifications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);

CREATE TABLE IF NOT EXISTS thrust_areas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS cycles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fy_label TEXT NOT NULL,
  phase1_open DATE NOT NULL,
  phase1_close DATE NOT NULL,
  q1_open DATE NOT NULL,
  q1_close DATE NOT NULL,
  q2_open DATE NOT NULL,
  q2_close DATE NOT NULL,
  q3_open DATE NOT NULL,
  q3_close DATE NOT NULL,
  q4_open DATE NOT NULL,
  q4_close DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS goal_sheets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id TEXT NOT NULL REFERENCES users(id),
  cycle_id TEXT NOT NULL REFERENCES cycles(id),
  status sheet_status NOT NULL DEFAULT 'draft',
  return_comment TEXT,
  submitted_at TIMESTAMPTZ,
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS goal_sheets_emp_cycle_idx
  ON goal_sheets(employee_id, cycle_id);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sheet_id TEXT NOT NULL REFERENCES goal_sheets(id) ON DELETE CASCADE,
  thrust_area_id TEXT NOT NULL REFERENCES thrust_areas(id),
  title TEXT NOT NULL,
  description TEXT,
  uom_type uom_type NOT NULL,
  uom_direction uom_direction NOT NULL DEFAULT 'min',
  target_value NUMERIC(15,4),
  target_date DATE,
  weightage INTEGER NOT NULL CHECK (weightage BETWEEN 10 AND 100),
  source_goal_id TEXT,
  locked_fields TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS goals_sheet_idx ON goals(sheet_id);

CREATE TABLE IF NOT EXISTS quarter_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  quarter quarter NOT NULL,
  actual_value NUMERIC(15,4),
  actual_date DATE,
  status checkin_status NOT NULL DEFAULT 'not_started',
  computed_score NUMERIC(8,4),
  employee_note TEXT,
  manager_comment TEXT,
  manager_checkin_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS quarter_updates_goal_quarter_idx
  ON quarter_updates(goal_id, quarter);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id),
  before TEXT,
  after TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS escalation_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  trigger escalation_trigger NOT NULL,
  threshold_days INTEGER NOT NULL,
  chain TEXT NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalation_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  rule_id TEXT NOT NULL REFERENCES escalation_rules(id),
  subject_user_id TEXT NOT NULL REFERENCES users(id),
  target_user_id TEXT NOT NULL REFERENCES users(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  status escalation_event_status NOT NULL DEFAULT 'open'
);

CREATE INDEX IF NOT EXISTS esc_events_subject_idx ON escalation_events(subject_user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  email_sent_at TIMESTAMPTZ,
  teams_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);

-- ── Constraints (application-enforced triggers) ────────────────────────────

-- Prevent more than 8 goals per sheet
CREATE OR REPLACE FUNCTION check_max_goals()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM goals WHERE sheet_id = NEW.sheet_id) >= 8 THEN
    RAISE EXCEPTION 'Maximum 8 goals allowed per goal sheet';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_max_goals ON goals;
CREATE TRIGGER trg_max_goals
  BEFORE INSERT ON goals
  FOR EACH ROW EXECUTE FUNCTION check_max_goals();

-- Audit trigger for goal_sheets status changes
CREATE OR REPLACE FUNCTION audit_sheet_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log(entity_type, entity_id, action, before, after)
    VALUES (
      'goal_sheet',
      NEW.id,
      'status_change',
      json_build_object('status', OLD.status)::text,
      json_build_object('status', NEW.status)::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_sheets ON goal_sheets;
CREATE TRIGGER trg_audit_sheets
  AFTER UPDATE ON goal_sheets
  FOR EACH ROW EXECUTE FUNCTION audit_sheet_changes();

-- Audit trigger for goals changes (when sheet is locked/approved)
CREATE OR REPLACE FUNCTION audit_goal_changes()
RETURNS TRIGGER AS $$
DECLARE
  sheet_status_val sheet_status;
BEGIN
  SELECT status INTO sheet_status_val
  FROM goal_sheets WHERE id = NEW.sheet_id;

  IF sheet_status_val IN ('locked', 'approved', 'reopened') THEN
    INSERT INTO audit_log(entity_type, entity_id, action, before, after)
    VALUES (
      'goal',
      NEW.id,
      'update',
      row_to_json(OLD)::text,
      row_to_json(NEW)::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_goals ON goals;
CREATE TRIGGER trg_audit_goals
  AFTER UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION audit_goal_changes();

-- Updated_at auto-update for goal_sheets and goals
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_updated_at_sheets ON goal_sheets;
CREATE TRIGGER trg_updated_at_sheets
  BEFORE UPDATE ON goal_sheets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_goals ON goals;
CREATE TRIGGER trg_updated_at_goals
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_qu ON quarter_updates;
CREATE TRIGGER trg_updated_at_qu
  BEFORE UPDATE ON quarter_updates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
