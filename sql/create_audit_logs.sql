-- Table: audit_logs
-- Stores history of admin changes for IT Governance auditing.

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_email  TEXT NOT NULL DEFAULT 'system',
  action_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  table_name  TEXT NOT NULL,
  record_id   TEXT,
  old_values  JSONB,
  new_values  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast search and display
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Trigger function to capture DML modifications and log them
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  current_user_email TEXT := 'system';
  rec_id TEXT := NULL;
  old_val JSONB := NULL;
  new_val JSONB := NULL;
BEGIN
  -- Get user email from Request JWT Claims
  BEGIN
    current_user_email := COALESCE(
      current_setting('request.jwt.claims', true)::jsonb ->> 'email',
      'system'
    );
  EXCEPTION WHEN OTHERS THEN
    current_user_email := 'system';
  END;

  -- Fallback to auth.jwt() if it's set and has email
  IF current_user_email = 'system' THEN
    BEGIN
      current_user_email := COALESCE(auth.jwt() ->> 'email', 'system');
    EXCEPTION WHEN OTHERS THEN
      current_user_email := 'system';
    END;
  END IF;

  -- Extract modification details based on Operation
  IF (TG_OP = 'DELETE') THEN
    old_val := to_jsonb(OLD);
    BEGIN
      rec_id := OLD.id::text;
    EXCEPTION WHEN OTHERS THEN
      rec_id := NULL;
    END;
  ELSIF (TG_OP = 'UPDATE') THEN
    old_val := to_jsonb(OLD);
    new_val := to_jsonb(NEW);
    BEGIN
      rec_id := NEW.id::text;
    EXCEPTION WHEN OTHERS THEN
      rec_id := NULL;
    END;
  ELSIF (TG_OP = 'INSERT') THEN
    new_val := to_jsonb(NEW);
    BEGIN
      rec_id := NEW.id::text;
    EXCEPTION WHEN OTHERS THEN
      rec_id := NULL;
    END;
  END IF;

  -- Fallback record_id for tables with composite keys or without 'id' column
  IF rec_id IS NULL THEN
    IF TG_TABLE_NAME = 'advisor_rotations' THEN
      IF TG_OP = 'DELETE' THEN
        rec_id := OLD.advisor_name || '-' || OLD.year || '-' || OLD.month_number;
      ELSE
        rec_id := NEW.advisor_name || '-' || NEW.year || '-' || NEW.month_number;
      END IF;
    ELSIF TG_TABLE_NAME = 'advisor_targets' THEN
      IF TG_OP = 'DELETE' THEN
        rec_id := OLD.advisor_name || '-' || OLD.year || '-' || OLD.month_number;
      ELSE
        rec_id := NEW.advisor_name || '-' || NEW.year || '-' || NEW.month_number;
      END IF;
    ELSIF TG_TABLE_NAME = 'advisors' THEN
      IF TG_OP = 'DELETE' THEN
        rec_id := OLD.name;
      ELSE
        rec_id := NEW.name;
      END IF;
    ELSIF TG_TABLE_NAME = 'role_menu_access' THEN
      IF TG_OP = 'DELETE' THEN
        rec_id := OLD.role || '-' || OLD.menu_path;
      ELSE
        rec_id := NEW.role || '-' || NEW.menu_path;
      END IF;
    END IF;
  END IF;

  -- Prevent infinite recursion by not auditing audit_logs itself
  IF TG_TABLE_NAME = 'audit_logs' THEN
    RETURN NEW;
  END IF;

  -- Insert the audit log entry
  INSERT INTO audit_logs (user_email, action_type, table_name, record_id, old_values, new_values)
  VALUES (current_user_email, TG_OP, TG_TABLE_NAME, rec_id, old_val, new_val);

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind triggers to target tables
-- 1. dashboard_users
DROP TRIGGER IF EXISTS audit_trg_dashboard_users ON dashboard_users;
CREATE TRIGGER audit_trg_dashboard_users
AFTER INSERT OR UPDATE OR DELETE ON dashboard_users
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 2. role_menu_access
DROP TRIGGER IF EXISTS audit_trg_role_menu_access ON role_menu_access;
CREATE TRIGGER audit_trg_role_menu_access
AFTER INSERT OR UPDATE OR DELETE ON role_menu_access
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 3. advisors
DROP TRIGGER IF EXISTS audit_trg_advisors ON advisors;
CREATE TRIGGER audit_trg_advisors
AFTER INSERT OR UPDATE OR DELETE ON advisors
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 4. advisor_rotations
DROP TRIGGER IF EXISTS audit_trg_advisor_rotations ON advisor_rotations;
CREATE TRIGGER audit_trg_advisor_rotations
AFTER INSERT OR UPDATE OR DELETE ON advisor_rotations
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 5. advisor_targets
DROP TRIGGER IF EXISTS audit_trg_advisor_targets ON advisor_targets;
CREATE TRIGGER audit_trg_advisor_targets
AFTER INSERT OR UPDATE OR DELETE ON advisor_targets
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 6. footfall_store
DROP TRIGGER IF EXISTS audit_trg_footfall_store ON footfall_store;
CREATE TRIGGER audit_trg_footfall_store
AFTER INSERT OR UPDATE OR DELETE ON footfall_store
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 7. footfall_crm
DROP TRIGGER IF EXISTS audit_trg_footfall_crm ON footfall_crm;
CREATE TRIGGER audit_trg_footfall_crm
AFTER INSERT OR UPDATE OR DELETE ON footfall_crm
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 8. clean_master
DROP TRIGGER IF EXISTS audit_trg_clean_master ON clean_master;
CREATE TRIGGER audit_trg_clean_master
AFTER UPDATE OR DELETE ON clean_master
FOR EACH ROW EXECUTE FUNCTION process_audit_log();
