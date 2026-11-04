const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createHash, randomBytes } = require('node:crypto');
const { db, run, get, all } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware Auth - Strict Enterprise Verification (No bypass)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak. Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Sesi login telah kedaluwarsa atau tidak valid. Silakan login kembali.' });
    }
    req.user = user;
    next();
  });
}

// Middleware Role-Based Authorization
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Tidak terotentikasi.' });
    }
    if (req.user.role === 'admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: `Akses ditolak. Peran "${req.user.role}" tidak memiliki wewenang untuk tindakan ini.` });
  };
}

// ==========================================
// DATA SCOPE (CAKUPAN DATA BERDASARKAN KEWENANGAN AKUN)
// Sumber kebenaran penugasan:
//   - Mentor  -> age_cohorts.mentor_id (Wali Kelompok Usia). Anak & program mengikuti kelompoknya.
//   - Tutor   -> programs.tutor_id. Anak = anak di kelompok program yang diajarnya.
//   - Koordinator, Komisi Pengawas, PF Compassion, Admin -> seluruh data PPA.
// ==========================================
const FULL_SCOPE_ROLES = ['admin', 'koordinator_ppa', 'komisi_pengawas', 'compassion_pusat'];

function ph(ids) {
  return ids.map(() => '?').join(',');
}

async function buildScope(userId) {
  const user = await get(`SELECT id, role, full_name, is_active FROM users WHERE id = ?`, [userId]);
  if (!user || user.is_active === 0) return null;

  if (FULL_SCOPE_ROLES.includes(user.role)) {
    return { all: true, role: user.role, userId: user.id, cohortIds: [], programIds: [], childIds: [] };
  }

  let cohortIds = [];
  let programIds = [];

  if (user.role === 'mentor') {
    cohortIds = (await all(`SELECT id FROM age_cohorts WHERE mentor_id = ?`, [user.id])).map(r => r.id);
    if (cohortIds.length) {
      // Program yang terhubung ke kelompok mentor via program_cohorts ATAU legacy cohort_id
      programIds = (await all(`
        SELECT DISTINCT p.id FROM programs p
        LEFT JOIN program_cohorts pc ON pc.program_id = p.id
        WHERE p.cohort_id IN (${ph(cohortIds)}) OR pc.cohort_id IN (${ph(cohortIds)})
      `, [...cohortIds, ...cohortIds])).map(r => r.id);
    }
  } else if (user.role === 'tutor') {
    const progs = await all(`SELECT id FROM programs WHERE tutor_id = ?`, [user.id]);
    programIds = progs.map(r => r.id);
    // Ambil semua cohort yang terhubung ke program tutor via program_cohorts
    if (programIds.length) {
      cohortIds = (await all(`
        SELECT DISTINCT cohort_id FROM program_cohorts WHERE program_id IN (${ph(programIds)})
      `, programIds)).map(r => r.cohort_id);
    }
  }

  let childIds = [];
  if (programIds.length) {
    // Gabungkan: anak yang enrolled di program ATAU anak di cohort (fallback)
    const enrolledIds = (await all(`
      SELECT DISTINCT child_id FROM program_enrollments WHERE program_id IN (${ph(programIds)})
    `, programIds)).map(r => r.child_id);
    if (cohortIds.length) {
      const cohortChildIds = (await all(`SELECT id FROM children WHERE cohort_id IN (${ph(cohortIds)})`, cohortIds)).map(r => r.id);
      childIds = [...new Set([...enrolledIds, ...cohortChildIds])];
    } else {
      childIds = enrolledIds;
    }
  } else if (cohortIds.length) {
    childIds = (await all(`SELECT id FROM children WHERE cohort_id IN (${ph(cohortIds)})`, cohortIds)).map(r => r.id);
  }

  return { all: false, role: user.role, userId: user.id, cohortIds, programIds, childIds };
}

// Tambahkan klausa "AND kolom IN (...)" ke query bila akun memiliki cakupan terbatas.
function scopeFilter(scope, column, key, params) {
  if (!scope || scope.all) return '';
  const ids = scope[key] || [];
  if (!ids.length) return ' AND 1=0';
  params.push(...ids);
  return ` AND ${column} IN (${ph(ids)})`;
}

function inScope(scope, key, id) {
  if (!scope) return false;
  if (scope.all) return true;
  return (scope[key] || []).map(Number).includes(Number(id));
}

// Middleware: wajib login + hitung cakupan data akun aktif
function withScope(req, res, next) {
  authenticateToken(req, res, async () => {
    try {
      const scope = await buildScope(req.user.id);
      if (!scope) {
        return res.status(403).json({ error: 'Akun tidak aktif atau tidak ditemukan. Silakan hubungi Koordinator PPA.' });
      }
      req.scope = scope;
      req.user.role = scope.role; // selalu gunakan peran terkini dari database
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

function denyOutOfScope(res, what = 'data ini') {
  return res.status(403).json({ error: `Akses ditolak. ${what} berada di luar cakupan tugas akun Anda.` });
}

// ==========================================
// 1. AUTHENTICATION & SESSION
// ==========================================
// Pembatasan percobaan login (anti brute-force): 8 gagal per (IP + username) -> kunci 10 menit
const LOGIN_MAX_FAILS = 8;
const LOGIN_LOCK_MS = 10 * 60 * 1000;
const loginFailures = new Map();
function loginKey(req, username) {
  return `${req.ip}|${String(username || '').toLowerCase()}`;
}
function isLoginLocked(req, username) {
  const rec = loginFailures.get(loginKey(req, username));
  if (!rec || rec.count < LOGIN_MAX_FAILS) return 0;
  const remain = rec.last + LOGIN_LOCK_MS - Date.now();
  if (remain <= 0) { loginFailures.delete(loginKey(req, username)); return 0; }
  return Math.ceil(remain / 60000);
}
function registerLoginFailure(req, username) {
  const k = loginKey(req, username);
  const rec = loginFailures.get(k) || { count: 0, last: 0 };
  rec.count += 1;
  rec.last = Date.now();
  loginFailures.set(k, rec);
}
function clearLoginFailures(req, username) {
  loginFailures.delete(loginKey(req, username));
}
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const lock = isLoginLocked(req, username);
    if (lock) {
      return res.status(429).json({ error: `Terlalu banyak percobaan login gagal. Coba lagi dalam ${lock} menit.` });
    }

    const user = await get(`
      SELECT u.*, p.name as ppa_name, p.code as ppa_code, p.church_name
      FROM users u
      LEFT JOIN ppa_profiles p ON u.ppa_id = p.id
      WHERE u.username = ?
    `, [username]);

    if (!user) {
      registerLoginFailure(req, username);
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    if (user.is_active === 0) {
      return res.status(403).json({ error: 'Akun ini berstatus NON-AKTIF. Hak akses login telah dicabut oleh Koordinator PPA. Hubungi Koordinator PPA untuk mengaktifkan kembali.' });
    }

    let isMatch = false;
    try {
      isMatch = bcrypt.compareSync(password, user.password_hash);
    } catch (e) {
      isMatch = false;
    }

    if (!isMatch) {
      registerLoginFailure(req, username);
      return res.status(401).json({ error: 'Username atau password salah.' });
    }
    clearLoginFailures(req, username);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, ppa_id: user.ppa_id, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        title: user.title,
        phone: user.phone,
        photo_url: user.photo_url,
        ppa_id: user.ppa_id,
        ppa_name: user.ppa_name,
        ppa_code: user.ppa_code,
        church_name: user.church_name
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await get(`
      SELECT u.id, u.username, u.full_name, u.role, u.title, u.phone, u.photo_url, u.ppa_id,
             p.name as ppa_name, p.code as ppa_code, p.church_name
      FROM users u
      LEFT JOIN ppa_profiles p ON u.ppa_id = p.id
      WHERE u.id = ?
    `, [req.user.id]);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 1.1 SELF-SERVICE USER PROFILE & CREDENTIAL CRUD (SEMUA PERAN PENGGUNA)
// ==========================================
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await get(`
      SELECT u.id, u.username, u.full_name, u.role, u.title, u.phone, u.email,
             u.specialization, u.photo_url, u.assigned_cohort_id, u.ppa_id, u.created_at,
             p.name as ppa_name, p.code as ppa_code, p.church_name
      FROM users u
      LEFT JOIN ppa_profiles p ON u.ppa_id = p.id
      WHERE u.id = ?
    `, [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    // Ambil kelompok usia yang dimentori oleh pengguna ini
    const mentoredCohorts = await all(`
      SELECT id, code, name, age_range
      FROM age_cohorts
      WHERE mentor_id = ?
      ORDER BY code ASC
    `, [user.id]);

    // Ambil program vokasi / materi yang diajar oleh pengguna ini
    const tutoredPrograms = await all(`
      SELECT p.id, p.name, p.pillar, p.execution_type, c.name as cohort_name, c.code as cohort_code
      FROM programs p
      LEFT JOIN age_cohorts c ON p.cohort_id = c.id
      WHERE p.tutor_id = ?
      ORDER BY p.name ASC
    `, [user.id]);

    res.json({
      ...user,
      mentored_cohorts: mentoredCohorts,
      tutored_programs: tutoredPrograms
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const {
      full_name,
      title,
      phone,
      email,
      specialization,
      photo_url,
      username,
      current_password,
      new_password
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
    }

    const currentUser = await get(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    if (!currentUser) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const trimmedUsername = username ? username.trim() : currentUser.username;
    if (!trimmedUsername) {
      return res.status(400).json({ error: 'Username / Nama Pengguna tidak boleh kosong.' });
    }

    // Jika username diubah, validasi format dan pastikan belum dipakai oleh akun lain
    const isChangingUsername = trimmedUsername.toLowerCase() !== currentUser.username.toLowerCase();
    if (isChangingUsername) {
      if (trimmedUsername.length < 3) {
        return res.status(400).json({ error: 'Username minimal 3 karakter.' });
      }
      const existingUser = await get(`SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?`, [trimmedUsername, currentUser.id]);
      if (existingUser) {
        return res.status(409).json({ error: `Username "${trimmedUsername}" sudah dipakai oleh pengguna lain. Silakan pilih username lain.` });
      }
    }

    // Jika ingin mengubah username ATAU password, wajib verifikasi password saat ini
    const isChangingPassword = Boolean(new_password && new_password.trim());
    let newPasswordHash = currentUser.password_hash;

    if (isChangingPassword || isChangingUsername) {
      if (!current_password) {
        return res.status(400).json({ error: 'Password saat ini wajib diisi untuk mengonfirmasi perubahan username atau password.' });
      }
      const isMatch = bcrypt.compareSync(current_password, currentUser.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Password saat ini tidak sesuai. Konfirmasi keamanan gagal.' });
      }
    }

    if (isChangingPassword) {
      if (new_password.length < 8) {
        return res.status(400).json({ error: 'Password baru minimal 8 karakter.' });
      }
      if (new_password === current_password) {
        return res.status(400).json({ error: 'Password baru harus berbeda dari password lama.' });
      }
      newPasswordHash = bcrypt.hashSync(new_password, bcrypt.genSaltSync(10));
    }

    await run(`
      UPDATE users
      SET full_name = ?,
          title = ?,
          phone = ?,
          email = ?,
          specialization = ?,
          photo_url = ?,
          username = ?,
          password_hash = ?
      WHERE id = ?
    `, [
      full_name.trim(),
      title ? title.trim() : null,
      phone ? phone.trim() : null,
      email ? email.trim() : null,
      specialization ? specialization.trim() : null,
      photo_url || null,
      trimmedUsername,
      newPasswordHash,
      currentUser.id
    ]);

    // Ambil profil yang baru diperbarui
    const updatedUser = await get(`
      SELECT u.id, u.username, u.full_name, u.role, u.title, u.phone, u.email,
             u.specialization, u.photo_url, u.assigned_cohort_id, u.ppa_id,
             p.name as ppa_name, p.code as ppa_code, p.church_name
      FROM users u
      LEFT JOIN ppa_profiles p ON u.ppa_id = p.id
      WHERE u.id = ?
    `, [currentUser.id]);

    // Terbitkan token baru dengan username dan nama terupdate
    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        full_name: updatedUser.full_name,
        ppa_id: updatedUser.ppa_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Profil dan kredensial akun Anda berhasil diperbarui!',
      user: updatedUser,
      token: newToken
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. MASTER PROFIL PPA (DYNAMIC PARAMETER - PILIHAN MULTI-PPA SELURUH INDONESIA)
// ==========================================
// Ganti password mandiri (semua peran)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Password lama dan password baru wajib diisi.' });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ error: 'Password baru minimal 8 karakter.' });
    }
    if (new_password === current_password) {
      return res.status(400).json({ error: 'Password baru harus berbeda dari password lama.' });
    }
    const user = await get(`SELECT id, password_hash FROM users WHERE id = ?`, [req.user.id]);
    if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(401).json({ error: 'Password lama tidak sesuai.' });
    }
    await run(`UPDATE users SET password_hash = ? WHERE id = ?`, [bcrypt.hashSync(new_password, bcrypt.genSaltSync(10)), user.id]);
    res.json({ message: 'Password berhasil diganti. Gunakan password baru pada login berikutnya.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backup database (Admin & Koordinator PPA) - unduh salinan file SQLite
app.get('/api/admin/backup', withScope, requireRole(['koordinator_ppa']), (req, res) => {
  const stamp = new Date().toISOString().slice(0, 10);
  res.download(path.join(__dirname, 'pathway_ppa.sqlite'), `pathway_ppa_backup_${stamp}.sqlite`);
});

app.get('/api/ppas', async (req, res) => {
  try {
    const ppas = await all(`SELECT * FROM ppa_profiles ORDER BY id ASC`);
    res.json(ppas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ppas/:id', async (req, res) => {
  try {
    const ppa = await get(`SELECT * FROM ppa_profiles WHERE id = ?`, [req.params.id]);
    if (!ppa) return res.status(404).json({ error: 'PPA tidak ditemukan.' });
    res.json(ppa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ppas', withScope, requireRole(['koordinator_ppa']), async (req, res) => {
  try {
    const {
      code, name, church_name, church_district, church_membership, address, city, postal_code, phone, email,
      partnership_head_name, partnership_head_title, coordinator_name, coordinator_title,
      district_head_name, district_secretary_name, district_phone,
      church_logo_url, ppa_logo_url, stamp_url
    } = req.body;

    const result = await run(`
      INSERT INTO ppa_profiles (
        code, name, church_name, church_district, church_membership, address, city, postal_code, phone, email,
        partnership_head_name, partnership_head_title, coordinator_name, coordinator_title,
        district_head_name, district_secretary_name, district_phone,
        church_logo_url, ppa_logo_url, stamp_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code, name, church_name, church_district, church_membership || 'ANGGOTA PGI', address, city, postal_code, phone, email,
      partnership_head_name, partnership_head_title, coordinator_name, coordinator_title,
      district_head_name, district_secretary_name, district_phone,
      church_logo_url || '/assets/logo_gnkp_indonesia.png',
      ppa_logo_url || '/assets/logo_ppa_agape.png',
      stamp_url || '/assets/stempel_ppa_agape.png'
    ]);

    const created = await get(`SELECT * FROM ppa_profiles WHERE id = ?`, [result.id]);
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ppas/:id', withScope, requireRole(['koordinator_ppa']), async (req, res) => {
  try {
    const {
      code, name, church_name, church_district, church_membership, address, city, postal_code, phone, email,
      partnership_head_name, partnership_head_title, coordinator_name, coordinator_title,
      district_head_name, district_secretary_name, district_phone,
      church_logo_url, ppa_logo_url, stamp_url
    } = req.body;

    await run(`
      UPDATE ppa_profiles SET
        code = ?, name = ?, church_name = ?, church_district = ?, church_membership = ?,
        address = ?, city = ?, postal_code = ?, phone = ?, email = ?,
        partnership_head_name = ?, partnership_head_title = ?,
        coordinator_name = ?, coordinator_title = ?,
        district_head_name = ?, district_secretary_name = ?, district_phone = ?,
        church_logo_url = ?, ppa_logo_url = ?, stamp_url = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      code, name, church_name, church_district, church_membership || 'ANGGOTA PGI',
      address, city, postal_code, phone, email,
      partnership_head_name, partnership_head_title,
      coordinator_name, coordinator_title,
      district_head_name, district_secretary_name, district_phone,
      church_logo_url, ppa_logo_url, stamp_url,
      req.params.id
    ]);

    const updated = await get(`SELECT * FROM ppa_profiles WHERE id = ?`, [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ppas/:id', withScope, requireRole(['koordinator_ppa']), async (req, res) => {
  try {
    const count = await get(`SELECT COUNT(*) as c FROM ppa_profiles`);
    if (count.c <= 1) {
      return res.status(400).json({ error: 'Tidak dapat menghapus satu-satunya profil PPA yang terdaftar.' });
    }
    await run(`DELETE FROM ppa_profiles WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Profil PPA berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profile', async (req, res) => {
  try {
    const targetId = req.query.id || req.query.ppa_id;
    let profile;
    if (targetId) {
      profile = await get(`SELECT * FROM ppa_profiles WHERE id = ?`, [targetId]);
    }
    if (!profile) {
      profile = await get(`SELECT * FROM ppa_profiles ORDER BY id ASC LIMIT 1`);
    }
    res.json(profile || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. TAHUN FISKAL & SEMESTER
// ==========================================
app.get('/api/fiscal-years', async (req, res) => {
  try {
    const years = await all(`SELECT * FROM fiscal_years ORDER BY id DESC`);
    const semesters = await all(`SELECT * FROM semesters ORDER BY id ASC`);
    res.json({ years, semesters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. USERS & STAFF MANAGEMENT (MENTOR, TUTOR, PENGAWAS)
// ==========================================
app.get('/api/users', withScope, requireRole(['koordinator_ppa']), async (req, res) => {
  try {
    const users = await all(`SELECT id, username, full_name, role, title, phone, email, specialization, photo_url, assigned_cohort_id, is_active FROM users ORDER BY id ASC`);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full Staff Management API (Pelayan PPA: Mentor, Tutor, Pengawas)
app.get('/api/staff', withScope, async (req, res) => {
  try {
    const { ppa_id, role } = req.query;
    const canViewContacts = ['admin', 'koordinator_ppa'].includes(req.user.role);
    let sql = `
      SELECT u.id, u.ppa_id, u.username, u.full_name, u.role, u.title, ${canViewContacts ? 'u.phone, u.email' : 'NULL AS phone, NULL AS email'},
             u.assigned_cohort_id, u.specialization, u.photo_url, u.is_active, u.created_at,
             COALESCE((SELECT GROUP_CONCAT(ac.name, ' & ') FROM age_cohorts ac WHERE ac.mentor_id = u.id), c.name) as cohort_name,
             COALESCE((SELECT GROUP_CONCAT(ac.code, ', ') FROM age_cohorts ac WHERE ac.mentor_id = u.id), c.code) as cohort_code,
             (SELECT GROUP_CONCAT(ac.id, ',') FROM age_cohorts ac WHERE ac.mentor_id = u.id) as cohort_ids,
             p.name as ppa_name, p.code as ppa_code
      FROM users u
      LEFT JOIN age_cohorts c ON u.assigned_cohort_id = c.id
      LEFT JOIN ppa_profiles p ON u.ppa_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (ppa_id) {
      sql += ` AND (u.ppa_id = ? OR u.ppa_id IS NULL)`;
      params.push(ppa_id);
    }
    if (role) {
      sql += ` AND u.role = ?`;
      params.push(role);
    }
    sql += ` ORDER BY CASE 
              WHEN u.role = 'koordinator_ppa' THEN 1 
              WHEN u.role = 'komisi_pengawas' THEN 2 
              WHEN u.role = 'mentor' THEN 3 
              WHEN u.role = 'tutor' THEN 4 
              ELSE 5 END, u.full_name ASC`;
    const staff = await all(sql, params);
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/staff', withScope, requireRole(['koordinator_ppa']), async (req, res) => {
  try {
    const { ppa_id, full_name, role, title, phone, email, assigned_cohort_id, assigned_cohort_ids, specialization, photo_url, username, password } = req.body;
    if (!full_name || !role || !username) {
      return res.status(400).json({ error: 'Nama Lengkap, Peran, dan Username wajib diisi.' });
    }

    const existing = await get(`SELECT id FROM users WHERE username = ?`, [username]);
    if (existing) {
      return res.status(400).json({ error: `Username "${username}" sudah digunakan. Silakan gunakan username lain.` });
    }

    const salt = bcrypt.genSaltSync(10);
    const pwdToHash = password && password.trim() ? password.trim() : 'password123';
    const password_hash = bcrypt.hashSync(pwdToHash, salt);

    const primaryCohortId = assigned_cohort_id || (Array.isArray(assigned_cohort_ids) && assigned_cohort_ids.length > 0 ? assigned_cohort_ids[0] : null);

    const result = await run(`
      INSERT INTO users (ppa_id, username, password_hash, full_name, role, title, phone, email, assigned_cohort_id, specialization, photo_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      ppa_id || 1, username, password_hash, full_name, role, title || role, phone || '', email || '',
      primaryCohortId, specialization || '', photo_url || null
    ]);

    // Handle multi-cohort assignments for Mentors
    if (role === 'mentor') {
      const ids = assigned_cohort_ids
        ? (Array.isArray(assigned_cohort_ids) ? assigned_cohort_ids : assigned_cohort_ids.toString().split(',').map(x => parseInt(x.trim())).filter(Boolean))
        : (primaryCohortId ? [primaryCohortId] : []);
      
      await run(`UPDATE age_cohorts SET mentor_id = NULL WHERE mentor_id = ?`, [result.id]);
      for (const cid of ids) {
        await run(`UPDATE age_cohorts SET mentor_id = ? WHERE id = ?`, [result.id, cid]);
        await run(`UPDATE programs SET mentor_id = ? WHERE cohort_id = ?`, [result.id, cid]);
      }
    }

    const created = await get(`
      SELECT u.id, u.ppa_id, u.username, u.full_name, u.role, u.title, u.phone, u.email,
             u.assigned_cohort_id, u.specialization, u.photo_url, u.is_active,
             (SELECT GROUP_CONCAT(ac.name, ' & ') FROM age_cohorts ac WHERE ac.mentor_id = u.id) as cohort_name,
             (SELECT GROUP_CONCAT(ac.id, ',') FROM age_cohorts ac WHERE ac.mentor_id = u.id) as cohort_ids
      FROM users u
      WHERE u.id = ?
    `, [result.id]);

    res.json({ staff: created, initialPassword: pwdToHash, message: 'Akun & Biodata Staf berhasil diterbitkan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/staff/:id', withScope, requireRole(['koordinator_ppa']), async (req, res) => {
  try {
    const { full_name, role, title, phone, email, assigned_cohort_id, assigned_cohort_ids, specialization, photo_url, is_active, password } = req.body;
    
    const primaryCohortId = assigned_cohort_id || (Array.isArray(assigned_cohort_ids) && assigned_cohort_ids.length > 0 ? assigned_cohort_ids[0] : null);

    let updates = [
      'full_name = ?', 'role = ?', 'title = ?', 'phone = ?', 'email = ?',
      'assigned_cohort_id = ?', 'specialization = ?', 'photo_url = ?', 'is_active = ?'
    ];
    let params = [
      full_name, role, title, phone || '', email || '',
      primaryCohortId, specialization || '', photo_url || null,
      is_active !== undefined ? is_active : 1
    ];

    if (password && password.trim()) {
      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync(password.trim(), salt);
      updates.push('password_hash = ?');
      params.push(password_hash);
    }

    params.push(req.params.id);
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Handle multi-cohort assignments for Mentors
    if (role === 'mentor') {
      const ids = assigned_cohort_ids
        ? (Array.isArray(assigned_cohort_ids) ? assigned_cohort_ids : assigned_cohort_ids.toString().split(',').map(x => parseInt(x.trim())).filter(Boolean))
        : (primaryCohortId ? [primaryCohortId] : []);
      
      await run(`UPDATE age_cohorts SET mentor_id = NULL WHERE mentor_id = ?`, [req.params.id]);
      for (const cid of ids) {
        await run(`UPDATE age_cohorts SET mentor_id = ? WHERE id = ?`, [req.params.id, cid]);
        // Program di kelompok ini otomatis menjadi tanggung jawab Mentor wali kelompok tsb
        await run(`UPDATE programs SET mentor_id = ? WHERE cohort_id = ?`, [req.params.id, cid]);
      }
    }

    const updated = await get(`
      SELECT u.id, u.ppa_id, u.username, u.full_name, u.role, u.title, u.phone, u.email,
             u.assigned_cohort_id, u.specialization, u.photo_url, u.is_active,
             (SELECT GROUP_CONCAT(ac.name, ' & ') FROM age_cohorts ac WHERE ac.mentor_id = u.id) as cohort_name,
             (SELECT GROUP_CONCAT(ac.id, ',') FROM age_cohorts ac WHERE ac.mentor_id = u.id) as cohort_ids
      FROM users u
      WHERE u.id = ?
    `, [req.params.id]);

    res.json({ staff: updated, message: 'Biodata Staf berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/staff/:id', withScope, requireRole(['koordinator_ppa']), async (req, res) => {
  try {
    const user = await get(`SELECT id, username, full_name, role FROM users WHERE id = ?`, [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Staf tidak ditemukan.' });
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'Akun Administrator Master tidak dapat dihapus.' });
    }

    // Unlink references gracefully without deleting any child, report, or certificate data!
    await run(`UPDATE age_cohorts SET mentor_id = NULL WHERE mentor_id = ?`, [user.id]);
    await run(`UPDATE programs SET tutor_id = NULL WHERE tutor_id = ?`, [user.id]);
    // If user is mentor_id in programs, reassign to admin (id: 1) or first available admin
    const adminUser = await get(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    const fallbackId = adminUser ? adminUser.id : 1;
    await run(`UPDATE programs SET mentor_id = ? WHERE mentor_id = ?`, [fallbackId, user.id]);

    // Perform safe deletion of the user account
    await run(`DELETE FROM users WHERE id = ?`, [user.id]);

    res.json({
      message: `Akun pelayan "${user.full_name}" berhasil dihapus. Seluruh data binaan anak, nilai rapor 4 pilar, sertifikat, dan absensi anak TETAP UTUH & AMAN.`,
      deleted_username: user.username
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Staff Active/Deactive Status (Non-aktifkan akun tanpa menghapus)
app.patch('/api/staff/:id/toggle-status', withScope, requireRole(['koordinator_ppa']), async (req, res) => {
  try {
    const user = await get(`SELECT id, username, full_name, is_active FROM users WHERE id = ?`, [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Staf tidak ditemukan.' });
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'Status Akun Administrator Master tidak dapat dinonaktifkan.' });
    }

    const newStatus = user.is_active === 1 ? 0 : 1;
    await run(`UPDATE users SET is_active = ? WHERE id = ?`, [newStatus, user.id]);

    const statusText = newStatus === 1 ? 'DIAKTIFKAN KEMBALI' : 'DINONAKTIFKAN';
    res.json({
      message: `Akun pelayan "${user.full_name}" berhasil ${statusText}. Hak login ${newStatus === 1 ? 'diberikan' : 'dicabut'}. Seluruh riwayat data anak tetap utuh.`,
      is_active: newStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. KELOMPOK USIA & ANAK PPA
// ==========================================
app.get('/api/cohorts', withScope, async (req, res) => {
  try {
    const { ppa_id } = req.query;
    let sql = `
      SELECT c.*, u.full_name as mentor_name,
        (SELECT COUNT(*) FROM children ch WHERE ch.cohort_id = c.id AND ch.status = 'Aktif') as active_children_count
      FROM age_cohorts c
      LEFT JOIN users u ON c.mentor_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (ppa_id) {
      sql += ` AND c.ppa_id = ?`;
      params.push(ppa_id);
    }
    sql += scopeFilter(req.scope, 'c.id', 'cohortIds', params);
    sql += ` ORDER BY c.id ASC`;
    const cohorts = await all(sql, params);
    res.json(cohorts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD Kelompok Usia (Pembentukan & Manajemen Kelompok - Koordinator & Admin)
app.get('/api/cohorts/:id', withScope, async (req, res) => {
  try {
    const cohort = await get(`
      SELECT c.*, u.full_name as mentor_name,
        (SELECT COUNT(*) FROM children ch WHERE ch.cohort_id = c.id AND ch.status = 'Aktif') as active_children_count
      FROM age_cohorts c
      LEFT JOIN users u ON c.mentor_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);
    if (!cohort) return res.status(404).json({ error: 'Kelompok tidak ditemukan.' });
    res.json(cohort);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cohorts', withScope, requireRole(['koordinator_ppa', 'admin']), async (req, res) => {
  try {
    const { ppa_id, code, name, age_range, mentor_id } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Kode dan Nama Kelompok wajib diisi.' });
    }
    const effectivePpaId = ppa_id || req.user.ppa_id || 1;
    const dupCode = await get(`SELECT id FROM age_cohorts WHERE ppa_id = ? AND UPPER(code) = UPPER(?)`, [effectivePpaId, code.trim()]);
    if (dupCode) {
      return res.status(409).json({ error: `Kode kelompok "${code.trim()}" sudah digunakan. Gunakan kode lain.` });
    }
    const result = await run(`
      INSERT INTO age_cohorts (ppa_id, code, name, age_range, mentor_id)
      VALUES (?, ?, ?, ?, ?)
    `, [effectivePpaId, code.trim(), name.trim(), age_range || '', mentor_id ? parseInt(mentor_id) : null]);

    // Jika mentor ditugaskan, perbarui juga penugasan di users
    if (mentor_id) {
      await run(`UPDATE users SET assigned_cohort_id = ? WHERE id = ? AND assigned_cohort_id IS NULL`, [result.id, mentor_id]);
    }

    const created = await get(`
      SELECT c.*, u.full_name as mentor_name,
        (SELECT COUNT(*) FROM children ch WHERE ch.cohort_id = c.id AND ch.status = 'Aktif') as active_children_count
      FROM age_cohorts c
      LEFT JOIN users u ON c.mentor_id = u.id
      WHERE c.id = ?
    `, [result.id]);

    res.json({ cohort: created, message: `Kelompok baru "${created.name}" berhasil dibentuk.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cohorts/:id', withScope, requireRole(['koordinator_ppa', 'admin']), async (req, res) => {
  try {
    const { code, name, age_range, mentor_id } = req.body;
    const existing = await get(`SELECT * FROM age_cohorts WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Kelompok tidak ditemukan.' });

    if (code) {
      const dupCode = await get(`SELECT id FROM age_cohorts WHERE ppa_id = ? AND UPPER(code) = UPPER(?) AND id <> ?`, [existing.ppa_id, code.trim(), req.params.id]);
      if (dupCode) {
        return res.status(409).json({ error: `Kode kelompok "${code.trim()}" sudah dipakai kelompok lain.` });
      }
    }

    await run(`
      UPDATE age_cohorts SET
        code = COALESCE(?, code),
        name = COALESCE(?, name),
        age_range = COALESCE(?, age_range),
        mentor_id = ?
      WHERE id = ?
    `, [code ? code.trim() : null, name ? name.trim() : null, age_range || existing.age_range, mentor_id ? parseInt(mentor_id) : null, req.params.id]);

    // Jika mentor diubah, sesuaikan penugasan mentor di program kelompok tersebut
    if (mentor_id) {
      await run(`UPDATE programs SET mentor_id = ? WHERE cohort_id = ?`, [mentor_id, req.params.id]);
    }

    const updated = await get(`
      SELECT c.*, u.full_name as mentor_name,
        (SELECT COUNT(*) FROM children ch WHERE ch.cohort_id = c.id AND ch.status = 'Aktif') as active_children_count
      FROM age_cohorts c
      LEFT JOIN users u ON c.mentor_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    res.json({ cohort: updated, message: `Data Kelompok "${updated.name}" berhasil diperbarui.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cohorts/:id', withScope, requireRole(['koordinator_ppa', 'admin']), async (req, res) => {
  try {
    const cohort = await get(`SELECT * FROM age_cohorts WHERE id = ?`, [req.params.id]);
    if (!cohort) return res.status(404).json({ error: 'Kelompok tidak ditemukan.' });

    // Cek apakah masih ada anak binaan terdaftar
    const childCount = await get(`SELECT COUNT(*) as c FROM children WHERE cohort_id = ?`, [req.params.id]);
    if (childCount && childCount.c > 0) {
      return res.status(400).json({
        error: `Tidak dapat menghapus "${cohort.name}" karena masih ada ${childCount.c} anak binaan terdaftar di kelompok ini. Pindahkan atau ubah kelompok anak terlebih dahulu.`
      });
    }

    // Cek apakah ada program kegiatan yang tertaut (baik via cohort_id maupun program_cohorts)
    const progCount = await get(`
      SELECT COUNT(DISTINCT p.id) as c FROM programs p
      LEFT JOIN program_cohorts pc ON pc.program_id = p.id
      WHERE p.cohort_id = ? OR pc.cohort_id = ?
    `, [req.params.id, req.params.id]);
    if (progCount && progCount.c > 0) {
      return res.status(400).json({
        error: `Tidak dapat menghapus "${cohort.name}" karena terdapat ${progCount.c} program kegiatan yang terhubung dengan kelompok ini.`
      });
    }

    await run(`DELETE FROM age_cohorts WHERE id = ?`, [req.params.id]);
    res.json({ message: `Kelompok "${cohort.name}" berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/children', withScope, async (req, res) => {
  try {
    const { cohort_id, mentor_id, status, ppa_id, gender, search } = req.query;
    let sql = `
      SELECT ch.*, c.name as cohort_name, c.code as cohort_code, c.mentor_id,
             u.full_name as mentor_name
      FROM children ch
      JOIN age_cohorts c ON ch.cohort_id = c.id
      LEFT JOIN users u ON c.mentor_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (ppa_id) {
      sql += ` AND ch.ppa_id = ?`;
      params.push(ppa_id);
    }
    if (cohort_id) {
      sql += ` AND ch.cohort_id = ?`;
      params.push(cohort_id);
    }
    if (mentor_id) {
      sql += ` AND c.mentor_id = ?`;
      params.push(mentor_id);
    }
    if (gender) {
      sql += ` AND ch.gender = ?`;
      params.push(gender);
    }
    if (status) {
      sql += ` AND ch.status = ?`;
      params.push(status);
    }
    if (search && search.trim()) {
      sql += ` AND (ch.full_name LIKE ? OR ch.nickname LIKE ? OR ch.child_id_compassion LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }
    sql += scopeFilter(req.scope, 'ch.id', 'childIds', params);
    sql += ` ORDER BY ch.full_name ASC`;
    const children = await all(sql, params);
    res.json(children);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/children', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    const {
      ppa_id, cohort_id, child_id_compassion, full_name, nickname, gender,
      birth_place, birth_date, father_name, mother_name, parent_name, parent_phone,
      home_address, school_name, school_grade, hobby, dream_ambition, photo_data, status, notes
    } = req.body;

    if (!req.scope.all && !inScope(req.scope, 'cohortIds', cohort_id)) {
      return denyOutOfScope(res, 'Kelompok usia yang dipilih');
    }

    const result = await run(`
      INSERT INTO children (
        ppa_id, cohort_id, child_id_compassion, full_name, nickname, gender,
        birth_place, birth_date, father_name, mother_name, parent_name, parent_phone,
        home_address, school_name, school_grade, hobby, dream_ambition, photo_data, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ppa_id || 1, cohort_id, child_id_compassion, full_name, nickname, gender,
      birth_place || 'Gunungsitoli', birth_date, father_name || '', mother_name || '', parent_name || '', parent_phone || '',
      home_address || '', school_name || '', school_grade || '', hobby || '', dream_ambition || '', photo_data || null,
      status || 'Aktif', notes || ''
    ]);

    res.json({ id: result.id, message: 'Biodata & foto anak berhasil didaftarkan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/children/:id', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    const {
      cohort_id, child_id_compassion, full_name, nickname, gender,
      birth_place, birth_date, father_name, mother_name, parent_name, parent_phone,
      home_address, school_name, school_grade, hobby, dream_ambition, photo_data, status, notes
    } = req.body;

    if (!inScope(req.scope, 'childIds', req.params.id)) {
      return denyOutOfScope(res, 'Data anak ini');
    }
    if (!req.scope.all && !inScope(req.scope, 'cohortIds', cohort_id)) {
      return denyOutOfScope(res, 'Pemindahan anak ke kelompok tersebut');
    }

    let sql = `
      UPDATE children SET
        cohort_id = ?, child_id_compassion = ?, full_name = ?, nickname = ?, gender = ?,
        birth_place = ?, birth_date = ?, father_name = ?, mother_name = ?, parent_name = ?, parent_phone = ?,
        home_address = ?, school_name = ?, school_grade = ?, hobby = ?, dream_ambition = ?,
        status = ?, notes = ?
    `;
    let params = [
      cohort_id, child_id_compassion, full_name, nickname, gender,
      birth_place, birth_date, father_name, mother_name, parent_name, parent_phone,
      home_address, school_name, school_grade, hobby, dream_ambition,
      status, notes || ''
    ];

    if (photo_data) {
      sql += `, photo_data = ?`;
      params.push(photo_data);
    }

    sql += ` WHERE id = ?`;
    params.push(req.params.id);

    await run(sql, params);
    res.json({ message: 'Biodata & foto anak berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/children/:id', withScope, requireRole(['koordinator_ppa']), async (req, res) => {
  try {
    await run(`DELETE FROM children WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Data anak berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full Child Lifecycle Journey API (Insert -> Berproses -> Exit)
app.get('/api/children/:id/journey', withScope, async (req, res) => {
  try {
    const childId = req.params.id;
    if (!inScope(req.scope, 'childIds', childId)) {
      return denyOutOfScope(res, 'Portofolio anak ini');
    }

    // 1. Core Profile & Cohort (Tahap Insert)
    const child = await get(`
      SELECT ch.*, c.name as cohort_name, c.code as cohort_code, c.age_range,
             prof.name as ppa_name, prof.code as ppa_code, prof.church_name,
             prof.coordinator_name, prof.partnership_head_name
      FROM children ch
      JOIN age_cohorts c ON ch.cohort_id = c.id
      JOIN ppa_profiles prof ON ch.ppa_id = prof.id
      WHERE ch.id = ?
    `, [childId]);

    if (!child) {
      return res.status(404).json({ error: 'Data anak tidak ditemukan.' });
    }

    // 2. Health, PMT & Gross Motorik (Tahap Berproses - Fisik & Gizi)
    const health = await all(`
      SELECT * FROM health_nutrition_records
      WHERE child_id = ?
      ORDER BY check_date DESC
    `, [childId]);

    // 3. Programs & Modules attended (Tahap Berproses - Kognitif, Vokasi, Rohani)
    const journeyProgParams = [childId, childId];
    const journeyProgScope = scopeFilter(req.scope, 'p.id', 'programIds', journeyProgParams);
    const programs = await all(`
      SELECT p.*,
             m.full_name as mentor_name,
             t.full_name as tutor_name,
             te.final_tutor_score, te.qualitative_narrative as tutor_notes, te.is_passed,
             me.final_mentor_score, me.mentor_reflection_narrative as mentor_notes
      FROM programs p
      JOIN users m ON p.mentor_id = m.id
      LEFT JOIN users t ON p.tutor_id = t.id
      LEFT JOIN tutor_evaluations te ON (te.program_id = p.id AND te.child_id = ?)
      LEFT JOIN mentor_evaluations me ON (me.program_id = p.id AND me.child_id = ?)
      WHERE p.id IN (SELECT pe.program_id FROM program_enrollments pe WHERE pe.child_id = ${childId})${journeyProgScope}
      ORDER BY p.id ASC
    `, journeyProgParams);

    // 4. Semester Reports 4 Pillars (Tahap Berproses - Evaluasi Berkala)
    const reports = await all(`
      SELECT sr.*, s.name as semester_name
      FROM semester_reports sr
      JOIN semesters s ON sr.semester_id = s.id
      WHERE sr.child_id = ?
      ORDER BY sr.id DESC
    `, [childId]);

    // 5. Activity Certificates (Tahap Berproses - Pencapaian Keterampilan)
    const certificates = await all(`
      SELECT ac.*, p.name as program_name, p.pillar
      FROM activity_certificates ac
      JOIN programs p ON ac.program_id = p.id
      WHERE ac.child_id = ?
      ORDER BY ac.id DESC
    `, [childId]);

    // 6. Exit Portfolio & Graduation (Tahap Exit - Purna Asuh & Kemandirian)
    const exitPortfolio = await get(`
      SELECT * FROM exit_portfolios
      WHERE child_id = ?
    `, [childId]);

    res.json({
      child,
      health,
      programs,
      reports,
      certificates,
      exitPortfolio
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. PROGRAM & KEGIATAN (INISIASI MENTOR)
// ==========================================
app.get('/api/programs', withScope, async (req, res) => {
  try {
    const { cohort_id, semester_id, execution_type, ppa_id } = req.query;
    let sql = `
      SELECT p.*,
             m.full_name as mentor_name,
             t.full_name as tutor_name,
             COALESCE(
               (SELECT GROUP_CONCAT(c2.name, ', ') FROM program_cohorts pc2 JOIN age_cohorts c2 ON pc2.cohort_id = c2.id WHERE pc2.program_id = p.id),
               c.name
             ) as cohort_name,
             COALESCE(
               (SELECT GROUP_CONCAT(c3.id, ',') FROM program_cohorts pc3 JOIN age_cohorts c3 ON pc3.cohort_id = c3.id WHERE pc3.program_id = p.id),
               CAST(p.cohort_id AS TEXT)
             ) as cohort_ids_str,
             s.name as semester_name,
             (SELECT COUNT(*) FROM lesson_plans lp WHERE lp.program_id = p.id) as lesson_plan_count,
             (SELECT COUNT(*) FROM schedules sc WHERE sc.program_id = p.id) as schedule_count,
             (SELECT COUNT(*) FROM program_enrollments pe WHERE pe.program_id = p.id AND pe.status = 'Aktif') as enrolled_count
      FROM programs p
      JOIN users m ON p.mentor_id = m.id
      LEFT JOIN users t ON p.tutor_id = t.id
      LEFT JOIN age_cohorts c ON p.cohort_id = c.id
      JOIN semesters s ON p.semester_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (ppa_id) {
      sql += ` AND p.ppa_id = ?`;
      params.push(ppa_id);
    }
    if (cohort_id) {
      sql += ` AND (p.cohort_id = ? OR p.id IN (SELECT pc.program_id FROM program_cohorts pc WHERE pc.cohort_id = ?))`;
      params.push(cohort_id, cohort_id);
    }
    if (semester_id) {
      sql += ` AND p.semester_id = ?`;
      params.push(semester_id);
    }
    if (execution_type) {
      sql += ` AND p.execution_type = ?`;
      params.push(execution_type);
    }
    sql += scopeFilter(req.scope, 'p.id', 'programIds', params);
    sql += ` ORDER BY p.id ASC`;
    const programs = await all(sql, params);

    for (const prog of programs) {
      prog.lesson_plans = await all(`
        SELECT lp.id, lp.session_number, lp.topic, lp.competency_goal, lp.success_indicator,
               sc.meeting_date, sc.start_time, sc.end_time, sc.room_location
        FROM lesson_plans lp
        LEFT JOIN schedules sc ON sc.program_id = lp.program_id AND sc.session_number = lp.session_number
        WHERE lp.program_id = ?
        ORDER BY lp.session_number ASC
      `, [prog.id]);
    }

    res.json(programs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint untuk Rekam Fisik & Gizi (PMT & Antropometri)
app.get('/api/health-records', withScope, async (req, res) => {
  try {
    const { ppa_id } = req.query;
    let sql = `
      SELECT h.*, ch.full_name as child_name, ch.child_id_compassion, c.name as cohort_name
      FROM health_nutrition_records h
      JOIN children ch ON h.child_id = ch.id
      JOIN age_cohorts c ON ch.cohort_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (ppa_id) {
      sql += ` AND ch.ppa_id = ?`;
      params.push(ppa_id);
    }
    sql += scopeFilter(req.scope, 'h.child_id', 'childIds', params);
    sql += ` ORDER BY h.id DESC`;
    const records = await all(sql, params);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/programs', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    const {
      ppa_id, semester_id, cohort_id, cohort_ids, mentor_id, tutor_id, execution_type,
      pillar, name, duration_months, target_sessions,
      background, qualitative_objective, measurable_target, min_passing_score, pmt_menu_details
    } = req.body;

    // Tentukan cohort_ids: bisa dari array cohort_ids atau single cohort_id
    const selectedCohortIds = Array.isArray(cohort_ids) && cohort_ids.length > 0
      ? cohort_ids.map(x => parseInt(x)).filter(Boolean)
      : (cohort_id ? [parseInt(cohort_id)] : []);

    if (selectedCohortIds.length === 0) {
      return res.status(400).json({ error: 'Minimal satu kelompok usia harus dipilih.' });
    }

    // Gunakan cohort_id pertama sebagai primary (backward compat)
    const primaryCohortId = selectedCohortIds[0];

    const result = await run(`
      INSERT INTO programs (
        ppa_id, semester_id, cohort_id, mentor_id, tutor_id, execution_type, pillar, name,
        duration_months, target_sessions, background, qualitative_objective,
        measurable_target, min_passing_score, pmt_menu_details, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Direncanakan')
    `, [ppa_id || 1, semester_id || 1, primaryCohortId, mentor_id || req.user.id, tutor_id || null,
        execution_type || 'Dengan Tutor', pillar, name, duration_months || 3, target_sessions || 12,
        background, qualitative_objective, measurable_target, min_passing_score || 3.0, pmt_menu_details || null]);

    // Populate program_cohorts junction table
    for (const cid of selectedCohortIds) {
      await run(`INSERT OR IGNORE INTO program_cohorts (program_id, cohort_id) VALUES (?, ?)`, [result.id, cid]);
    }

    // Auto-enroll semua anak aktif dari kelompok terpilih
    const effectivePpaId = ppa_id || 1;
    for (const cid of selectedCohortIds) {
      const children = await all(`SELECT id FROM children WHERE cohort_id = ? AND ppa_id = ? AND status = 'Aktif'`, [cid, effectivePpaId]);
      for (const ch of children) {
        await run(`INSERT OR IGNORE INTO program_enrollments (program_id, child_id, status) VALUES (?, ?, 'Aktif')`, [result.id, ch.id]);
      }
    }

    const enrolledTotal = await get(`SELECT COUNT(*) as c FROM program_enrollments WHERE program_id = ?`, [result.id]);

    res.json({ id: result.id, message: `Program "${name}" berhasil dibuat dengan ${selectedCohortIds.length} kelompok & ${enrolledTotal?.c || 0} peserta terdaftar.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/programs/:id', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    if (!inScope(req.scope, 'programIds', req.params.id)) {
      return denyOutOfScope(res, 'Program ini');
    }
    const currentProg = await get(`SELECT mentor_id, status, cohort_id, ppa_id FROM programs WHERE id = ?`, [req.params.id]);
    if (!currentProg) return res.status(404).json({ error: 'Program tidak ditemukan.' });

    const {
      semester_id, cohort_id, cohort_ids, mentor_id, tutor_id, execution_type,
      pillar, name, duration_months, target_sessions,
      background, qualitative_objective, measurable_target, min_passing_score, pmt_menu_details, status
    } = req.body;

    // Tentukan cohort_ids baru
    const selectedCohortIds = Array.isArray(cohort_ids) && cohort_ids.length > 0
      ? cohort_ids.map(x => parseInt(x)).filter(Boolean)
      : (cohort_id ? [parseInt(cohort_id)] : [parseInt(currentProg.cohort_id)]);

    const primaryCohortId = selectedCohortIds[0];
    const effectiveMentorId = mentor_id || currentProg.mentor_id || req.user.id;
    const effectiveStatus = status || currentProg.status || 'Disahkan';

    await run(`
      UPDATE programs SET
        semester_id = ?, cohort_id = ?, mentor_id = ?, tutor_id = ?, execution_type = ?,
        pillar = ?, name = ?, duration_months = ?, target_sessions = ?,
        background = ?, qualitative_objective = ?, measurable_target = ?,
        min_passing_score = ?, pmt_menu_details = ?, status = ?
      WHERE id = ?
    `, [semester_id || 1, primaryCohortId, effectiveMentorId, tutor_id || null, execution_type || 'Dengan Tutor',
        pillar, name, duration_months || 3, target_sessions || 12,
        background, qualitative_objective, measurable_target, min_passing_score || 3.0, pmt_menu_details || null,
        effectiveStatus, req.params.id]);

    // Re-sync program_cohorts: hapus lama, insert baru
    await run(`DELETE FROM program_cohorts WHERE program_id = ?`, [req.params.id]);
    for (const cid of selectedCohortIds) {
      await run(`INSERT OR IGNORE INTO program_cohorts (program_id, cohort_id) VALUES (?, ?)`, [req.params.id, cid]);
    }

    res.json({ message: 'Program berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/programs/:id', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    if (!inScope(req.scope, 'programIds', req.params.id)) {
      return denyOutOfScope(res, 'Program ini');
    }
    await run(`DELETE FROM programs WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Program berhasil dihapus beserta seluruh sesi terkait.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/programs/:id/status', withScope, requireRole(['koordinator_ppa', 'mentor', 'komisi_pengawas']), async (req, res) => {
  try {
    if (!inScope(req.scope, 'programIds', req.params.id)) {
      return denyOutOfScope(res, 'Program ini');
    }
    const { status } = req.body;
    await run(`UPDATE programs SET status = ? WHERE id = ?`, [status, req.params.id]);
    res.json({ message: 'Status program berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD Health & Nutrition Records
app.post('/api/health-records', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    const { ppa_id, child_id, check_date, weight_kg, height_cm, nutrition_status, pmt_menu_served, gross_motor_skills, mentor_notes } = req.body;
    if (!inScope(req.scope, 'childIds', child_id)) {
      return denyOutOfScope(res, 'Data anak ini');
    }
    if (!req.scope.all && req.scope.role === 'mentor' && !inScope(req.scope, 'childIds', child_id)) {
      return denyOutOfScope(res, 'Pencatatan kesehatan anak di luar dampingan');
    }
    const result = await run(`
      INSERT INTO health_nutrition_records (
        ppa_id, child_id, check_date, weight_kg, height_cm, nutrition_status, pmt_menu_served, gross_motor_skills, mentor_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [ppa_id || 1, child_id, check_date, weight_kg, height_cm, nutrition_status, pmt_menu_served, gross_motor_skills, mentor_notes]);
    res.json({ id: result.id, message: 'Data antropometri & PMT berhasil dicatat.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/health-records/:id', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    const rec = await get(`SELECT child_id FROM health_nutrition_records WHERE id = ?`, [req.params.id]);
    if (!rec || !inScope(req.scope, 'childIds', rec.child_id)) {
      return denyOutOfScope(res, 'Data rekam fisik/gizi anak ini');
    }
    await run(`DELETE FROM health_nutrition_records WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Data rekam fisik/gizi berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. LESSON PLAN (TUTOR)
// ==========================================
app.get('/api/programs/:id/lesson-plans', withScope, async (req, res) => {
  try {
    if (!inScope(req.scope, 'programIds', req.params.id)) {
      return denyOutOfScope(res, 'Lesson plan program ini');
    }
    const plans = await all(`
      SELECT * FROM lesson_plans WHERE program_id = ? ORDER BY session_number ASC
    `, [req.params.id]);
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/programs/:id/lesson-plans', withScope, requireRole(['koordinator_ppa', 'mentor', 'tutor']), async (req, res) => {
  try {
    if (!inScope(req.scope, 'programIds', req.params.id)) {
      return denyOutOfScope(res, 'Program ini');
    }
    const {
      session_number, topic, competency_goal, learning_methods, materials_tools, success_indicator,
      meeting_date, start_time, end_time, room_location
    } = req.body;

    const result = await run(`
      INSERT INTO lesson_plans (program_id, session_number, topic, competency_goal, learning_methods, materials_tools, success_indicator)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.params.id, session_number, topic, competency_goal, learning_methods || '', materials_tools || '', success_indicator]);

    // Jika jadwal diisi, sinkronkan langsung ke tabel schedules
    if (meeting_date) {
      const existingSched = await get(`SELECT id FROM schedules WHERE program_id = ? AND session_number = ?`, [req.params.id, session_number]);
      if (existingSched) {
        await run(`UPDATE schedules SET meeting_date = ?, start_time = ?, end_time = ?, room_location = ? WHERE id = ?`,
          [meeting_date, start_time || '09:00', end_time || '11:00', room_location || 'Ruang PPA', existingSched.id]);
      } else {
        await run(`INSERT INTO schedules (program_id, session_number, meeting_date, start_time, end_time, room_location) VALUES (?, ?, ?, ?, ?, ?)`,
          [req.params.id, session_number, meeting_date, start_time || '09:00', end_time || '11:00', room_location || 'Ruang PPA']);
      }
    }

    res.json({ id: result.id, message: 'Sesi Lesson Plan & Jadwal berhasil disimpan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint Update Sesi Lesson Plan & Jadwal
app.put('/api/programs/:progId/lesson-plans/:id', withScope, requireRole(['koordinator_ppa', 'mentor', 'tutor']), async (req, res) => {
  try {
    if (!inScope(req.scope, 'programIds', req.params.progId)) {
      return denyOutOfScope(res, 'Program ini');
    }
    const {
      session_number, topic, competency_goal, learning_methods, materials_tools, success_indicator,
      meeting_date, start_time, end_time, room_location
    } = req.body;

    await run(`
      UPDATE lesson_plans
      SET session_number = ?, topic = ?, competency_goal = ?, learning_methods = ?, materials_tools = ?, success_indicator = ?
      WHERE id = ? AND program_id = ?
    `, [session_number, topic, competency_goal, learning_methods || '', materials_tools || '', success_indicator, req.params.id, req.params.progId]);

    // Sinkronkan ke tabel schedules
    if (meeting_date) {
      const existingSched = await get(`SELECT id FROM schedules WHERE program_id = ? AND session_number = ?`, [req.params.progId, session_number]);
      if (existingSched) {
        await run(`UPDATE schedules SET meeting_date = ?, start_time = ?, end_time = ?, room_location = ? WHERE id = ?`,
          [meeting_date, start_time || '09:00', end_time || '11:00', room_location || 'Ruang PPA', existingSched.id]);
      } else {
        await run(`INSERT INTO schedules (program_id, session_number, meeting_date, start_time, end_time, room_location) VALUES (?, ?, ?, ?, ?, ?)`,
          [req.params.progId, session_number, meeting_date, start_time || '09:00', end_time || '11:00', room_location || 'Ruang PPA']);
      }
    }

    res.json({ message: 'Sesi Lesson Plan & Jadwal berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lesson-plans/:id', withScope, requireRole(['koordinator_ppa', 'mentor', 'tutor']), async (req, res) => {
  try {
    const lp = await get(`SELECT program_id, session_number FROM lesson_plans WHERE id = ?`, [req.params.id]);
    if (lp) {
      await run(`DELETE FROM schedules WHERE program_id = ? AND session_number = ?`, [lp.program_id, lp.session_number]);
    }
    await run(`DELETE FROM lesson_plans WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Sesi Lesson Plan & Jadwal berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. JADWAL, ABSENSI, & JURNAL PERTEMUAN (DENGAN PLOT LESSON PLAN & PENYESUAIAN WAKTU REAL)
// ==========================================
app.get('/api/programs/:id/schedules', withScope, async (req, res) => {
  try {
    if (!inScope(req.scope, 'programIds', req.params.id)) {
      return denyOutOfScope(res, 'Jadwal program ini');
    }
    const schedules = await all(`
      SELECT sc.*,
             lp.topic as lesson_topic, lp.competency_goal, lp.materials_tools,
             mj.actual_materials_taught, mj.children_present_count, mj.class_dynamics, mj.challenges_notes, mj.follow_up_action,
             (SELECT COUNT(*) FROM attendances at WHERE at.schedule_id = sc.id AND at.status = 'Hadir') as attended_count,
             (SELECT COUNT(*) FROM program_enrollments pe WHERE pe.program_id = sc.program_id AND pe.status = 'Aktif') as total_enrolled
      FROM schedules sc
      LEFT JOIN lesson_plans lp ON (lp.program_id = sc.program_id AND lp.session_number = sc.session_number)
      LEFT JOIN meeting_journals mj ON mj.schedule_id = sc.id
      WHERE sc.program_id = ?
      ORDER BY sc.session_number ASC
    `, [req.params.id]);
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint untuk Plot Lesson Plan ke Jadwal (Batch atau Single Sesi)
app.post('/api/programs/:id/schedules', withScope, requireRole(['koordinator_ppa', 'mentor', 'tutor']), async (req, res) => {
  try {
    const progId = req.params.id;
    if (!inScope(req.scope, 'programIds', progId)) {
      return denyOutOfScope(res, 'Program ini');
    }

    const { batch, session_number, meeting_date, start_time, end_time, room_location, start_date, day_interval, sessions } = req.body;

    if (batch) {
      // Plot Sesi-Sesi dari Lesson Plan
      const plans = await all(`SELECT session_number, topic FROM lesson_plans WHERE program_id = ? ORDER BY session_number ASC`, [progId]);
      if (plans.length === 0) {
        return res.status(400).json({ error: 'Belum ada sesi Lesson Plan pada program ini. Silakan tambahkan minimal 1 sesi Lesson Plan terlebih dahulu.' });
      }

      const sessionsToPlot = Array.isArray(sessions) && sessions.length > 0
        ? plans.filter(p => sessions.includes(p.session_number))
        : plans;

      const baseDate = new Date(start_date || new Date().toISOString().split('T')[0]);
      const interval = parseInt(day_interval) || 7; // default mingguan (7 hari)

      const created = [];
      for (let i = 0; i < sessionsToPlot.length; i++) {
        const lp = sessionsToPlot[i];
        const sessDate = new Date(baseDate);
        sessDate.setDate(sessDate.getDate() + (i * interval));
        const dateStr = sessDate.toISOString().split('T')[0];

        const existing = await get(`SELECT id FROM schedules WHERE program_id = ? AND session_number = ?`, [progId, lp.session_number]);
        if (existing) {
          await run(`
            UPDATE schedules SET meeting_date = ?, start_time = ?, end_time = ?, room_location = ?
            WHERE id = ?
          `, [dateStr, start_time || '14:00', end_time || '16:00', room_location || 'Ruang Belajar PPA IO-0118', existing.id]);
          created.push({ id: existing.id, session_number: lp.session_number, updated: true });
        } else {
          const r = await run(`
            INSERT INTO schedules (program_id, session_number, meeting_date, start_time, end_time, room_location)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [progId, lp.session_number, dateStr, start_time || '14:00', end_time || '16:00', room_location || 'Ruang Belajar PPA IO-0118']);
          created.push({ id: r.id, session_number: lp.session_number, updated: false });
        }
      }
      return res.json({ message: `Berhasil mem-plot ${created.length} jadwal pertemuan dari Lesson Plan.`, schedules: created });
    }

    // Single schedule creation/update
    const existing = await get(`SELECT id FROM schedules WHERE program_id = ? AND session_number = ?`, [progId, session_number]);
    if (existing) {
      await run(`
        UPDATE schedules SET meeting_date = ?, start_time = ?, end_time = ?, room_location = ?
        WHERE id = ?
      `, [meeting_date, start_time || '14:00', end_time || '16:00', room_location || 'Ruang Belajar PPA IO-0118', existing.id]);
      return res.json({ id: existing.id, message: `Jadwal pertemuan sesi #${session_number} berhasil diperbarui.` });
    }

    const r = await run(`
      INSERT INTO schedules (program_id, session_number, meeting_date, start_time, end_time, room_location)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [progId, session_number, meeting_date, start_time || '14:00', end_time || '16:00', room_location || 'Ruang Belajar PPA IO-0118']);
    res.json({ id: r.id, message: `Jadwal pertemuan sesi #${session_number} berhasil dibuat.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Penyesuaian waktu real pertemuan jadwal
app.put('/api/schedules/:id', withScope, requireRole(['koordinator_ppa', 'mentor', 'tutor']), async (req, res) => {
  try {
    const sched = await get(`SELECT * FROM schedules WHERE id = ?`, [req.params.id]);
    if (!sched) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    if (!inScope(req.scope, 'programIds', sched.program_id)) {
      return denyOutOfScope(res, 'Jadwal ini');
    }

    const { meeting_date, start_time, end_time, room_location, session_number } = req.body;
    const updates = [];
    const params = [];
    if (meeting_date) { updates.push('meeting_date = ?'); params.push(meeting_date); }
    if (start_time) { updates.push('start_time = ?'); params.push(start_time); }
    if (end_time) { updates.push('end_time = ?'); params.push(end_time); }
    if (room_location) { updates.push('room_location = ?'); params.push(room_location); }
    if (session_number) { updates.push('session_number = ?'); params.push(session_number); }

    if (updates.length > 0) {
      params.push(req.params.id);
      await run(`UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    res.json({ message: 'Penyesuaian waktu real pertemuan berhasil disimpan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedules/:id', withScope, requireRole(['koordinator_ppa', 'mentor', 'tutor']), async (req, res) => {
  try {
    const sched = await get(`SELECT * FROM schedules WHERE id = ?`, [req.params.id]);
    if (!sched) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    if (!inScope(req.scope, 'programIds', sched.program_id)) {
      return denyOutOfScope(res, 'Jadwal ini');
    }
    await run(`DELETE FROM schedules WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Sesi jadwal berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ambil seluruh anak di kelompok program terkait, digabungkan dengan status kehadiran yang sudah tersimpan (jika ada)
app.get('/api/schedules/:id/attendances', withScope, async (req, res) => {
  try {
    const sched = await get(`SELECT * FROM schedules WHERE id = ?`, [req.params.id]);
    if (!sched) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    if (!inScope(req.scope, 'programIds', sched.program_id)) {
      return denyOutOfScope(res, 'Jadwal ini');
    }

    const attendances = await all(`
      SELECT ch.id as child_id, ch.full_name as child_name, ch.child_id_compassion, ch.photo_data,
             COALESCE(at.status, 'Hadir') as status,
             COALESCE(at.notes, '') as notes,
             at.id as attendance_id
      FROM schedules sc
      JOIN programs p ON sc.program_id = p.id
      JOIN program_enrollments pe ON pe.program_id = p.id AND pe.status = 'Aktif'
      JOIN children ch ON ch.id = pe.child_id
      LEFT JOIN attendances at ON at.schedule_id = sc.id AND at.child_id = ch.id
      WHERE sc.id = ?
      ORDER BY ch.full_name ASC
    `, [req.params.id]);

    res.json(attendances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules/:id/attendances', withScope, requireRole(['koordinator_ppa', 'mentor', 'tutor']), async (req, res) => {
  try {
    const sched = await get(`SELECT * FROM schedules WHERE id = ?`, [req.params.id]);
    if (!sched) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    if (!inScope(req.scope, 'programIds', sched.program_id)) {
      return denyOutOfScope(res, 'Jadwal ini');
    }

    const { attendances, real_meeting_date, real_start_time, real_end_time, real_room_location } = req.body;

    // 1. Simpan penyesuaian waktu real pertemuan jika diubah saat absensi
    if (real_meeting_date || real_start_time || real_end_time || real_room_location) {
      const updates = [];
      const params = [];
      if (real_meeting_date) { updates.push('meeting_date = ?'); params.push(real_meeting_date); }
      if (real_start_time) { updates.push('start_time = ?'); params.push(real_start_time); }
      if (real_end_time) { updates.push('end_time = ?'); params.push(real_end_time); }
      if (real_room_location) { updates.push('room_location = ?'); params.push(real_room_location); }
      params.push(req.params.id);
      await run(`UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // 2. Simpan atau perbarui status kehadiran anak
    if (Array.isArray(attendances)) {
      for (const item of attendances) {
        const existing = await get(`SELECT id FROM attendances WHERE schedule_id = ? AND child_id = ?`, [req.params.id, item.child_id]);
        if (existing) {
          await run(`UPDATE attendances SET status = ?, notes = ? WHERE id = ?`, [item.status, item.notes || '', existing.id]);
        } else {
          await run(`INSERT INTO attendances (schedule_id, child_id, status, notes) VALUES (?, ?, ?, ?)`, [req.params.id, item.child_id, item.status, item.notes || '']);
        }
      }
    }

    res.json({ message: 'Presensi absensi & penyesuaian waktu real pertemuan berhasil disimpan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules/:id/journal', withScope, requireRole(['koordinator_ppa', 'mentor', 'tutor']), async (req, res) => {
  try {
    const sched = await get(`SELECT * FROM schedules WHERE id = ?`, [req.params.id]);
    if (!sched) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    if (!inScope(req.scope, 'programIds', sched.program_id)) {
      return denyOutOfScope(res, 'Jadwal ini');
    }

    const { actual_materials_taught, children_present_count, class_dynamics, challenges_notes, follow_up_action } = req.body;
    const existing = await get(`SELECT id FROM meeting_journals WHERE schedule_id = ?`, [req.params.id]);
    if (existing) {
      await run(`
        UPDATE meeting_journals SET
          actual_materials_taught = ?, children_present_count = ?, class_dynamics = ?, challenges_notes = ?, follow_up_action = ?
        WHERE id = ?
      `, [actual_materials_taught, children_present_count, class_dynamics, challenges_notes, follow_up_action, existing.id]);
    } else {
      await run(`
        INSERT INTO meeting_journals (schedule_id, actual_materials_taught, children_present_count, class_dynamics, challenges_notes, follow_up_action)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [req.params.id, actual_materials_taught, children_present_count, class_dynamics, challenges_notes, follow_up_action]);
    }
    res.json({ message: 'Jurnal pertemuan Tutor berhasil dicatat.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ==========================================
// 8B. TUGAS, KUIS, & PENILAIAN FORMATIF (ASSIGNMENTS)
// ==========================================
app.get('/api/programs/:id/assignments', withScope, async (req, res) => {
  try {
    const progId = req.params.id;
    if (!inScope(req.scope, 'programIds', progId)) {
      return denyOutOfScope(res, 'Tugas program ini');
    }

    const assignments = await all(`
      SELECT * FROM assignments WHERE program_id = ? ORDER BY id ASC
    `, [progId]);

    const children = await all(`
      SELECT ch.id, ch.child_id_compassion, ch.full_name, ch.nickname, ch.gender
      FROM program_enrollments pe
      JOIN children ch ON ch.id = pe.child_id
      WHERE pe.program_id = ? AND pe.status = 'Aktif'
      ORDER BY ch.full_name ASC
    `, [progId]);

    let submissions = [];
    if (assignments.length > 0) {
      const aIds = assignments.map(a => a.id).join(',');
      submissions = await all(`
        SELECT * FROM assignment_submissions WHERE assignment_id IN (${aIds})
      `);
    }

    res.json({ assignments, children, submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/programs/:id/assignments', withScope, requireRole(['koordinator_ppa', 'tutor', 'mentor']), async (req, res) => {
  try {
    const progId = req.params.id;
    if (!inScope(req.scope, 'programIds', progId)) {
      return denyOutOfScope(res, 'Program ini');
    }
    const { title, description, weight_percent, due_date } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Judul tugas/kuis wajib diisi.' });
    }

    const result = await run(`
      INSERT INTO assignments (program_id, title, description, weight_percent, due_date)
      VALUES (?, ?, ?, ?, ?)
    `, [progId, title, description || '', weight_percent || 20.0, due_date || null]);

    res.json({ message: 'Tugas / Kuis berhasil ditambahkan.', id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/assignments/:id', withScope, requireRole(['koordinator_ppa', 'tutor', 'mentor']), async (req, res) => {
  try {
    const assignment = await get(`SELECT * FROM assignments WHERE id = ?`, [req.params.id]);
    if (!assignment) {
      return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
    }
    if (!inScope(req.scope, 'programIds', assignment.program_id)) {
      return denyOutOfScope(res, 'Tugas program ini');
    }

    await run(`DELETE FROM assignments WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Tugas / Kuis berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assignments/:id/scores', withScope, requireRole(['koordinator_ppa', 'tutor', 'mentor']), async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const assignment = await get(`SELECT * FROM assignments WHERE id = ?`, [assignmentId]);
    if (!assignment) {
      return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
    }
    if (!inScope(req.scope, 'programIds', assignment.program_id)) {
      return denyOutOfScope(res, 'Tugas program ini');
    }

    const { submissions } = req.body;
    if (!Array.isArray(submissions)) {
      return res.status(400).json({ error: 'Data nilai submissions tidak valid.' });
    }

    for (const sub of submissions) {
      if (!sub.child_id) continue;
      const existing = await get(`
        SELECT id FROM assignment_submissions WHERE assignment_id = ? AND child_id = ?
      `, [assignmentId, sub.child_id]);

      const scoreVal = sub.score !== null && sub.score !== undefined && sub.score !== '' ? parseFloat(sub.score) : null;
      const feedbackVal = sub.feedback || '';

      if (existing) {
        await run(`
          UPDATE assignment_submissions
          SET score = ?, feedback = ?
          WHERE id = ?
        `, [scoreVal, feedbackVal, existing.id]);
      } else {
        await run(`
          INSERT INTO assignment_submissions (assignment_id, child_id, score, feedback)
          VALUES (?, ?, ?, ?)
        `, [assignmentId, sub.child_id, scoreVal, feedbackVal]);
      }
    }

    res.json({ message: 'Seluruh nilai tugas & kuis berhasil disimpan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. EVALUASI HASIL BELAJAR (TUTOR & MENTOR)
// ==========================================
app.get('/api/programs/:id/evaluations', withScope, async (req, res) => {
  try {
    const progId = req.params.id;
    if (!inScope(req.scope, 'programIds', progId)) {
      return denyOutOfScope(res, 'Evaluasi program ini');
    }

    const program = await get(`
      SELECT p.*, c.name as cohort_name, m.full_name as mentor_name, t.full_name as tutor_name
      FROM programs p
      JOIN age_cohorts c ON p.cohort_id = c.id
      JOIN users m ON p.mentor_id = m.id
      LEFT JOIN users t ON p.tutor_id = t.id
      WHERE p.id = ?
    `, [progId]);

    const children = await all(`
      SELECT ch.id, ch.child_id_compassion, ch.full_name, ch.nickname, ch.gender
      FROM program_enrollments pe
      JOIN children ch ON ch.id = pe.child_id
      WHERE pe.program_id = ? AND pe.status = 'Aktif'
      ORDER BY ch.full_name ASC
    `, [progId]);

    const tutorEvals = await all(`
      SELECT te.*, ch.full_name as child_name, ch.child_id_compassion
      FROM tutor_evaluations te
      JOIN children ch ON te.child_id = ch.id
      WHERE te.program_id = ?
    `, [progId]);

    const mentorEvals = await all(`
      SELECT me.*, ch.full_name as child_name, ch.child_id_compassion
      FROM mentor_evaluations me
      JOIN children ch ON me.child_id = ch.id
      WHERE me.program_id = ?
    `, [progId]);

    const certificates = await all(`
      SELECT * FROM activity_certificates WHERE program_id = ?
    `, [progId]);

    const assignmentAverages = await all(`
      SELECT asub.child_id, AVG(asub.score) as avg_score, COUNT(asub.id) as task_count
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      WHERE a.program_id = ? AND asub.score IS NOT NULL
      GROUP BY asub.child_id
    `, [progId]);

    res.json({ program, children, tutorEvals, mentorEvals, certificates, assignmentAverages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/programs/:id/evaluations/tutor', withScope, requireRole(['koordinator_ppa', 'tutor']), async (req, res) => {
  try {
    const { child_id, material_mastery_score, practical_task_score, technical_discipline_score, qualitative_narrative } = req.body;
    if (!inScope(req.scope, 'programIds', req.params.id)) {
      return denyOutOfScope(res, 'Program ini');
    }
    if (!inScope(req.scope, 'childIds', child_id)) {
      return denyOutOfScope(res, 'Anak dampingan ini');
    }
    // Calculate final weighted score: (40% practical + 35% material + 25% discipline)
    const final_tutor_score = (
      (parseFloat(material_mastery_score) * 0.35) +
      (parseFloat(practical_task_score) * 0.40) +
      (parseFloat(technical_discipline_score) * 0.25)
    ).toFixed(2);

    const is_passed = final_tutor_score >= 3.0 ? 1 : 0;

    const existing = await get(`SELECT id FROM tutor_evaluations WHERE program_id = ? AND child_id = ?`, [req.params.id, child_id]);
    if (existing) {
      await run(`
        UPDATE tutor_evaluations SET
          material_mastery_score = ?, practical_task_score = ?, technical_discipline_score = ?,
          final_tutor_score = ?, qualitative_narrative = ?, is_passed = ?
        WHERE id = ?
      `, [material_mastery_score, practical_task_score, technical_discipline_score, final_tutor_score, qualitative_narrative, is_passed, existing.id]);
    } else {
      await run(`
        INSERT INTO tutor_evaluations (
          program_id, child_id, material_mastery_score, practical_task_score, technical_discipline_score,
          final_tutor_score, qualitative_narrative, is_passed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [req.params.id, child_id, material_mastery_score, practical_task_score, technical_discipline_score, final_tutor_score, qualitative_narrative, is_passed]);
    }
    res.json({ message: 'Nilai dan narasi evaluasi Tutor berhasil disimpan.', final_tutor_score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/programs/:id/evaluations/mentor', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    const { child_id, spiritual_attitude_score, social_emotional_score, attendance_commitment_score, mentor_reflection_narrative } = req.body;
    if (!inScope(req.scope, 'programIds', req.params.id)) {
      return denyOutOfScope(res, 'Program ini');
    }
    if (!inScope(req.scope, 'childIds', child_id)) {
      return denyOutOfScope(res, 'Anak dampingan ini');
    }
    const final_mentor_score = (
      (parseFloat(spiritual_attitude_score) * 0.40) +
      (parseFloat(social_emotional_score) * 0.35) +
      (parseFloat(attendance_commitment_score) * 0.25)
    ).toFixed(2);

    const existing = await get(`SELECT id FROM mentor_evaluations WHERE program_id = ? AND child_id = ?`, [req.params.id, child_id]);
    if (existing) {
      await run(`
        UPDATE mentor_evaluations SET
          spiritual_attitude_score = ?, social_emotional_score = ?, attendance_commitment_score = ?,
          final_mentor_score = ?, mentor_reflection_narrative = ?
        WHERE id = ?
      `, [spiritual_attitude_score, social_emotional_score, attendance_commitment_score, final_mentor_score, mentor_reflection_narrative, existing.id]);
    } else {
      await run(`
        INSERT INTO mentor_evaluations (
          program_id, child_id, spiritual_attitude_score, social_emotional_score, attendance_commitment_score,
          final_mentor_score, mentor_reflection_narrative
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [req.params.id, child_id, spiritual_attitude_score, social_emotional_score, attendance_commitment_score, final_mentor_score, mentor_reflection_narrative]);
    }
    res.json({ message: 'Evaluasi karakter & refleksi Mentor berhasil disimpan.', final_mentor_score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9B. PENERBITAN SERTIFIKAT MODUL KEGIATAN
// ==========================================
app.post('/api/programs/:id/certificates/issue', withScope, requireRole(['koordinator_ppa', 'tutor', 'mentor']), async (req, res) => {
  try {
    const progId = req.params.id;
    const { child_id, predicate } = req.body;
    if (!inScope(req.scope, 'programIds', progId)) {
      return denyOutOfScope(res, 'Program ini');
    }
    if (!inScope(req.scope, 'childIds', child_id)) {
      return denyOutOfScope(res, 'Anak dampingan ini');
    }

    const prog = await get(`
      SELECT p.*, prof.code as ppa_code
      FROM programs p
      JOIN ppa_profiles prof ON p.ppa_id = prof.id
      WHERE p.id = ?
    `, [progId]);

    if (!prog) return res.status(404).json({ error: 'Program tidak ditemukan.' });

    const tutorEval = await get(`SELECT * FROM tutor_evaluations WHERE program_id = ? AND child_id = ?`, [progId, child_id]);
    const mentorEval = await get(`SELECT * FROM mentor_evaluations WHERE program_id = ? AND child_id = ?`, [progId, child_id]);

    let finalScore = 3.5;
    if (tutorEval && mentorEval) {
      finalScore = (parseFloat(tutorEval.final_tutor_score) * 0.6) + (parseFloat(mentorEval.final_mentor_score) * 0.4);
    } else if (tutorEval) {
      finalScore = parseFloat(tutorEval.final_tutor_score);
    } else if (mentorEval) {
      finalScore = parseFloat(mentorEval.final_mentor_score);
    }

    let finalPredicate = predicate;
    if (!finalPredicate) {
      if (finalScore >= 3.85) finalPredicate = 'Istimewa (High Distinction)';
      else if (finalScore >= 3.5) finalPredicate = 'Sangat Baik (Distinction)';
      else if (finalScore >= 3.0) finalPredicate = 'Baik (Credit)';
      else finalPredicate = 'Cukup';
    }

    const existingCert = await get(`
      SELECT id, certificate_number FROM activity_certificates WHERE program_id = ? AND child_id = ?
    `, [progId, child_id]);

    const todayStr = new Date().toISOString().split('T')[0];
    const cleanPpaCode = (prog.ppa_code || 'IO0118').replace(/[^a-zA-Z0-9]/g, '');

    if (existingCert) {
      await run(`
        UPDATE activity_certificates
        SET predicate = ?, issue_date = ?
        WHERE id = ?
      `, [finalPredicate, todayStr, existingCert.id]);
      return res.json({ message: 'Sertifikat kegiatan berhasil diperbarui.', certificate_number: existingCert.certificate_number });
    }

    // Generate unique cert number
    const countRow = await get(`SELECT COUNT(*) as cnt FROM activity_certificates`);
    const seq = String((countRow?.cnt || 0) + 1).padStart(3, '0');
    const certNum = `CERT-PPA/${cleanPpaCode}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${seq}`;
    const qrHash = `PPA-${cleanPpaCode}-MOD-${progId}-${child_id}`;

    await run(`
      INSERT INTO activity_certificates (certificate_number, program_id, child_id, issue_date, predicate, qr_code_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [certNum, progId, child_id, todayStr, finalPredicate, qrHash]);

    res.json({ message: 'Sertifikat modul kegiatan resmi berhasil diterbitkan.', certificate_number: certNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. RAPOR HASIL BELAJAR SEMESTERAN (HOLISTIK 4 PILAR)
// ==========================================
const reportContentFields = [
  'spiritual_score', 'cognitive_score', 'physical_score', 'socioemotional_score',
  'attendance_percentage', 'overall_narrative_summary', 'mentor_homeroom_notes'
];

function reportRevision(report) {
  const values = reportContentFields.map(field => report[field]);
  return createHash('sha256').update(JSON.stringify(values)).digest('hex');
}

function getSemesterAttendance(childId, semesterId) {
  return get(`
    SELECT COUNT(*) AS total_sessions,
           COUNT(CASE WHEN at.status = 'Hadir' THEN 1 END) AS hadir_count,
           COUNT(CASE WHEN at.status = 'Izin' THEN 1 END) AS izin_count,
           COUNT(CASE WHEN at.status = 'Sakit' THEN 1 END) AS sakit_count,
           COUNT(CASE WHEN at.status = 'Alpa' THEN 1 END) AS alpa_count
    FROM schedules sc
    JOIN programs p ON p.id = sc.program_id
    JOIN attendances at ON at.id = (
      SELECT MAX(id) FROM attendances WHERE schedule_id = sc.id AND child_id = ?
    )
    WHERE p.semester_id = ? AND at.status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')
  `, [childId, semesterId]);
}

app.get('/api/reports/semester', withScope, async (req, res) => {
  try {
    const { semester_id, cohort_id, ppa_id } = req.query;
    let sql = `
      SELECT sr.*, s.name AS semester_name, fy.name AS fiscal_year_name,
             ch.cohort_id, ch.full_name as child_name, ch.nickname, ch.child_id_compassion, ch.birth_date, ch.gender,
             c.name as cohort_name,
             m.full_name as mentor_name,
             p.name as ppa_name, p.code as ppa_code, p.church_name, p.address as ppa_address,
             p.partnership_head_name, p.coordinator_name
      FROM semester_reports sr
      JOIN semesters s ON s.id = sr.semester_id
      JOIN fiscal_years fy ON fy.id = s.fiscal_year_id
      JOIN children ch ON sr.child_id = ch.id
      JOIN age_cohorts c ON ch.cohort_id = c.id
      LEFT JOIN users m ON c.mentor_id = m.id
      JOIN ppa_profiles p ON sr.ppa_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (ppa_id) {
      sql += ` AND sr.ppa_id = ?`;
      params.push(ppa_id);
    }
    if (semester_id) {
      sql += ` AND sr.semester_id = ?`;
      params.push(semester_id);
    }
    if (cohort_id) {
      sql += ` AND ch.cohort_id = ?`;
      params.push(cohort_id);
    }
    sql += scopeFilter(req.scope, 'sr.child_id', 'childIds', params);
    sql += ` ORDER BY ch.full_name ASC, s.start_date DESC, s.id DESC`;
    const reports = await all(sql, params);

    for (const rep of reports) {
      rep.revision = reportRevision(rep);
      // 1. Fetch all programs/activities enrolled in this child's cohort with complete assessment breakdown
      rep.programs = await all(`
        SELECT p.id, p.name, p.pillar, p.execution_type, p.target_sessions, p.min_passing_score,
               t.full_name as tutor_name, m.full_name as mentor_name,
               te.material_mastery_score, te.practical_task_score, te.technical_discipline_score, te.final_tutor_score, te.qualitative_narrative,
               me.spiritual_attitude_score, me.social_emotional_score, me.attendance_commitment_score, me.final_mentor_score, me.mentor_reflection_narrative,
               (
                 SELECT AVG(asub.score) 
                 FROM assignment_submissions asub
                 JOIN assignments a ON asub.assignment_id = a.id
                 WHERE a.program_id = p.id AND asub.child_id = ? AND asub.score IS NOT NULL
               ) as avg_assignment_score,
               (
                 SELECT COUNT(a.id)
                 FROM assignments a
                 WHERE a.program_id = p.id
               ) as total_assignments_count,
               (
                 SELECT certificate_number
                 FROM activity_certificates ac
                 WHERE ac.program_id = p.id AND ac.child_id = ?
               ) as certificate_number
        FROM programs p
        LEFT JOIN users t ON p.tutor_id = t.id
        JOIN users m ON p.mentor_id = m.id
        LEFT JOIN tutor_evaluations te ON (te.program_id = p.id AND te.child_id = ?)
        LEFT JOIN mentor_evaluations me ON (me.program_id = p.id AND me.child_id = ?)
        WHERE p.id IN (SELECT pe.program_id FROM program_enrollments pe WHERE pe.child_id = ?)
          AND p.semester_id = ?
        ORDER BY p.id ASC
      `, [rep.child_id, rep.child_id, rep.child_id, rep.child_id, rep.child_id, rep.semester_id]);

      rep.attendance_stats = await getSemesterAttendance(rep.child_id, rep.semester_id);
      
      // 3. Fetch Latest Health & Nutrition Record (Antropometri & PMT)
      const healthRecord = await get(`
        SELECT * FROM health_nutrition_records
        WHERE child_id = ?
          AND check_date >= COALESCE((SELECT start_date FROM semesters WHERE id = ?), check_date)
          AND check_date <= COALESCE((SELECT end_date FROM semesters WHERE id = ?), check_date)
        ORDER BY check_date DESC LIMIT 1
      `, [rep.child_id, rep.semester_id, rep.semester_id]);
      rep.health_record = healthRecord || null;
    }

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/reports/semester/:id/approve', withScope, async (req, res) => {
  try {
    const { action, revision } = req.body || {};
    const role = req.user.role;
    if (!['verify', 'approve'].includes(action)) {
      return res.status(400).json({ error: 'Tindakan pengesahan tidak valid.' });
    }
    const verifying = action === 'verify';
    if (role !== (verifying ? 'komisi_pengawas' : 'koordinator_ppa')) {
      return res.status(403).json({ error: 'Tindakan ini hanya dapat dilakukan oleh petugas yang berwenang.' });
    }

    const report = await get('SELECT * FROM semester_reports WHERE id = ?', [req.params.id]);
    if (!report) return res.status(404).json({ error: 'Rapor tidak ditemukan.' });

    if (revision !== reportRevision(report)) {
      return res.status(409).json({ error: 'Isi rapor telah berubah. Muat ulang dan periksa kembali.' });
    }
    const unchanged = reportContentFields.map(field => `${field} IS ?`).join(' AND ');
    const params = [report.id, ...reportContentFields.map(field => report[field])];
    const result = verifying
      ? await run(`UPDATE semester_reports SET verified_by_supervisor = 1
                   WHERE id = ? AND verified_by_supervisor = 0 AND approved_by_coordinator = 0 AND ${unchanged}`, params)
      : await run(`UPDATE semester_reports SET approved_by_coordinator = 1
                   WHERE id = ? AND verified_by_supervisor = 1 AND approved_by_coordinator = 0 AND ${unchanged}`, params);
    if (!result.changes) {
      return res.status(409).json({ error: 'Status rapor sudah berubah atau tahap sebelumnya belum selesai. Muat ulang rapor.' });
    }
    res.json({ message: verifying ? 'Rapor berhasil diverifikasi.' : 'Rapor berhasil disahkan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/reports/semester/:id', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    const reportId = req.params.id;
    const { spiritual_score, cognitive_score, physical_score, socioemotional_score, attendance_percentage, overall_narrative_summary, mentor_homeroom_notes } = req.body;

    const scores = [spiritual_score, cognitive_score, physical_score, socioemotional_score];
    if (scores.some(score => score != null && (!Number.isFinite(score) || score < 1 || score > 4)) ||
        (attendance_percentage != null && (!Number.isFinite(attendance_percentage) || attendance_percentage < 0 || attendance_percentage > 100))) {
      return res.status(400).json({ error: 'Skor harus antara 1 dan 4, dan kehadiran antara 0 dan 100.' });
    }

    const rep = await get(`SELECT * FROM semester_reports WHERE id = ?`, [reportId]);
    if (!rep) return res.status(404).json({ error: 'Rapor tidak ditemukan.' });
    if (!inScope(req.scope, 'childIds', rep.child_id)) {
      return denyOutOfScope(res, 'Rapor anak ini');
    }

    await run(`
      UPDATE semester_reports SET
        spiritual_score = COALESCE(?, spiritual_score),
        cognitive_score = COALESCE(?, cognitive_score),
        physical_score = COALESCE(?, physical_score),
        socioemotional_score = COALESCE(?, socioemotional_score),
        attendance_percentage = COALESCE(?, attendance_percentage),
        overall_narrative_summary = COALESCE(?, overall_narrative_summary),
        mentor_homeroom_notes = COALESCE(?, mentor_homeroom_notes),
        verified_by_supervisor = 0, approved_by_coordinator = 0
      WHERE id = ?
    `, [spiritual_score, cognitive_score, physical_score, socioemotional_score, attendance_percentage, overall_narrative_summary, mentor_homeroom_notes, reportId]);

    res.json({ message: 'Rapor semesteran berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/semester/generate', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    const { semester_id, cohort_id, ppa_id } = req.body;
    const targetPpaId = ppa_id || 1;

    let targetSemesterId = semester_id;
    if (!targetSemesterId) {
      const activeSem = await get(`
        SELECT s.id FROM semesters s JOIN fiscal_years fy ON fy.id = s.fiscal_year_id
        WHERE fy.ppa_id = ? AND fy.is_active = 1 AND s.is_active = 1
        ORDER BY s.start_date DESC, s.id DESC LIMIT 1
      `, [targetPpaId]);
      if (!activeSem) return res.status(400).json({ error: 'Belum ada semester aktif.' });
      targetSemesterId = activeSem.id;
    }

    const semester = await get(`
      SELECT s.* FROM semesters s JOIN fiscal_years fy ON fy.id = s.fiscal_year_id
      WHERE s.id = ? AND fy.ppa_id = ?
    `, [targetSemesterId, targetPpaId]);
    if (!semester) return res.status(400).json({ error: 'Semester tidak ditemukan untuk PPA ini.' });

    let childSql = `SELECT ch.*, c.name as cohort_name FROM children ch JOIN age_cohorts c ON ch.cohort_id = c.id WHERE ch.ppa_id = ?`;
    const childParams = [targetPpaId];
    if (cohort_id) {
      childSql += ` AND ch.cohort_id = ?`;
      childParams.push(cohort_id);
    }
    childSql += scopeFilter(req.scope, 'ch.id', 'childIds', childParams);
    const targetChildren = await all(childSql, childParams);

    if (targetChildren.length === 0) {
      return res.status(400).json({ error: 'Tidak ada anak yang ditemukan dalam cakupan tugas untuk digenerate rapor.' });
    }

    let generatedCount = 0;

    for (const ch of targetChildren) {
      const attendance = await getSemesterAttendance(ch.id, targetSemesterId);
      const attendanceRate = attendance.total_sessions
        ? Number((100 * attendance.hadir_count / attendance.total_sessions).toFixed(1))
        : null;

      // 2. Calculate Cognitive Pillar Score (from Kognitif programs & evaluations)
      const cogEval = await get(`
        SELECT AVG(
          CASE 
            WHEN te.final_tutor_score IS NOT NULL AND me.final_mentor_score IS NOT NULL 
              THEN (te.final_tutor_score * 0.6 + me.final_mentor_score * 0.4)
            WHEN te.final_tutor_score IS NOT NULL 
              THEN te.final_tutor_score
            ELSE me.final_mentor_score
          END
        ) as avg_score
        FROM programs p
        LEFT JOIN tutor_evaluations te ON (te.program_id = p.id AND te.child_id = ?)
        LEFT JOIN mentor_evaluations me ON (me.program_id = p.id AND me.child_id = ?)
        WHERE p.id IN (SELECT pe.program_id FROM program_enrollments pe WHERE pe.child_id = ?)
          AND p.semester_id = ? AND p.pillar = 'Kognitif' AND (te.id IS NOT NULL OR me.id IS NOT NULL)
      `, [ch.id, ch.id, ch.id, targetSemesterId]);
      const cogScore = cogEval?.avg_score ? parseFloat(parseFloat(cogEval.avg_score).toFixed(2)) : null;

      // 3. Calculate Spiritual Pillar Score (from Spiritual Programs & Mentor Attitudes)
      const spiProg = await get(`
        SELECT AVG(
          CASE 
            WHEN te.final_tutor_score IS NOT NULL AND me.final_mentor_score IS NOT NULL 
              THEN (te.final_tutor_score * 0.6 + me.final_mentor_score * 0.4)
            WHEN me.final_mentor_score IS NOT NULL 
              THEN me.final_mentor_score
            ELSE NULL
          END
        ) as avg_score
        FROM programs p
        LEFT JOIN tutor_evaluations te ON (te.program_id = p.id AND te.child_id = ?)
        LEFT JOIN mentor_evaluations me ON (me.program_id = p.id AND me.child_id = ?)
        WHERE p.id IN (SELECT pe.program_id FROM program_enrollments pe WHERE pe.child_id = ?)
          AND p.semester_id = ? AND p.pillar = 'Spiritual' AND (te.id IS NOT NULL OR me.id IS NOT NULL)
      `, [ch.id, ch.id, ch.id, targetSemesterId]);

      const spiEval = await get(`
        SELECT AVG(me.spiritual_attitude_score) as avg_score
        FROM mentor_evaluations me
        JOIN programs p ON p.id = me.program_id
        WHERE me.child_id = ? AND p.semester_id = ?
      `, [ch.id, targetSemesterId]);
      
      let spiScore = null;
      if (spiProg?.avg_score && spiEval?.avg_score) {
        spiScore = parseFloat(((parseFloat(spiProg.avg_score) + parseFloat(spiEval.avg_score)) / 2).toFixed(2));
      } else if (spiProg?.avg_score) {
        spiScore = parseFloat(parseFloat(spiProg.avg_score).toFixed(2));
      } else if (spiEval?.avg_score) {
        spiScore = parseFloat(parseFloat(spiEval.avg_score).toFixed(2));
      }

      // 4. Calculate Socio-Emotional Pillar Score (from Sosio-Emosional Programs & Mentor Observations)
      const socProg = await get(`
        SELECT AVG(
          CASE 
            WHEN te.final_tutor_score IS NOT NULL AND me.final_mentor_score IS NOT NULL 
              THEN (te.final_tutor_score * 0.6 + me.final_mentor_score * 0.4)
            WHEN te.final_tutor_score IS NOT NULL 
              THEN te.final_tutor_score
            WHEN me.final_mentor_score IS NOT NULL 
              THEN me.final_mentor_score
            ELSE NULL
          END
        ) as avg_score
        FROM programs p
        LEFT JOIN tutor_evaluations te ON (te.program_id = p.id AND te.child_id = ?)
        LEFT JOIN mentor_evaluations me ON (me.program_id = p.id AND me.child_id = ?)
        WHERE p.id IN (SELECT pe.program_id FROM program_enrollments pe WHERE pe.child_id = ?)
          AND p.semester_id = ? AND p.pillar = 'Sosio-Emosional' AND (te.id IS NOT NULL OR me.id IS NOT NULL)
      `, [ch.id, ch.id, ch.id, targetSemesterId]);

      const socEval = await get(`
        SELECT AVG(me.social_emotional_score) as avg_score
        FROM mentor_evaluations me
        JOIN programs p ON p.id = me.program_id
        WHERE me.child_id = ? AND p.semester_id = ?
      `, [ch.id, targetSemesterId]);

      let socScore = null;
      if (socProg?.avg_score && socEval?.avg_score) {
        socScore = parseFloat(((parseFloat(socProg.avg_score) + parseFloat(socEval.avg_score)) / 2).toFixed(2));
      } else if (socProg?.avg_score) {
        socScore = parseFloat(parseFloat(socProg.avg_score).toFixed(2));
      } else if (socEval?.avg_score) {
        socScore = parseFloat(parseFloat(socEval.avg_score).toFixed(2));
      }

      // 5. Calculate Physical Pillar Score (from Physical Programs & Health/PMT Records)
      const physProg = await get(`
        SELECT AVG(
          CASE 
            WHEN te.final_tutor_score IS NOT NULL AND me.final_mentor_score IS NOT NULL 
              THEN (te.final_tutor_score * 0.6 + me.final_mentor_score * 0.4)
            WHEN me.final_mentor_score IS NOT NULL 
              THEN me.final_mentor_score
            ELSE NULL
          END
        ) as avg_score
        FROM programs p
        LEFT JOIN tutor_evaluations te ON (te.program_id = p.id AND te.child_id = ?)
        LEFT JOIN mentor_evaluations me ON (me.program_id = p.id AND me.child_id = ?)
        WHERE p.id IN (SELECT pe.program_id FROM program_enrollments pe WHERE pe.child_id = ?)
          AND p.semester_id = ? AND p.pillar = 'Fisik' AND (te.id IS NOT NULL OR me.id IS NOT NULL)
      `, [ch.id, ch.id, ch.id, targetSemesterId]);

      const physRecord = await get(`
        SELECT nutrition_status, gross_motor_skills 
        FROM health_nutrition_records 
        WHERE child_id = ? AND (? IS NULL OR check_date >= ?) AND (? IS NULL OR check_date <= ?)
        ORDER BY check_date DESC LIMIT 1
      `, [ch.id, semester.start_date, semester.start_date, semester.end_date, semester.end_date]);
      let physHealthScore = null;
      if (physRecord) {
        if (physRecord.nutrition_status.includes('Sangat Baik')) physHealthScore = 3.95;
        else if (physRecord.nutrition_status.includes('Baik') || physRecord.nutrition_status.includes('Normal')) physHealthScore = 3.85;
        else if (physRecord.nutrition_status.includes('Kurang')) physHealthScore = 3.20;
      }

      let physScore = physHealthScore;
      if (physProg?.avg_score) {
        physScore = parseFloat(((Number(physProg.avg_score) + (physHealthScore ?? Number(physProg.avg_score))) / 2).toFixed(2));
      }

      await run(`
        INSERT INTO semester_reports (
          ppa_id, semester_id, child_id, spiritual_score, cognitive_score, physical_score,
          socioemotional_score, attendance_percentage, verified_by_supervisor, approved_by_coordinator
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
        ON CONFLICT(semester_id, child_id) DO UPDATE SET
          spiritual_score = excluded.spiritual_score,
          cognitive_score = excluded.cognitive_score,
          physical_score = excluded.physical_score,
          socioemotional_score = excluded.socioemotional_score,
          attendance_percentage = excluded.attendance_percentage,
          verified_by_supervisor = 0,
          approved_by_coordinator = 0
      `, [targetPpaId, targetSemesterId, ch.id, spiScore, cogScore, physScore, socScore, attendanceRate]);
      generatedCount++;
    }

    res.json({ message: `Berhasil menyinkronkan & meng-generate ${generatedCount} Rapor Semesteran 4 Pilar secara otomatis.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. SERTIFIKAT KEGIATAN & EXIT KELULUSAN
// ==========================================
app.get('/api/certificates/activity', withScope, async (req, res) => {
  try {
    const { ppa_id } = req.query;
    let sql = `
      SELECT ac.*,
             ch.full_name as child_name, ch.child_id_compassion,
             p.name as program_name, p.pillar, p.duration_months,
             t.full_name as tutor_name,
             prof.name as ppa_name, prof.code as ppa_code, prof.church_name,
             prof.coordinator_name, prof.partnership_head_name
      FROM activity_certificates ac
      JOIN children ch ON ac.child_id = ch.id
      JOIN programs p ON ac.program_id = p.id
      LEFT JOIN users t ON p.tutor_id = t.id
      JOIN ppa_profiles prof ON p.ppa_id = prof.id
      WHERE 1=1
    `;
    const params = [];
    if (ppa_id) {
      sql += ` AND p.ppa_id = ?`;
      params.push(ppa_id);
    }
    sql += scopeFilter(req.scope, 'ac.child_id', 'childIds', params);
    sql += ` ORDER BY ac.id DESC`;
    const certs = await all(sql, params);
    res.json(certs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/certificates/exit', withScope, async (req, res) => {
  try {
    const { ppa_id } = req.query;
    let sql = `
      SELECT ep.*,
             ch.full_name as child_name, ch.child_id_compassion, ch.birth_date, ch.gender,
             prof.name as ppa_name, prof.code as ppa_code, prof.church_name, prof.address as ppa_address,
             prof.coordinator_name, prof.partnership_head_name
      FROM exit_portfolios ep
      JOIN children ch ON ep.child_id = ch.id
      JOIN ppa_profiles prof ON ch.ppa_id = prof.id
      WHERE 1=1
    `;
    const params = [];
    if (ppa_id) {
      sql += ` AND ch.ppa_id = ?`;
      params.push(ppa_id);
    }
    sql += scopeFilter(req.scope, 'ep.child_id', 'childIds', params);
    sql += ` ORDER BY ep.id DESC`;
    const exits = await all(sql, params);
    res.json(exits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 12. ANALYTICS / MONITORING COMPASSION PUSAT & PENGAWAS
// ==========================================
app.get('/api/analytics/dashboard', withScope, async (req, res) => {
  try {
    const { ppa_id } = req.query;
    let cParams = [];
    let childSql = `SELECT COUNT(*) as count FROM children WHERE 1=1`;
    if (ppa_id) {
      childSql += ` AND ppa_id = ?`;
      cParams.push(ppa_id);
    }
    childSql += scopeFilter(req.scope, 'id', 'childIds', cParams);

    let pParams = [];
    let progSql = `SELECT COUNT(*) as count FROM programs WHERE 1=1`;
    if (ppa_id) {
      progSql += ` AND ppa_id = ?`;
      pParams.push(ppa_id);
    }
    progSql += scopeFilter(req.scope, 'id', 'programIds', pParams);

    let coParams = [];
    let cohortSql = `SELECT COUNT(*) as count FROM age_cohorts WHERE 1=1`;
    if (ppa_id) {
      cohortSql += ` AND ppa_id = ?`;
      coParams.push(ppa_id);
    }
    cohortSql += scopeFilter(req.scope, 'id', 'cohortIds', coParams);

    let attParams = [];
    let attSql = `
      SELECT (CAST(COUNT(CASE WHEN at.status = 'Hadir' THEN 1 END) AS FLOAT) / NULLIF(COUNT(*), 0)) * 100 as rate
      FROM attendances at
      JOIN schedules sc ON at.schedule_id = sc.id
      WHERE 1=1
    `;
    attSql += scopeFilter(req.scope, 'sc.program_id', 'programIds', attParams);

    const totalChildren = await get(childSql, cParams);
    const totalPrograms = await get(progSql, pParams);
    const totalCohorts = await get(cohortSql, coParams);
    const avgAttendance = await get(attSql, attParams);

    // Target vs Lesson Plan fulfillment
    let progsSql = `
      SELECT p.id, p.name, p.pillar, p.target_sessions, p.measurable_target, p.status,
             COALESCE(
               (SELECT GROUP_CONCAT(c2.name, ', ') FROM program_cohorts pc2 JOIN age_cohorts c2 ON pc2.cohort_id = c2.id WHERE pc2.program_id = p.id),
               c.name
             ) as cohort_name,
             m.full_name as mentor_name, t.full_name as tutor_name,
             (SELECT COUNT(*) FROM lesson_plans lp WHERE lp.program_id = p.id) as lp_count,
             (SELECT COUNT(*) FROM schedules sc WHERE sc.program_id = p.id) as sched_count,
             (SELECT AVG(final_tutor_score) FROM tutor_evaluations te WHERE te.program_id = p.id) as avg_score,
             (SELECT COUNT(*) FROM program_enrollments pe WHERE pe.program_id = p.id AND pe.status = 'Aktif') as enrolled_count
      FROM programs p
      LEFT JOIN age_cohorts c ON p.cohort_id = c.id
      JOIN users m ON p.mentor_id = m.id
      LEFT JOIN users t ON p.tutor_id = t.id
      WHERE 1=1
    `;
    const prParams = [];
    if (ppa_id) {
      progsSql += ` AND p.ppa_id = ?`;
      prParams.push(ppa_id);
    }
    progsSql += scopeFilter(req.scope, 'p.id', 'programIds', prParams);
    progsSql += ` ORDER BY p.id ASC`;
    const programsList = await all(progsSql, prParams);

    res.json({
      totalChildren: totalChildren?.count || 0,
      totalPrograms: totalPrograms?.count || 0,
      totalCohorts: totalCohorts?.count || 0,
      attendanceRate: Math.round(avgAttendance?.rate || 0),
      programs: programsList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 13. MANAJEMEN PESERTA PROGRAM (ENROLLMENT)
// ==========================================

// GET: Daftar peserta terdaftar di sebuah program
app.get('/api/programs/:id/enrollments', withScope, async (req, res) => {
  try {
    const progId = req.params.id;
    if (!inScope(req.scope, 'programIds', progId)) {
      return denyOutOfScope(res, 'Program ini');
    }

    const enrolled = await all(`
      SELECT pe.id as enrollment_id, pe.child_id, pe.enrolled_date, pe.status as enrollment_status, pe.notes as enrollment_notes,
             ch.full_name, ch.nickname, ch.gender, ch.child_id_compassion, ch.birth_date, ch.photo_data,
             c.name as cohort_name, c.code as cohort_code
      FROM program_enrollments pe
      JOIN children ch ON ch.id = pe.child_id
      JOIN age_cohorts c ON ch.cohort_id = c.id
      WHERE pe.program_id = ?
      ORDER BY pe.status ASC, ch.full_name ASC
    `, [progId]);

    res.json(enrolled);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Kandidat anak yang bisa didaftarkan (anak dari cohort yang terkait program, belum terdaftar)
app.get('/api/programs/:id/enrollment-candidates', withScope, async (req, res) => {
  try {
    const progId = req.params.id;
    if (!inScope(req.scope, 'programIds', progId)) {
      return denyOutOfScope(res, 'Program ini');
    }

    const prog = await get('SELECT ppa_id FROM programs WHERE id = ?', [progId]);
    if (!prog) return res.status(404).json({ error: 'Program tidak ditemukan.' });

    const candidates = await all(`
      SELECT ch.id, ch.full_name, ch.nickname, ch.gender, ch.child_id_compassion, ch.birth_date, ch.photo_data,
             c.name as cohort_name, c.code as cohort_code,
             CASE WHEN pe.id IS NOT NULL THEN 1 ELSE 0 END as already_enrolled,
             pe.status as enrollment_status
      FROM children ch
      JOIN age_cohorts c ON ch.cohort_id = c.id
      LEFT JOIN program_enrollments pe ON pe.child_id = ch.id AND pe.program_id = ?
      WHERE ch.ppa_id = ? AND ch.status = 'Aktif'
        AND (
          ch.cohort_id IN (SELECT pc.cohort_id FROM program_cohorts pc WHERE pc.program_id = ?)
          OR ch.cohort_id = (SELECT cohort_id FROM programs WHERE id = ?)
        )
      ORDER BY c.id ASC, ch.full_name ASC
    `, [progId, prog.ppa_id, progId, progId]);

    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Daftarkan anak-anak ke program (bulk, bisa array child_ids)
app.post('/api/programs/:id/enrollments', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    const progId = req.params.id;
    if (!inScope(req.scope, 'programIds', progId)) {
      return denyOutOfScope(res, 'Program ini');
    }

    const { child_ids, notes } = req.body;
    if (!Array.isArray(child_ids) || child_ids.length === 0) {
      return res.status(400).json({ error: 'Daftar child_ids tidak boleh kosong.' });
    }

    let inserted = 0;
    let skipped = 0;
    for (const child_id of child_ids) {
      const existing = await get('SELECT id FROM program_enrollments WHERE program_id = ? AND child_id = ?', [progId, child_id]);
      if (existing) {
        await run('UPDATE program_enrollments SET status = ?, notes = ? WHERE id = ?', ['Aktif', notes || null, existing.id]);
        skipped++;
      } else {
        await run('INSERT INTO program_enrollments (program_id, child_id, status, notes) VALUES (?, ?, ?, ?)', [progId, child_id, 'Aktif', notes || null]);
        inserted++;
      }
    }

    const total = await get('SELECT COUNT(*) as c FROM program_enrollments WHERE program_id = ? AND status = ?', [progId, 'Aktif']);
    res.json({ message: `${inserted} anak berhasil didaftarkan, ${skipped} diperbarui. Total peserta aktif: ${total?.c || 0}.`, inserted, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Daftarkan seluruh anak aktif dari cohort ke program
app.post('/api/programs/:id/enroll-cohort', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    const progId = req.params.id;
    if (!inScope(req.scope, 'programIds', progId)) {
      return denyOutOfScope(res, 'Program ini');
    }

    const prog = await get('SELECT ppa_id, cohort_id FROM programs WHERE id = ?', [progId]);
    if (!prog) return res.status(404).json({ error: 'Program tidak ditemukan.' });

    const { cohort_id } = req.body;
    const targetCohortId = cohort_id || prog.cohort_id;

    const children = await all('SELECT id FROM children WHERE cohort_id = ? AND ppa_id = ? AND status = ?', [targetCohortId, prog.ppa_id, 'Aktif']);

    let inserted = 0;
    for (const ch of children) {
      const r = await run('INSERT OR IGNORE INTO program_enrollments (program_id, child_id, status) VALUES (?, ?, ?)', [progId, ch.id, 'Aktif']);
      if (r.changes > 0) inserted++;
    }

    await run('INSERT OR IGNORE INTO program_cohorts (program_id, cohort_id) VALUES (?, ?)', [progId, targetCohortId]);

    const total = await get('SELECT COUNT(*) as c FROM program_enrollments WHERE program_id = ? AND status = ?', [progId, 'Aktif']);
    res.json({ message: `${inserted} anak baru dari kelompok berhasil didaftarkan. Total peserta aktif: ${total?.c || 0}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Keluarkan anak dari program
app.delete('/api/programs/:id/enrollments/:childId', withScope, requireRole(['koordinator_ppa', 'mentor']), async (req, res) => {
  try {
    const progId = req.params.id;
    const childId = req.params.childId;
    if (!inScope(req.scope, 'programIds', progId)) {
      return denyOutOfScope(res, 'Program ini');
    }

    const existing = await get('SELECT id FROM program_enrollments WHERE program_id = ? AND child_id = ?', [progId, childId]);
    if (!existing) {
      return res.status(404).json({ error: 'Pendaftaran anak ini tidak ditemukan.' });
    }

    await run('UPDATE program_enrollments SET status = ? WHERE id = ?', ['Keluar', existing.id]);
    res.json({ message: 'Anak berhasil dikeluarkan dari program.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Cohort yang terhubung ke sebuah program
app.get('/api/programs/:id/cohorts', withScope, async (req, res) => {
  try {
    const progId = req.params.id;
    const cohorts = await all(`
      SELECT pc.cohort_id, c.name, c.code, c.age_range,
             (SELECT COUNT(*) FROM program_enrollments pe
              WHERE pe.program_id = ? AND pe.status = 'Aktif'
                AND pe.child_id IN (SELECT id FROM children WHERE cohort_id = c.id)) as enrolled_from_cohort
      FROM program_cohorts pc
      JOIN age_cohorts c ON pc.cohort_id = c.id
      WHERE pc.program_id = ?
      ORDER BY pc.cohort_id ASC
    `, [progId, progId]);
    res.json(cohorts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Rute API yang tidak dikenal -> JSON 404 (bukan halaman HTML)
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.` });
});

// Fallback to SPA index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PATHWAY-PPA Server is running at http://localhost:${PORT}`);
});
