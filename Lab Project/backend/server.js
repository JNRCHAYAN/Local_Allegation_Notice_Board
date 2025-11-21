// server.js
// ================================
// Public Allegation Portal backend
// ================================

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import crypto from "crypto";  // ✅ CORRECT

// --- Setup for ESM paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Config ---
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-this";
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const WITHDRAW_RETENTION_DAYS = Number(process.env.WITHDRAW_RETENTION_DAYS || 30);
const ANON_COOKIE = 'anon_vote_id';  // ✅ DECLARE ONLY ONCE HERE

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// --- Middleware ---

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(UPLOAD_DIR));

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
// // Middleware

// app.use(express.json());

// app.use('/uploads', express.static('uploads'));

// --- MySQL pool ---
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",  //<------------------change here
  database: process.env.DB_NAME || "project",
  waitForConnections: true,
  connectionLimit: 10,
  
  // port: process.env.DB_PORT || 3307;  //<-------------this line is needed in kheya's server, not zahra's
});

// --- Uploads (multer) ---
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) =>
    cb(
      null,
      Date.now() +
        "-" +
        Math.random().toString(36).slice(2, 8) +
        path.extname(file.originalname)
    ),
});
const upload = multer({ storage });

// --- Helpers ---
const slugify = (s) =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const getBearer = (req) => {
  const hdr = req.headers.authorization || "";
  return hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
};

const auth = (req, res, next) => {
  const token = getBearer(req);
  if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};

const softAuth = (req, _res, next) => {
  const token = getBearer(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {}
  }
  next();
};

async function findOrgBySlug(slug) {
  const [rows] = await db.query(
    `SELECT id, name, slug, email, address, description, access_type, logo, status, createdAt
     FROM organizations
     WHERE slug=? AND status='active'`,
    [slug]
  );
  return rows[0] || null;
}

// =======================
//         AUTH
// =======================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Missing credentials" });
    }

    const [uRows] = await db.query(
      "SELECT id, name, email, password FROM users WHERE email=?",
      [email]
    );
    if (uRows.length) {
      const user = uRows[0];
      const ok = await bcrypt.compare(password, user.password || "").catch(() => false);
      if (ok) {
        const token = jwt.sign(
          { id: user.id, email: user.email, role: "user" },
          JWT_SECRET,
          { expiresIn: "180d" }
        );
        return res.json({
          success: true,
          token,
          userType: "user",
          userId: user.id,
          redirect: "/user/dashboard",
        });
      }
    }

    const [oRows] = await db.query(
      "SELECT id, name, slug, email, password FROM organizations WHERE email=?",
      [email]
    );
    if (oRows.length) {
      const org = oRows[0];
      const okHash = await bcrypt.compare(password, org.password || "").catch(() => false);
      const okPlain = !okHash && password && org.password && password === org.password;
      if (okHash || okPlain) {
        const token = jwt.sign(
          { id: org.id, email: org.email, role: "organization" },
          JWT_SECRET,
          { expiresIn: "7d" }
        );
        return res.json({
          success: true,
          token,
          userType: "organization",
          orgId: org.id,
          slug: org.slug,
          redirect: `/organization/${org.slug}`,
        });
      }
    }

    return res.status(401).json({ success: false, error: "Invalid credentials" });
  } catch (e) {
    console.error("[login error]", e);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    if (req.user.role === "user") {
      const [rows] = await db.query(
        "SELECT id, name, email, address, description, createdAt FROM users WHERE id=?",
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ success: false, error: "User not found" });

      const [orgRows] = await db.query(
        `SELECT o.id, o.name, o.slug
           FROM user_organizations uo
           JOIN organizations o ON o.id = uo.org_id
          WHERE uo.user_id=?
          ORDER BY uo.createdAt ASC
          LIMIT 1`,
        [req.user.id]
      );

      const organization = orgRows.length ? orgRows[0] : null;
      return res.json({
        success: true,
        type: "user",
        profile: rows[0],
        organization,
        organizationSlug: organization?.slug || null,
        organizationId: organization?.id || null,
        avatar: null
      });
    }

    if (req.user.role === "organization") {
      const [rows] = await db.query(
        "SELECT id, name, slug, email, address, description, access_type, logo, createdAt FROM organizations WHERE id=?",
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ success: false, error: "Organization not found" });
      const org = rows[0];
      org.logo = org.logo ? `http://localhost:${PORT}${org.logo}` : null;
      return res.json({ success: true, type: "organization", profile: org });
    }

    return res.status(400).json({ success: false, error: "Unknown role" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});


//==============================================================================V
// Add this endpoint to server.js after the /api/auth/me endpoint:

app.patch("/api/auth/update-profile", auth, async (req, res) => {
  try {
    const { name, email } = req.body || {};
    
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Name and email are required" 
      });
    }

    if (req.user.role === "user") {
      // Check if email is already taken by another user
      const [existingUser] = await db.query(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email.trim(), req.user.id]
      );

      if (existingUser.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: "Email already in use by another account" 
        });
      }

      // Update user profile
      await db.query(
        "UPDATE users SET name = ?, email = ? WHERE id = ?",
        [name.trim(), email.trim(), req.user.id]
      );

      // Fetch updated profile
      const [rows] = await db.query(
        "SELECT id, name, email, address, description, createdAt FROM users WHERE id=?",
        [req.user.id]
      );

      return res.json({
        success: true,
        message: "Profile updated successfully",
        profile: rows[0]
      });

    } else if (req.user.role === "organization") {
      // Check if email is already taken by another organization
      const [existingOrg] = await db.query(
        "SELECT id FROM organizations WHERE email = ? AND id != ?",
        [email.trim(), req.user.id]
      );

      if (existingOrg.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: "Email already in use by another organization" 
        });
      }

      // Update organization profile
      await db.query(
        "UPDATE organizations SET name = ?, email = ? WHERE id = ?",
        [name.trim(), email.trim(), req.user.id]
      );

      // Fetch updated profile
      const [rows] = await db.query(
        "SELECT id, name, slug, email, address, description, access_type, logo, createdAt FROM organizations WHERE id=?",
        [req.user.id]
      );

      return res.json({
        success: true,
        message: "Profile updated successfully",
        profile: rows[0]
      });
    }

    return res.status(400).json({ 
      success: false, 
      message: "Invalid user role" 
    });

  } catch (e) {
    console.error("[update profile error]", e);
    return res.status(500).json({ 
      success: false, 
      message: "Server error while updating profile" 
    });
  }
});



///=============================================

// Add this endpoint to server.js after the profile update endpoint:

app.post("/api/auth/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Current password and new password are required" 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: "New password must be at least 8 characters long" 
      });
    }

    if (req.user.role === "user") {
      // Get current user password
      const [rows] = await db.query(
        "SELECT password FROM users WHERE id = ?",
        [req.user.id]
      );

      if (!rows.length) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, rows[0].password);
      if (!isValid) {
        return res.status(401).json({ 
          success: false, 
          message: "Current password is incorrect" 
        });
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, req.user.id]
      );

      return res.json({
        success: true,
        message: "Password changed successfully"
      });

    } else if (req.user.role === "organization") {
      // Get current organization password
      const [rows] = await db.query(
        "SELECT password FROM organizations WHERE id = ?",
        [req.user.id]
      );

      if (!rows.length) {
        return res.status(404).json({ 
          success: false, 
          message: "Organization not found" 
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, rows[0].password);
      if (!isValid) {
        return res.status(401).json({ 
          success: false, 
          message: "Current password is incorrect" 
        });
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.query(
        "UPDATE organizations SET password = ? WHERE id = ?",
        [hashedPassword, req.user.id]
      );

      return res.json({
        success: true,
        message: "Password changed successfully"
      });
    }

    return res.status(400).json({ 
      success: false, 
      message: "Invalid user role" 
    });

  } catch (e) {
    console.error("[change password error]", e);
    return res.status(500).json({ 
      success: false, 
      message: "Server error while changing password" 
    });
  }
});
//========================================================================^

app.post("/api/auth/logout", (_req, res) => {
  return res.json({ success: true });
});

// =======================
//     ORGANIZATIONS
// =======================

app.post("/register", upload.single("logo"), async (req, res) => {
  try {
    const { orgName, email, address, description, companyType, password } = req.body || {};
    if (!orgName || !email || !address || !description || !companyType || !password)
      return res.status(400).json({ success: false, error: "All fields are required" });

    const slug = slugify(orgName);
    const logo = req.file ? `/uploads/${req.file.filename}` : null;
    const accessType = companyType;

    const [[orgByName]] = await db.query("SELECT COUNT(*) AS c FROM organizations WHERE name=?", [orgName]);
    if (orgByName.c > 0)
      return res.status(409).json({ success: false, error: "Organization name already exists" });

    const [[orgBySlug]] = await db.query("SELECT COUNT(*) AS c FROM organizations WHERE slug=?", [slug]);
    if (orgBySlug.c > 0)
      return res.status(409).json({ success: false, error: "Slug collision, try another name" });

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO organizations (name, slug, email, password, address, description, access_type, logo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [orgName, slug, email, hash, address, description, accessType, logo]
    );

    return res.json({ success: true, message: "Organization registered successfully!", slug });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "Database/server error" });
  }
});

app.get("/api/organizations", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, slug, access_type AS type, logo FROM organizations WHERE status='active' ORDER BY name ASC"
    );
    const base = `${req.protocol}://${req.get("host")}`;
    const data = rows.map(r => ({
      ...r,
      logo: r.logo ? `${base}${r.logo}` : null,
    }));
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});

app.post("/api/register/organization", upload.single("logo"), async (req, res) => {
  try {
    const { orgName, orgType, email, address, description, password } = req.body || {};
    if (!orgName || !email || !address || !description || !password)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    const slug = slugify(orgName);
    const logo = req.file ? `/uploads/${req.file.filename}` : null;
    const accessType = orgType || "Public";

    const [[byName]] = await db.query("SELECT COUNT(*) AS c FROM organizations WHERE name=?", [orgName]);
    if (byName.c > 0)
      return res.status(409).json({ success: false, message: "Organization name already exists" });

    const [[bySlug]] = await db.query("SELECT COUNT(*) AS c FROM organizations WHERE slug=?", [slug]);
    if (bySlug.c > 0)
      return res.status(409).json({ success: false, message: "Slug collision, try a different name" });

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO organizations (name, slug, email, password, address, description, access_type, logo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [orgName, slug, email, hash, address, description, accessType, logo]
    );

    return res.json({ success: true, message: "Organization registered successfully", slug });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/register/user", async (req, res) => {
  try {
    const { name, email, password, organizationId, address = null, description = null } = req.body || {};
    if (!name || !email || !password || !organizationId)
      return res.status(400).json({ success: false, message: "name, email, password, organizationId required" });

    const [orgRows] = await db.query("SELECT id FROM organizations WHERE id=?", [organizationId]);
    if (!orgRows.length) return res.status(404).json({ success: false, message: "Organization not found" });

    const [exists] = await db.query("SELECT id FROM users WHERE email=?", [email]);
    let userId;
    if (exists.length) {
      userId = exists[0].id;
    } else {
      const hash = await bcrypt.hash(password, 10);
      const [ins] = await db.query(
        "INSERT INTO users (name, email, password, address, description) VALUES (?, ?, ?, ?, ?)",
        [name, email, hash, address, description]
      );
      userId = ins.insertId;
    }

    await db.query(
      "INSERT IGNORE INTO user_organizations (user_id, org_id) VALUES (?, ?)",
      [userId, organizationId]
    );

    return res.json({ success: true, message: "User registered to organization", userId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/my/organizations", auth, async (req, res) => {
  try {
    if (req.user.role !== "user") return res.json([]);
    const [rows] = await db.query(
      `SELECT o.id, o.name, o.slug 
         FROM user_organizations uo
         JOIN organizations o ON o.id = uo.org_id
        WHERE uo.user_id=? AND o.status='active'
        ORDER BY o.name ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});

// =======================
//   ORG DETAILS + FEED
// =======================

app.get("/api/organizations/:slug", async (req, res) => {
  try {
    const org = await findOrgBySlug(req.params.slug);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    org.logo = org.logo ? `http://localhost:${PORT}${org.logo}` : null;
    org.isPublic = org.access_type === "Public"; // Frontend expects isPublic
    return res.json({ success: true, organization: org });
  } catch (e) {
    console.error("[org get error]", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// NEW: Toggle Organization Visibility
app.patch("/api/organizations/:id/visibility", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isPublic } = req.body;
    
    if (req.user.role !== "organization" || req.user.id !== id) {
      return res.status(403).json({ success: false, message: "Only organization admin can change visibility" });
    }

    const newAccessType = isPublic ? "Public" : "Private";
    await db.query(
      "UPDATE organizations SET access_type=? WHERE id=?",
      [newAccessType, id]
    );

    return res.json({ success: true, isPublic });
  } catch (e) {
    console.error("[visibility error]", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get organization members (only org admin can see)
app.get("/api/organizations/:slug/members", auth, async (req, res) => {
  try {
    const org = await findOrgBySlug(req.params.slug);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    if (req.user.role !== "organization" || req.user.id !== org.id) {
      return res.status(403).json({ success: false, message: "Only organization can view members" });
    }

    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.address, u.description, u.createdAt,
              uo.role_code AS role
         FROM user_organizations uo
         JOIN users u ON u.id = uo.user_id
        WHERE uo.org_id = ?
        ORDER BY u.name ASC`,
      [org.id]
    );

    return res.json({ success: true, members: rows });
  } catch (e) {
    console.error("[members error]", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get organization with complaints by slug
app.get("/api/organizations/:slug/complaints", softAuth, async (req, res) => {
  try {
    const org = await findOrgBySlug(req.params.slug);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    org.logo = org.logo ? `http://localhost:${PORT}${org.logo}` : null;
    org.isPublic = org.access_type === "Public";

    let canSee = org.access_type === "Public";
    let myRole = null;
    if (!canSee && req.user) {
      if (req.user.role === "organization" && req.user.id === org.id) {
        canSee = true;
        myRole = "org_admin";
      } else if (req.user.role === "user") {
        const [mRows] = await db.query(
          "SELECT role_code FROM user_organizations WHERE user_id=? AND org_id=? LIMIT 1",
          [req.user.id, org.id]
        );
        if (mRows.length) {
          canSee = true;
          myRole = mRows[0].role_code || "member";
        }
      }
    } else if (canSee && req.user) {
      if (req.user.role === "organization" && req.user.id === org.id) {
        myRole = "org_admin";
      } else if (req.user.role === "user") {
        const [mRows] = await db.query(
          "SELECT role_code FROM user_organizations WHERE user_id=? AND org_id=? LIMIT 1",
          [req.user.id, org.id]
        );
        if (mRows.length) myRole = mRows[0].role_code || "member";
      }
    }

    if (!canSee) {
      return res.status(403).json({
        success: false,
        message: "This organization's complaints are private. Please log in."
      });
    }

    const [rows] = await db.query(
      `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.status,
        a.priority,
        a.is_anonymous AS isAnonymous,
        a.createdAt,
        a.editedAt,  
        a.trackingCode,
        a.attachment_path,
        d.name AS departmentName,
        u.name AS userName
      FROM complaints a
      LEFT JOIN departments d ON d.id = a.department_id
      LEFT JOIN users u       ON u.id = a.user_id
      WHERE a.org_id = ?
        AND a.status <> 'Withdrawn'
      ORDER BY a.createdAt DESC
      `,
      [org.id]
    );

// new stufff
const voteRows = rows.length > 0 ? await db.query(
  `SELECT complaint_id, COUNT(*) AS votes
   FROM complaint_votes
   WHERE complaint_id IN (${rows.map(() => '?').join(',')})
   GROUP BY complaint_id`,
  rows.map(r => r.id)  // Pass IDs as parameters
) : [[]];
    const voteMap = Object.fromEntries(voteRows[0].map(v => [v.complaint_id, v.votes]));

    const complaints = rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      createdAt: r.createdAt,
      editedAt: r.editedAt,
      trackingCode: r.trackingCode,
      department: r.departmentName || "Entire organization",
      submittedBy: r.isAnonymous ? "Anonymous" : (r.userName || "User"),
      document: r.attachment_path ? `http://localhost:${PORT}${r.attachment_path}` : null,
      votes: voteMap[r.id] || 0,
    }));

    return res.json({ 
      success: true, 
      organization: { ...org, myRole }, 
      complaints 
    });
  } catch (e) {
    console.error("[org complaints error]", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/public/organizations/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const like = `%${q}%`;
    const [rows] = await db.query(
      `SELECT id, name, slug, access_type, logo
         FROM organizations
        WHERE status='active'
          AND access_type='Public'
          AND (LOWER(name) LIKE ? OR LOWER(slug) LIKE ?)
        ORDER BY name ASC
        LIMIT 20`,
      [like, like]
    );
    const items = rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      access_type: r.access_type,
      logo: r.logo ? `http://localhost:${PORT}${r.logo}` : null,
    }));
    res.json({ success: true, items });
  } catch (e) {
    console.error("[public org search]", e);
    res.status(500).json({ success: false, items: [], message: "Server error" });
  }
});

// =======================
//       DEPARTMENTS
// =======================

app.get("/api/organizations/:slug/departments", async (req, res) => {
  try {
    const org = await findOrgBySlug(req.params.slug);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const [rows] = await db.query(
      "SELECT id, name, slug, status FROM departments WHERE org_id=? AND status='active' ORDER BY name ASC",
      [org.id]
    );
    return res.json({ items: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/organizations/:slug/departments/overview", async (req, res) => {
  try {
    const org = await findOrgBySlug(req.params.slug);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const [rows] = await db.query(
      `
      SELECT 
        d.id, d.name, d.slug,
        SUM(a.id IS NOT NULL) AS total,
        SUM(a.status = 'Resolved') AS resolved
      FROM departments d
      LEFT JOIN complaints a ON a.department_id = d.id
      WHERE d.org_id=? AND d.status='active'
      GROUP BY d.id
      ORDER BY d.name ASC
      `,
      [org.id]
    );
    return res.json({ items: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/organizations/:slug/departments", auth, async (req, res) => {
  try {
    const org = await findOrgBySlug(req.params.slug);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    if (!(req.user.role === "organization" && req.user.id === org.id)) {
      return res.status(403).json({ success: false, message: "Only this organization can create departments" });
    }

    const { name = "", description = "" } = req.body || {};
    if (!name.trim()) return res.status(400).json({ success: false, message: "Department name is required" });

    const slug = slugify(name);
    const [[exists]] = await db.query(
      "SELECT COUNT(*) AS c FROM departments WHERE org_id=? AND slug=?",
      [org.id, slug]
    );
    if (exists.c > 0)
      return res.status(409).json({ success: false, message: "Department already exists" });

    await db.query(
      "INSERT INTO departments (org_id, name, slug, status) VALUES (?, ?, ?, 'active')",
      [org.id, name.trim(), slug]
    );

    return res.json({ success: true, message: "Department created" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/departments", async (req, res) => {
  try {
    const orgId = Number(req.query.organizationId);
    if (!orgId) return res.status(400).json({ success: false, message: "organizationId required" });

    const [orgRows] = await db.query("SELECT id FROM organizations WHERE id=?", [orgId]);
    if (!orgRows.length) return res.status(404).json({ success: false, message: "Organization not found" });

    const [rows] = await db.query(
      "SELECT id, name, slug, status FROM departments WHERE org_id=? AND status='active' ORDER BY name ASC",
      [orgId]
    );
    return res.json({ items: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// =======================
//        COMPLAINTS + VOTES
// =======================

app.post("/api/complaints", softAuth, upload.single("attachment"), async (req, res) => {
  try {
    const {
      title = "",
      description = "",
      organizationId,
      organizationSlug,
      departmentId = null,
      priority = "Low",
      isAnonymous: isAnonymousRaw,
      scope = null,
      departmentScope = null,
    } = req.body || {};

    let orgId = Number(organizationId);
    if (!orgId && organizationSlug) {
      const org = await findOrgBySlug(String(organizationSlug));
      orgId = org?.id || 0;
    }
    if (!title || !description || !orgId) {
      return res.status(400).json({ success: false, message: "title, description, organizationId required" });
    }

    const [orgRows] = await db.query("SELECT id FROM organizations WHERE id=?", [orgId]);
    if (!orgRows.length) return res.status(404).json({ success: false, message: "Organization not found" });

    let anonymous = !req.user;
    if (typeof isAnonymousRaw !== "undefined") {
      anonymous = String(isAnonymousRaw).toLowerCase() === "true";
    }

    const wholeOrg =
      (scope && String(scope).toLowerCase() === "organization") ||
      (departmentScope && String(departmentScope).toLowerCase() === "organization") ||
      departmentId === null ||
      departmentId === "" ||
      String(departmentId).toUpperCase() === "NONE" ||
      String(departmentId).toUpperCase() === "NONE_DEPT" ||
      String(departmentId).toUpperCase() === "NONE_DEPARTMENT";

    const deptId = wholeOrg ? null : Number(departmentId) || null;

    if (deptId !== null) {
      const [d] = await db.query(
        "SELECT id FROM departments WHERE id=? AND org_id=?",
        [deptId, orgId]
      );
      if (!d.length) {
        return res.status(400).json({ success: false, message: "Invalid department for this organization" });
      }
    }

    const attachment_path = req.file ? `/uploads/${req.file.filename}` : null;
    const trackingCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    const userId = !anonymous && req.user?.role === "user" ? req.user.id : null;

    const [ins] = await db.query(
      `INSERT INTO complaints 
        (org_id, department_id, user_id, title, description, priority, is_anonymous, attachment_path, status, trackingCode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)`,
      [orgId, deptId, userId, title.trim(), description.trim(), priority, anonymous ? 1 : 0, attachment_path, trackingCode]
    );
// this was auto vote 1
    // if (userId) {
    //   await db.query(
    //     `INSERT IGNORE INTO complaint_votes (complaint_id, voter_key) VALUES (?, ?)`,
    //     [ins.insertId, `u:${userId}`]
    //   );
    // }

    return res.json({ success: true, id: ins.insertId, trackingCode });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Replace this endpoint in server.js (around line 848)

app.get("/api/complaints/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid id" });

    const [rows] = await db.query(
      `
      SELECT 
        a.id, a.title, a.description, a.status, a.priority, 
        a.createdAt, a.editedAt, a.trackingCode, a.attachment_path, a.votes,
        d.id AS deptId, d.name AS deptName,
        o.id AS orgId, o.name AS orgName,
        u.id AS userId
      FROM complaints a
      LEFT JOIN departments d ON d.id = a.department_id
      JOIN organizations o ON o.id = a.org_id
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.id = ?
      `,
      [id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    const r = rows[0];
    
    // Get vote count
    const [[voteRow]] = await db.query(
      `SELECT COUNT(*) AS votes FROM complaint_votes WHERE complaint_id=?`, 
      [id]
    );

    // ✅ STANDARDIZED RESPONSE FORMAT - wrapped in 'complaint' object
    const complaint = {
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      createdAt: r.createdAt,
      editedAt: r.editedAt,
      trackingCode: r.trackingCode,
      organization: { id: r.orgId, name: r.orgName },
      department: r.deptId ? { id: r.deptId, name: r.deptName } : null,
      attachmentUrl: r.attachment_path ? `http://localhost:${PORT}${r.attachment_path}` : null,
      document: r.attachment_path ? `http://localhost:${PORT}${r.attachment_path}` : null,
      votes: voteRow?.votes || r.votes || 0,
      user_id: r.userId, // Include for vote blocking logic
      // Format attachments as array for consistency
      attachments: r.attachment_path ? [{
        url: `http://localhost:${PORT}${r.attachment_path}`,
        name: r.attachment_path.split('/').pop()
      }] : []
    };

    return res.json({ 
      success: true, 
      complaint  // ✅ Wrapped format
    });
    
  } catch (e) {
    console.error("[complaint detail error]", e);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});
// // VOTE ENDPOINT — ONLY USERS CAN VOTE
// app.post("/api/complaints/:id/vote", auth, async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     if (!id) return res.status(400).json({ success: false, message: "Invalid id" });

//     if (req.user.role !== "user") {
//       return res.status(403).json({ 
//         success: false, 
//         message: "Only registered users can upvote complaints" 
//       });
//     }

//     const voterKey = `u:${req.user.id}`;

//     await db.query(
//       `INSERT IGNORE INTO complaint_votes (complaint_id, voter_key) VALUES (?, ?)`,
//       [id, voterKey]
//     );

//     const [[v]] = await db.query(`SELECT COUNT(*) AS votes FROM complaint_votes WHERE complaint_id=?`, [id]);
//     return res.json({ success: true, votes: v.votes });
//   } catch (e) {
//     console.error("[vote]", e);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// UPDATE STATUS
// app.patch("/api/complaints/:id", auth, async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     if (!id) return res.status(400).json({ success: false, message: "Invalid id" });

//     const { status } = req.body || {};
//     if (!status) return res.status(400).json({ success: false, message: "Status is required" });

//     const validStatuses = ["Open", "Pending", "In Progress", "Resolved", "Rejected", "Closed", "Withdrawn"];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({ success: false, message: "Invalid status value" });
//     }

//     const [rows] = await db.query(
//       `SELECT id, org_id, user_id FROM complaints WHERE id=?`,
//       [id]
//     );
//     if (!rows.length) return res.status(404).json({ success: false, message: "Complaint not found" });
//     const complaint = rows[0];

//     if (req.user.role !== "organization" || req.user.id !== complaint.org_id) {
//       return res.status(403).json({ success: false, message: "Only the organization can update complaint status" });
//     }

//     await db.query(
//       `UPDATE complaints SET status=? WHERE id=?`,
//       [status, id]
//     );

//     if (complaint.user_id) {
//       await db.query(
//         `INSERT INTO notifications (user_id, org_id, complaints_id, type, message, createdAt)
//          VALUES (?, ?, ?, 'status_changed', ?, NOW())`,
//         [complaint.user_id, complaint.org_id, id, `Complaint status updated to: ${status}`]
//       );
//     }

//     const [orgUsers] = await db.query(
//       `SELECT DISTINCT user_id FROM user_organizations WHERE org_id=?`,
//       [complaint.org_id]
//     );

//     for (const ou of orgUsers) {
//       if (ou.user_id !== complaint.user_id) {
//         await db.query(
//           `INSERT INTO notifications (user_id, org_id, complaints_id, type, message, createdAt)
//            VALUES (?, ?, ?, 'status_changed', ?, NOW())`,
//           [ou.user_id, complaint.org_id, id, `Complaint #${id} status changed to: ${status}`]
//         );
//       }
//     }

//     const [[voteRow]] = await db.query(`SELECT COUNT(*) AS votes FROM complaint_votes WHERE complaint_id=?`, [id]);
//     return res.json({ success: true, message: "Status updated successfully", status, votes: voteRow.votes });
//   } catch (e) {
//     console.error("[update status]", e);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// });


// ========================
// VOTE ROUTE – TOGGLE (LOGGED-IN + ANONYMOUS via COOKIE)
// ========================
// app.post('/api/complaints/:id/vote', async (req, res) => {
//   const conn = await pool.getConnection();
//   try {
//     await conn.beginTransaction();

//     const complaintId = req.params.id;
//     const token = req.headers.authorization?.split(' ')[1];
//     let userId = null;
//     let isOrg = false;

//     if (token) {
//       try {
//         const decoded = jwt.verify(token, JWT_SECRET);
//         userId = decoded.id;
//         isOrg = decoded.type === 'organization';
//       } catch (e) { /* invalid token */ }
//     }

//     // Get or create anonymous ID
//     let anonId = req.cookies?.[ANON_COOKIE];
//     if (!anonId) {
//       anonId = crypto.randomBytes(16).toString('hex');
//       res.cookie(ANON_COOKIE, anonId, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === 'production',
//         sameSite: 'lax',
//         maxAge: 365 * 24 * 60 * 60 * 1000
//       });
//     }

//     const voterKey = userId ? `u:${userId}` : `a:${anonId}`;

//     // Get complaint
//     const [complaints] = await conn.query(
//       `SELECT c.*, o.access_type, o.id AS org_id 
//        FROM complaints c 
//        JOIN organizations o ON c.org_id = o.id 
//        WHERE c.id = ?`,
//       [complaintId]
//     );
//     if (complaints.length === 0) {
//       await conn.rollback();
//       return res.status(404).json({ message: 'Complaint not found' });
//     }
//     const complaint = complaints[0];

//     // Block self-vote
//     if (userId && complaint.user_id && complaint.user_id == userId) {
//       await conn.rollback();
//       return res.status(403).json({ message: 'Cannot vote on your own complaint' });
//     }

//     // Block org self-vote
//     if (isOrg && complaint.org_id == userId) {
//       await conn.rollback();
//       return res.status(403).json({ message: 'Organization cannot vote' });
//     }

//     // Private org: only members
//     if (complaint.access_type === 'Private') {
//       if (!userId) {
//         await conn.rollback();
//         return res.status(403).json({ message: 'Login required for private organization' });
//       }
//       const [members] = await conn.query(
//         `SELECT 1 FROM user_organizations WHERE user_id = ? AND org_id = ?`,
//         [userId, complaint.org_id]
//       );
//       if (members.length === 0) {
//         await conn.rollback();
//         return res.status(403).json({ message: 'Not a member' });
//       }
//     }

//     // Toggle vote
//     const [existing] = await conn.query(
//       `SELECT id FROM complaint_votes WHERE complaint_id = ? AND voter_key = ?`,
//       [complaintId, voterKey]
//     );

//     let liked = false;
//     let votes = complaint.votes || 0;

//     if (existing.length > 0) {
//       await conn.query(`DELETE FROM complaint_votes WHERE complaint_id = ? AND voter_key = ?`, [complaintId, voterKey]);
//       votes -= 1;
//     } else {
//       await conn.query(`INSERT INTO complaint_votes (complaint_id, voter_key) VALUES (?, ?)`, [complaintId, voterKey]);
//       votes += 1;
//       liked = true;
//     }

//     await conn.query(`UPDATE complaints SET votes = ? WHERE id = ?`, [votes, complaintId]);
//     await conn.commit();

//     res.json({ votes, liked });

//   } catch (err) {
//     await conn.rollback();
//     console.error('Vote error:', err);
//     res.status(500).json({ message: 'Server error' });
//   } finally {
//     conn.release();
//   }
// });

// ========================
// VOTE ROUTE – TOGGLE (LOGGED-IN + ANONYMOUS via COOKIE)
// Replace BOTH existing vote routes with this single one
// ========================
app.post('/api/complaints/:id/vote', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const complaintId = Number(req.params.id);
    if (!complaintId) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Invalid complaint ID' });
    }

    // Check auth token
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null;
    let isOrg = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
        isOrg = decoded.role === 'organization';
      } catch (e) { 
        // Invalid token - treat as anonymous
      }
    }

    // Get or create anonymous ID from cookie
    let anonId = req.cookies?.[ANON_COOKIE];
    if (!anonId && !userId) {
      anonId = crypto.randomBytes(16).toString('hex');
      res.cookie(ANON_COOKIE, anonId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
      });
    }

    // Create voter key
    const voterKey = userId ? `u:${userId}` : `a:${anonId}`;

    // Get complaint details
    const [complaints] = await conn.query(
      `SELECT c.*, o.access_type, o.id AS org_id 
       FROM complaints c 
       JOIN organizations o ON c.org_id = o.id 
       WHERE c.id = ?`,
      [complaintId]
    );

    if (complaints.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const complaint = complaints[0];

    // Block self-vote (user voting own complaint)
    if (userId && complaint.user_id && complaint.user_id === userId) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Cannot vote on your own complaint' });
    }

    // Block organization self-vote
    if (isOrg && complaint.org_id === userId) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Organization cannot vote on complaints' });
    }

    // Check private org access
    if (complaint.access_type === 'Private') {
      if (!userId) {
        await conn.rollback();
        return res.status(403).json({ success: false, message: 'Login required for private organization' });
      }
      
      const [members] = await conn.query(
        `SELECT 1 FROM user_organizations WHERE user_id = ? AND org_id = ?`,
        [userId, complaint.org_id]
      );
      
      if (members.length === 0) {
        await conn.rollback();
        return res.status(403).json({ success: false, message: 'Not a member of this organization' });
      }
    }

    // Toggle vote
    const [existing] = await conn.query(
      `SELECT id FROM complaint_votes WHERE complaint_id = ? AND voter_key = ?`,
      [complaintId, voterKey]
    );

    let liked = false;
    let votes = complaint.votes || 0;

    if (existing.length > 0) {
      // Remove vote
      await conn.query(
        `DELETE FROM complaint_votes WHERE complaint_id = ? AND voter_key = ?`,
        [complaintId, voterKey]
      );
      votes = Math.max(0, votes - 1);
      liked = false;
    } else {
      // Add vote
      await conn.query(
        `INSERT INTO complaint_votes (complaint_id, voter_key) VALUES (?, ?)`,
        [complaintId, voterKey]
      );
      votes += 1;
      liked = true;
    }

    // Update vote count in complaints table
    await conn.query(
      `UPDATE complaints SET votes = ? WHERE id = ?`,
      [votes, complaintId]
    );

    await conn.commit();

    res.json({ success: true, votes, liked });

  } catch (err) {
    await conn.rollback();
    console.error('Vote error:', err);
    res.status(500).json({ success: false, message: 'Server error while processing vote' });
  } finally {
    conn.release();
  }
});

// DELETE COMPLAINT — FINAL FIXED =============================~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// app.delete("/api/complaints/:id", auth, async (req, res) => {
//   const id = Number(req.params.id);
//   if (!id) return res.status(400).json({ success: false, message: "Invalid complaint ID" });

//   if (req.user.role !== "organization") {
//     return res.status(403).json({ success: false, message: "Only organization admins can delete complaints" });
//   }

//   const connection = await db.getConnection();
//   try {
//     await connection.beginTransaction();

//     const [rows] = await connection.query(
//       `SELECT id, org_id, user_id, attachment_path FROM complaints WHERE id = ? FOR UPDATE`,
//       [id]
//     );

//     if (!rows.length) {
//       await connection.rollback();
//       return res.status(404).json({ success: false, message: "Complaint not found" });
//     }

//     const complaint = rows[0];

//     if (complaint.org_id !== req.user.id) {
//       await connection.rollback();
//       return res.status(403).json({ success: false, message: "Unauthorized" });
//     }

//     // Delete file
//     if (complaint.attachment_path) {
//       const filePath = path.join(process.cwd(), complaint.attachment_path.replace(/^\//, ''));
//       try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (err) {
//         console.warn("File delete failed:", err.message);
//       }
//     }

//     // Delete related data
//     await connection.query(`DELETE FROM complaint_votes WHERE complaint_id = ?`, [id]);

//     // Optional: Soft delete
//     // await connection.query(`UPDATE complaints SET status='Deleted', deletedAt=NOW() WHERE id=?`, [id]);

//     // Hard delete
//     await connection.query(`DELETE FROM complaints WHERE id = ?`, [id]);

//     // Notify user — USE EXACT ENUM VALUE
//     if (complaint.user_id) {
//       await connection.query(
//         `INSERT INTO notifications (user_id, org_id, complaints_id, type, message, createdAt)
//          VALUES (?, ?, ?, 'complaint_deleted', ?, NOW())`,
//         [complaint.user_id, complaint.org_id, id, `Your complaint has been deleted by the organization`]
//       );
//     }

//     await connection.commit();
//     return res.json({ success: true, message: "Complaint deleted" });

//   } catch (e) {
//     await connection.rollback();
//     console.error("[delete complaint]", e);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Delete failed. Check server logs.",
//       debug: process.env.NODE_ENV === 'development' ? e.message : undefined
//     });
//   } finally {
//     connection.release();
//   }
// });
// WITHDRAW & RESTORE
app.post("/api/complaints/:id/withdraw", auth, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only the complainant can withdraw." });
    }

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid id" });

    const [rows] = await db.query(
      `SELECT id, user_id, org_id, status FROM complaints WHERE id=?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
    const c = rows[0];

    if (c.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only withdraw your own complaint." });
    }

    if (c.status === 'Withdrawn') {
      return res.json({ success: true, message: "Complaint already withdrawn." });
    }

    await db.query(
      `UPDATE complaints 
         SET status='Withdrawn', withdrawnAt=NOW()
       WHERE id=?`,
      [id]
    );

    await db.query(
      `INSERT INTO notifications (user_id, org_id, complaints_id, type, message, createdAt)
       VALUES (?, ?, ?, 'status_changed', ?, NOW())`,
      [req.user.id, c.org_id, id, 'Complaint withdrawn by the user']
    );

    return res.json({ success: true, message: "Complaint withdrawn.", retentionDays: WITHDRAW_RETENTION_DAYS });
  } catch (e) {
    console.error("[withdraw]", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/complaints/:id/restore", auth, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only the complainant can restore." });
    }

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid id" });

    const [rows] = await db.query(
      `SELECT id, user_id, org_id, status, withdrawnAt
         FROM complaints
        WHERE id=?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
    const c = rows[0];

    if (c.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only restore your own complaint." });
    }
    if (c.status !== 'Withdrawn') {
      return res.status(400).json({ success: false, message: "Complaint is not withdrawn." });
    }

    const [[ret]] = await db.query(
      `SELECT TIMESTAMPDIFF(DAY, ?, NOW()) AS days`,
      [c.withdrawnAt]
    );
    if (ret.days >= WITHDRAW_RETENTION_DAYS) {
      return res.status(410).json({ success: false, message: "Retention window passed. The complaint can no longer be restored." });
    }

    await db.query(
      `UPDATE complaints
          SET status='Open', withdrawnAt=NULL
        WHERE id=?`,
      [id]
    );

    await db.query(
      `INSERT INTO notifications (user_id, org_id, complaints_id, type, message, createdAt)
       VALUES (?, ?, ?, 'status_changed', ?, NOW())`,
      [req.user.id, c.org_id, id, 'Complaint restored by the user']
    );

    return res.json({ success: true, message: "Complaint restored to Open." });
  } catch (e) {
    console.error("[restore]", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/complaints", auth, async (req, res) => {
  try {
    const scope = String(req.query.scope || "mine").toLowerCase();
    const limit = Math.min(Number(req.query.limit) || 8, 50);
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * limit;
    const q = (req.query.q || "").trim();
    const status = (req.query.status || "").trim();

    const params = [];
    let where = "WHERE 1=1";
    if (scope === "mine" && req.user.role === "user") {
      where += " AND a.user_id = ?";
      params.push(req.user.id);
    } else if (req.user.role === "organization") {
      where += " AND a.org_id = ?";
      params.push(req.user.id);
    }

    if (q) {
      where += " AND (a.title LIKE ? OR a.description LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }
    if (status) {
      where += " AND a.status = ?";
      params.push(status);
    }

    const [rows] = await db.query(
      `
      SELECT 
        a.id, a.title, a.status, a.createdAt,
        d.name AS departmentName,
        o.name AS organizationName
      FROM complaints a
      LEFT JOIN departments d ON d.id = a.department_id
      JOIN organizations o ON o.id = a.org_id
      ${where}
      ORDER BY a.createdAt DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const [cntRows] = await db.query(
      `SELECT COUNT(*) AS c
         FROM complaints a
         LEFT JOIN departments d ON d.id = a.department_id
         JOIN organizations o ON o.id = a.org_id
        ${where}`,
      params
    );

    const items = rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt,
      department: r.departmentName ? { name: r.departmentName } : null,
      organization: r.organizationName,
    }));

    return res.json({ items, total: cntRows[0].c, page, limit });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ items: [], total: 0, page: 1, limit: 8 });
  }
});


//============================================
// Replace BOTH app.patch("/api/complaints/:id") routes in server.js with this single one:

app.patch("/api/complaints/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid id" });

    const { title, description, status } = req.body || {};

    // Get the complaint first with all needed fields
    const [rows] = await db.query(
      `SELECT id, org_id, user_id, status, title, description, createdAt FROM complaints WHERE id=?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Complaint not found" });
    const complaint = rows[0];

    // STATUS UPDATE - only organization can do it
    if (status) {
      if (req.user.role !== "organization" || req.user.id !== complaint.org_id) {
        return res.status(403).json({ success: false, message: "Only the organization can update complaint status" });
      }

      const validStatuses = ["Open", "Pending", "In Progress", "Resolved", "Rejected", "Closed", "Withdrawn"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status value" });
      }

      await db.query(`UPDATE complaints SET status=? WHERE id=?`, [status, id]);

      // Notify user about status change
      if (complaint.user_id) {
        await db.query(
          `INSERT INTO notifications (user_id, org_id, complaints_id, type, message, createdAt)
           VALUES (?, ?, ?, 'status_changed', ?, NOW())`,
          [complaint.user_id, complaint.org_id, id, `Complaint status updated to: ${status}`]
        );
      }

      // Notify org members
      const [orgUsers] = await db.query(
        `SELECT DISTINCT user_id FROM user_organizations WHERE org_id=?`,
        [complaint.org_id]
      );

      for (const ou of orgUsers) {
        if (ou.user_id !== complaint.user_id) {
          await db.query(
            `INSERT INTO notifications (user_id, org_id, complaints_id, type, message, createdAt)
             VALUES (?, ?, ?, 'status_changed', ?, NOW())`,
            [ou.user_id, complaint.org_id, id, `Complaint #${id} status changed to: ${status}`]
          );
        }
      }

      const [[voteRow]] = await db.query(`SELECT COUNT(*) AS votes FROM complaint_votes WHERE complaint_id=?`, [id]);
      return res.json({ success: true, message: "Status updated successfully", status, votes: voteRow.votes });
    }

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // TITLE/DESCRIPTION UPDATE - only the complaint owner can do it
if (title !== undefined || description !== undefined) {
  if (req.user.role !== "user" || req.user.id !== complaint.user_id) {
    return res.status(403).json({ success: false, message: "You can only edit your own complaints" });
  }

  // Check edit time window (24 hours)
  const createdAt = new Date(complaint.createdAt);
  const now = new Date();
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
  
  if (hoursSinceCreation > 24) {
    return res.status(403).json({
      success: false,
      message: "Complaints can only be edited within 24 hours of submission"
    });
  }

  // Don't allow editing resolved/withdrawn/in-progress complaints
  if (["Resolved", "Withdrawn", "In Progress", "Rejected"].includes(complaint.status)) {
    return res.status(403).json({
      success: false,
      message: `Cannot edit ${complaint.status.toLowerCase()} complaints`
    });
  }

  // LOG EDIT HISTORY
  if (title !== undefined || description !== undefined) {
    await db.query(
      `INSERT INTO complaint_edits 
        (complaint_id, old_title, old_description, new_title, new_description, edited_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        complaint.title,
        complaint.description,
        title !== undefined ? title.trim() : complaint.title,
        description !== undefined ? description.trim() : complaint.description,
        req.user.id
      ]
    );
  }

  // Build update query
  const updates = [];
  const values = [];

  if (title !== undefined && title.trim()) {
    updates.push("title = ?");
    values.push(title.trim());
  }
  if (description !== undefined && description.trim()) {
    updates.push("description = ?");
    values.push(description.trim());
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: "No valid fields to update" });
  }

  // ADD editedAt timestamp
  updates.push("editedAt = NOW()");

  values.push(id);
  await db.query(
    `UPDATE complaints SET ${updates.join(", ")} WHERE id=?`,
    values
  );

  // FETCH UPDATED COMPLAINT TO RETURN
  const [updatedRows] = await db.query(
    `SELECT 
      a.id, a.title, a.description, a.status, a.priority, 
      a.createdAt, a.editedAt, a.trackingCode, a.attachment_path, a.votes,
      d.id AS deptId, d.name AS deptName,
      o.id AS orgId, o.name AS orgName,
      u.id AS userId
    FROM complaints a
    LEFT JOIN departments d ON d.id = a.department_id
    JOIN organizations o ON o.id = a.org_id
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.id = ?`,
    [id]
  );

  if (!updatedRows.length) {
    return res.status(500).json({ success: false, message: "Failed to fetch updated complaint" });
  }

  const r = updatedRows[0];

  // Get vote count
  const [[voteRow]] = await db.query(
    `SELECT COUNT(*) AS votes FROM complaint_votes WHERE complaint_id=?`,
    [id]
  );

  // RETURN STANDARDIZED FORMAT
  const updatedComplaint = {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    createdAt: r.createdAt,
    editedAt: r.editedAt,
    trackingCode: r.trackingCode,
    organization: { id: r.orgId, name: r.orgName },
    department: r.deptId ? { id: r.deptId, name: r.deptName } : null,
    attachmentUrl: r.attachment_path ? `http://localhost:${PORT}${r.attachment_path}` : null,
    document: r.attachment_path ? `http://localhost:${PORT}${r.attachment_path}` : null,
    votes: voteRow?.votes || r.votes || 0,
    user_id: r.userId,
    attachments: r.attachment_path ? [{
      url: `http://localhost:${PORT}${r.attachment_path}`,
      name: r.attachment_path.split('/').pop()
    }] : []
  };

  return res.json({ 
    success: true, 
    message: "Complaint updated successfully",
    complaint: updatedComplaint
  });
}

return res.status(400).json({ success: false, message: "No fields to update" });
  } catch (e) {
    console.error("[update complaint]", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});
// Get edit history for a complaint

app.get("/api/complaints/:id/edits", auth, async (req, res) => {
  try {
    const complaintId = Number(req.params.id);
    
    // Verify user owns the complaint or is org admin
    const [complaint] = await db.query(
      `SELECT user_id, org_id FROM complaints WHERE id = ?`,
      [complaintId]
    );
    
    if (!complaint.length) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }
    
    const isOwner = req.user.role === "user" && req.user.id === complaint[0].user_id;
    const isOrgAdmin = req.user.role === "organization" && req.user.id === complaint[0].org_id;
    
    if (!isOwner && !isOrgAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    const [edits] = await db.query(
      `SELECT 
        e.id,
        e.old_title,
        e.old_description,
        e.new_title,
        e.new_description,
        e.edited_at,
        u.name as edited_by_name
       FROM complaint_edits e
       JOIN users u ON u.id = e.edited_by
       WHERE e.complaint_id = ?
       ORDER BY e.edited_at DESC`,
      [complaintId]
    );
    
    return res.json({ success: true, edits });
  } catch (e) {
    console.error("[edit history error]", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// =======================
//     DASHBOARD FEEDS
// =======================

app.get("/api/departments/overview", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.id,
        o.name AS name,
        COUNT(a.id) AS total,
        SUM(a.status = 'Resolved') AS resolved,
        ROUND(
          CASE WHEN COUNT(a.id) = 0 THEN 0 
               ELSE (SUM(a.status = 'Resolved') / COUNT(a.id)) * 100
          END, 0
        ) AS progress
      FROM organizations o
      LEFT JOIN complaints a ON a.org_id = o.id
      WHERE o.status='active'
      GROUP BY o.id
      ORDER BY o.name ASC
    `);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json([]);
  }
});

app.get("/api/news", (_req, res) => {
  const items = [
    { id: 1, message: "New waste collection trucks deployed in Ward 3 & 4.", date: "2025-10-21" },
    { id: 2, message: "Water supply maintenance on Oct 25, 12AM–2AM.", date: "2025-10-20" },
    { id: 3, message: "Electricity board improved response time by 15%.", date: "2025-10-19" },
  ];
  res.json({ items });
});

async function purgeWithdrawn() {
  try {
    await db.query(
      `
      DELETE FROM complaints 
       WHERE status='Withdrawn'
         AND withdrawnAt IS NOT NULL
         AND withdrawnAt < (NOW() - INTERVAL ? DAY)
      `,
      [WITHDRAW_RETENTION_DAYS]
    );
  } catch (e) {
    console.error("[purgeWithdrawn]", e);
  }
}

setInterval(purgeWithdrawn, 6 * 60 * 60 * 1000);
setTimeout(purgeWithdrawn, 15 * 1000);


//department logo in the profile upload / update:

app.post("/api/organizations/:id/logo", auth, upload.single("logo"), async (req, res) => {
  try {
    const orgId = Number(req.params.id);
    
    if (req.user.role !== "organization" || req.user.id !== orgId) {
      return res.status(403).json({ 
        success: false, 
        message: "Only organization admin can update logo" 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "No file uploaded" 
      });
    }

    // Get current logo to delete old file
    const [org] = await db.query(
      "SELECT logo FROM organizations WHERE id = ?",
      [orgId]
    );

    if (org.length && org[0].logo) {
      const oldLogoPath = path.join(process.cwd(), org[0].logo.replace(/^\//, ''));
      try {
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      } catch (err) {
        console.warn("Failed to delete old logo:", err.message);
      }
    }

    // Save new logo path
    const logoPath = `/uploads/${req.file.filename}`;
    
    await db.query(
      "UPDATE organizations SET logo = ? WHERE id = ?",
      [logoPath, orgId]
    );

    const logoUrl = `${req.protocol}://${req.get("host")}${logoPath}`;

    return res.json({
      success: true,
      message: "Logo updated successfully",
      logoUrl
    });

  } catch (e) {
    console.error("[logo upload error]", e);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

//==============================
//       new stuff 
//==============================

// ──────────────────────────────────────────────────────────────────────
//  1. Delete department (complaints stay, department_id → NULL)
app.delete("/api/organizations/:slug/departments/:deptId", auth, async (req, res) => {
  const org = await findOrgBySlug(req.params.slug);
  if (!org || req.user.role !== "organization" || req.user.id !== org.id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  const deptId = Number(req.params.deptId);
  await db.query("UPDATE complaints SET department_id = NULL WHERE department_id = ?", [deptId]);
  await db.query("DELETE FROM departments WHERE id = ?", [deptId]);
  res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────
//  2. Ban user (org admin only)
app.post("/api/organizations/:slug/members/:userId/ban", auth, async (req, res) => {
  const org = await findOrgBySlug(req.params.slug);
  if (!org || req.user.role !== "organization" || req.user.id !== org.id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  const userId = Number(req.params.userId);
  await db.query("DELETE FROM user_organizations WHERE user_id = ? AND org_id = ?", [userId, org.id]);
  await db.query("INSERT INTO banned_users (user_id, banned_by_org) VALUES (?, ?)", [userId, org.id]);
  res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────
//  3. Prevent re-registration of banned users
app.post("/api/register/user", async (req, res) => {
  // … existing code …
  const [banned] = await db.query("SELECT 1 FROM banned_users WHERE user_id = ?", [userId]);
  if (banned.length) return res.status(403).json({ success: false, message: "You are banned from this organization" });
  // … continue …
});

// ──────────────────────────────────────────────────────────────────────
//  4. Organization notifications (new table already exists)
app.get("/api/notifications/organization", auth, async (req, res) => {
  if (req.user.role !== "organization") return res.status(403).json({ success: false });
  const [rows] = await db.query(
    `SELECT id, message, createdAt, read_at FROM notifications WHERE org_id = ? ORDER BY createdAt DESC`,
    [req.user.id]
  );
  res.json({ items: rows });
});

app.post("/api/notifications/:id/read", auth, async (req, res) => {
  await db.query("UPDATE notifications SET read_at = NOW() WHERE id = ? AND (user_id = ? OR org_id = ?)", [req.params.id, req.user.id, req.user.id]);
  res.json({ success: true });
});

// =======================
//  USER NOTIFICATIONS
// =======================

// Get user notifications
app.get("/api/notifications/user", auth, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only users can access this endpoint" });
    }

    const [rows] = await db.query(
      `SELECT id, message, type, createdAt, read_at, org_id, complaints_id
       FROM notifications 
       WHERE user_id = ? 
       ORDER BY createdAt DESC 
       LIMIT 50`,
      [req.user.id]
    );

    return res.json({ success: true, items: rows });
  } catch (e) {
    console.error("[user notifications error]", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Mark notification as read (works for both users and organizations)
// This already exists in your code but here's the complete version:
app.post("/api/notifications/:id/read", auth, async (req, res) => {
  try {
    const notifId = Number(req.params.id);
    if (!notifId) {
      return res.status(400).json({ success: false, message: "Invalid notification ID" });
    }

    // Check if the notification belongs to this user or organization
    const [notifRows] = await db.query(
      `SELECT id, user_id, org_id FROM notifications WHERE id = ?`,
      [notifId]
    );

    if (!notifRows.length) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    const notif = notifRows[0];
    
    // Check permission
    const hasAccess = 
      (req.user.role === "user" && notif.user_id === req.user.id) ||
      (req.user.role === "organization" && notif.org_id === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Mark as read
    await db.query(
      `UPDATE notifications SET read_at = NOW() WHERE id = ?`,
      [notifId]
    );

    return res.json({ success: true, message: "Notification marked as read" });
  } catch (e) {
    console.error("[mark notification read error]", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Optional: Get unread count (useful for badge display)
app.get("/api/notifications/unread-count", auth, async (req, res) => {
  try {
    let query, params;
    
    if (req.user.role === "user") {
      query = `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL`;
      params = [req.user.id];
    } else if (req.user.role === "organization") {
      query = `SELECT COUNT(*) AS count FROM notifications WHERE org_id = ? AND read_at IS NULL`;
      params = [req.user.id];
    } else {
      return res.json({ success: true, count: 0 });
    }

    const [[result]] = await db.query(query, params);
    return res.json({ success: true, count: result?.count || 0 });
  } catch (e) {
    console.error("[unread count error]", e);
    return res.status(500).json({ success: false, count: 0 });
  }
});
// =======================
//        ROOT & 404
// =======================
app.get("/", (_req, res) =>
  res.send("Server running - Public Allegations Portal with /api routes active")
);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);