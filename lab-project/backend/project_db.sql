-- =========================================
-- RESET & BASE
-- =========================================
DROP DATABASE IF EXISTS project;
CREATE DATABASE project CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE project;

-- =========================================
-- ORGANIZATIONS
-- =========================================
CREATE TABLE organizations (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password      VARCHAR(255) NOT NULL,
  address       VARCHAR(500) NOT NULL,
  description   TEXT NOT NULL,
  access_type   ENUM('Public','Private') NOT NULL DEFAULT 'Public',
  logo          VARCHAR(255) NULL,
  status        ENUM('active','pending','archived') NOT NULL DEFAULT 'active',
  createdAt     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_org_name (name),
  UNIQUE KEY uniq_org_slug (slug),
  KEY idx_org_status (status),
  KEY idx_org_name (name)
) ENGINE=InnoDB;

-- =========================================
-- USERS
-- =========================================
CREATE TABLE users (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  password     VARCHAR(255) NOT NULL,
  address      VARCHAR(500) NULL,
  description  TEXT NULL,
  createdAt    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_email (email),
  KEY idx_user_name (name)
) ENGINE=InnoDB;

-- =========================================
-- MEMBERSHIP
-- =========================================
CREATE TABLE user_organizations (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  org_id     BIGINT UNSIGNED NOT NULL,
  role_code  ENUM('owner','admin','moderator','member','org_staff','org_admin')
             NOT NULL DEFAULT 'member',
  createdAt  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_org (user_id, org_id),
  KEY idx_org (org_id),
  KEY idx_user_role (user_id, role_code),
  CONSTRAINT fk_uo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_uo_org  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================
-- DEPARTMENTS
-- =========================================
CREATE TABLE departments (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  org_id       BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) NOT NULL,
  status       ENUM('active','archived') NOT NULL DEFAULT 'active',
  createdAt    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_org_slug (org_id, slug),
  KEY idx_org (org_id),
  CONSTRAINT fk_dept_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================
-- COMPLAINTS (ALLEGATIONS)
-- =========================================
CREATE TABLE complaints (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  org_id          BIGINT UNSIGNED NOT NULL,
  department_id   BIGINT UNSIGNED NULL,
  user_id         BIGINT UNSIGNED NULL,          -- NULL => anonymous
  title           VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  priority        ENUM('Low','Medium','High') NOT NULL DEFAULT 'Low',
  is_anonymous    TINYINT(1) NOT NULL DEFAULT 0,
  attachment_path VARCHAR(255) NULL,
  status          ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
  trackingCode    VARCHAR(32) NULL,
  resolution_note TEXT NULL,
  createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolvedAt      DATETIME NULL,
  KEY idx_org_status_created (org_id, status, createdAt),
  KEY idx_user_id (user_id),
  KEY idx_status (status),
  KEY idx_tracking (trackingCode),
  CONSTRAINT fk_alleg_org  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_alleg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_alleg_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB;



ALTER TABLE complaints 
  MODIFY status ENUM('Open','In Progress','Resolved','Rejected','Withdrawn')
  NOT NULL DEFAULT 'Open';

ALTER TABLE complaints ADD COLUMN withdrawnAt DATETIME NULL AFTER resolvedAt;

-- altercation here for consistent approach
ALTER TABLE complaints 
MODIFY COLUMN status ENUM(
  'Open',
  'Pending',
  'In Progress',
  'Resolved',
  'Rejected',
  'Closed',        -- Add this
  'Withdrawn'
  -- Remove 'Deleted' if not used
) NOT NULL DEFAULT 'Open';
-- =========================================
-- NOTIFICATIONS
-- =========================================
CREATE TABLE notifications (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NULL,
  org_id         BIGINT UNSIGNED NULL,
  complaints_id  BIGINT UNSIGNED NULL,
  -- type           ENUM('allegation_created','status_changed','message') NOT NULL,
  type ENUM('status_changed','new_complaint','complaint_deleted','complaint_withdrawn','complaint_restored')  NOT NULL,
  message        VARCHAR(500) NOT NULL,
  read_at        DATETIME NULL,
  createdAt      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user          (user_id, createdAt),
  KEY idx_org           (org_id,  createdAt),
  KEY idx_alleg         (complaints_id),
  CONSTRAINT fk_ntf_user  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ntf_org   FOREIGN KEY (org_id)  REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_ntf_alleg FOREIGN KEY (complaints_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 1. Expand notifications.type ENUM
ALTER TABLE notifications 
MODIFY COLUMN type ENUM(
  'status_changed',
  'new_complaint',
  'complaint_deleted',
  'complaint_withdrawn',
  'complaint_restored'
) NOT NULL;


-- altered agains
ALTER TABLE notifications 
MODIFY COLUMN type ENUM(
  'status_changed',
  'new_complaint',
  'complaint_deleted',
  'complaint_withdrawn',
  'complaint_restored',
  'member_banned'  -- If you add ban notifications
) NOT NULL;
-- =========================================
-- Vote
-- =========================================

-- New table
CREATE TABLE IF NOT EXISTS complaint_votes (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id  BIGINT UNSIGNED NOT NULL,
  voter_key     VARCHAR(64) NOT NULL,  -- "u:<userId>" for logged-in, "a:<cookieId>" for anonymous
  createdAt     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_vote (complaint_id, voter_key),
  KEY idx_vote_complaint (complaint_id)
) ENGINE=InnoDB;



-- =========================================
-- Trigger: stamp resolvedAt when status flips to Resolved
-- =========================================
DELIMITER //
CREATE TRIGGER trg_allegations_resolvedAt
BEFORE UPDATE ON complaints
FOR EACH ROW
BEGIN
  IF NEW.status = 'Resolved' AND (OLD.status <> 'Resolved' OR OLD.status IS NULL) THEN
    SET NEW.resolvedAt = IFNULL(NEW.resolvedAt, NOW());
  END IF;
END//
DELIMITER ;

-- (Optional) Seed example departments for all orgs lacking any
INSERT IGNORE INTO departments (org_id, name, slug)
SELECT id, CONCAT(name, ' General'), CONCAT(slug, '-general')
FROM organizations
WHERE id NOT IN (SELECT DISTINCT org_id FROM departments);



SHOW TABLES;



-- 2. Fix complaints.status ENUM (use consistent values)
ALTER TABLE complaints 
MODIFY COLUMN status ENUM(
  'Open',
  'Pending',
  'In Progress',
  'Resolved',
  'Rejected',
  'Withdrawn',
  'Deleted'
) NOT NULL DEFAULT 'Open';

-- ban users that are irrelevant or cause issues, naughty users
 
CREATE TABLE banned_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  banned_by_org BIGINT UNSIGNED NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_org (user_id, banned_by_org),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (banned_by_org) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Add votes column to complaints table
ALTER TABLE complaints ADD COLUMN votes INT DEFAULT 0;


-- new stuff here 

-- complaints table needs:
ALTER TABLE complaints ADD INDEX idx_votes (votes DESC);
ALTER TABLE complaints ADD INDEX idx_withdrawn (withdrawnAt);

-- complaint_votes needs:
ALTER TABLE complaint_votes ADD INDEX idx_voter_key (voter_key);
-- Add this to your schema
ALTER TABLE complaints ADD COLUMN editedAt DATETIME NULL AFTER updatedAt;

-- =========================================
-- COMPLAINT EDIT HISTORY (Optional but Recommended)
-- =========================================
CREATE TABLE complaint_edits (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id   BIGINT UNSIGNED NOT NULL,
  old_title      VARCHAR(255) NULL,
  old_description TEXT NULL,
  new_title      VARCHAR(255) NULL,
  new_description TEXT NULL,
  edited_by      BIGINT UNSIGNED NOT NULL,
  edited_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  KEY idx_complaint (complaint_id, edited_at DESC),
  KEY idx_edited_by (edited_by),
  
  CONSTRAINT fk_edit_complaint FOREIGN KEY (complaint_id) 
    REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_edit_user FOREIGN KEY (edited_by) 
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- vote check
ALTER TABLE complaints 
ADD CONSTRAINT chk_votes_positive CHECK (votes >= 0);

-- banned user
ALTER TABLE banned_users 
ADD COLUMN reason VARCHAR(500) NULL,
ADD COLUMN expires_at DATETIME NULL,  -- NULL = permanent
ADD COLUMN banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- For notification queries
ALTER TABLE notifications 
ADD INDEX idx_user_unread (user_id, read_at, createdAt DESC);

-- For anonymous vote cleanup (optional)
ALTER TABLE complaint_votes 
ADD INDEX idx_voter_created (voter_key, createdAt);

-- Add a trigger to keep vote in sync
DELIMITER //
CREATE TRIGGER trg_update_vote_count
AFTER INSERT ON complaint_votes
FOR EACH ROW
BEGIN
  UPDATE complaints 
  SET votes = (SELECT COUNT(*) FROM complaint_votes WHERE complaint_id = NEW.complaint_id)
  WHERE id = NEW.complaint_id;
END//

CREATE TRIGGER trg_update_vote_count_delete
AFTER DELETE ON complaint_votes
FOR EACH ROW
BEGIN
  UPDATE complaints 
  SET votes = (SELECT COUNT(*) FROM complaint_votes WHERE complaint_id = OLD.complaint_id)
  WHERE id = OLD.complaint_id;
END//
DELIMITER ;