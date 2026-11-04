const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'pathway_ppa.sqlite');
const db = new sqlite3.Database(dbPath);

// Helper function to run SQL queries as Promises
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize Database Tables
async function initDb() {
  await run(`PRAGMA foreign_keys = ON;`);

  // 1. Master Profil PPA (Dynamic Parameter - No Hardcoding! Support Seluruh PPA se-Indonesia)
  await run(`
    CREATE TABLE IF NOT EXISTS ppa_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      church_name TEXT NOT NULL,
      church_district TEXT,
      church_membership TEXT DEFAULT 'ANGGOTA PGI',
      address TEXT,
      city TEXT,
      postal_code TEXT,
      phone TEXT,
      email TEXT,
      partnership_head_name TEXT,
      partnership_head_title TEXT,
      coordinator_name TEXT,
      coordinator_title TEXT,
      district_head_name TEXT,
      district_secretary_name TEXT,
      district_phone TEXT,
      church_logo_url TEXT,
      ppa_logo_url TEXT,
      stamp_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Users (Role-Based Access Control)
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ppa_id INTEGER,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL, -- compassion_pusat, komisi_pengawas, koordinator_ppa, mentor, tutor, admin
      title TEXT,
      phone TEXT,
      email TEXT,
      assigned_cohort_id INTEGER,
      specialization TEXT,
      photo_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ppa_id) REFERENCES ppa_profiles(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_cohort_id) REFERENCES age_cohorts(id) ON DELETE SET NULL
    );
  `);

  // Auto-migration: ensure new columns exist in users table if table already existed
  try {
    const userCols = await all(`PRAGMA table_info(users);`);
    const colNames = userCols.map(c => c.name);
    if (!colNames.includes('assigned_cohort_id')) {
      await run(`ALTER TABLE users ADD COLUMN assigned_cohort_id INTEGER;`);
    }
    if (!colNames.includes('specialization')) {
      await run(`ALTER TABLE users ADD COLUMN specialization TEXT;`);
    }
    if (!colNames.includes('photo_url')) {
      await run(`ALTER TABLE users ADD COLUMN photo_url TEXT;`);
    }
    if (!colNames.includes('is_active')) {
      await run(`ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;`);
    }
  } catch (migErr) {
    console.error('Migration warning on users table:', migErr.message);
  }

  // 3. Tahun Fiskal (Fiscal Years)
  await run(`
    CREATE TABLE IF NOT EXISTS fiscal_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ppa_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (ppa_id) REFERENCES ppa_profiles(id)
    );
  `);

  // 4. Semesters
  await run(`
    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fiscal_year_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      semester_number INTEGER NOT NULL, -- 1 atau 2
      start_date DATE,
      end_date DATE,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id)
    );
  `);

  // 5. Kelompok Usia & Kelas (Age Cohorts: Kelompok 1 - 5)
  await run(`
    CREATE TABLE IF NOT EXISTS age_cohorts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ppa_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      age_range TEXT NOT NULL,
      mentor_id INTEGER, -- Wali Kelas
      FOREIGN KEY (ppa_id) REFERENCES ppa_profiles(id),
      FOREIGN KEY (mentor_id) REFERENCES users(id)
    );
  `);

  // 6. Data Anak Binaan PPA (Sponsor Children - Biodata Lengkap & Foto)
  await run(`
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ppa_id INTEGER NOT NULL,
      cohort_id INTEGER NOT NULL,
      child_id_compassion TEXT NOT NULL,
      full_name TEXT NOT NULL,
      nickname TEXT,
      gender TEXT NOT NULL, -- L / P
      birth_place TEXT,
      birth_date DATE NOT NULL,
      father_name TEXT,
      mother_name TEXT,
      parent_name TEXT,
      parent_phone TEXT,
      home_address TEXT,
      school_name TEXT,
      school_grade TEXT,
      hobby TEXT,
      dream_ambition TEXT,
      photo_data TEXT, -- Base64 encoded image string
      joined_date DATE,
      status TEXT DEFAULT 'Aktif', -- Aktif, Purna Asuh, Pindah
      notes TEXT,
      FOREIGN KEY (ppa_id) REFERENCES ppa_profiles(id),
      FOREIGN KEY (cohort_id) REFERENCES age_cohorts(id)
    );
  `);

  // 7. Program & Kegiatan (Inisiasi Mentor)
  await run(`
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ppa_id INTEGER NOT NULL,
      semester_id INTEGER NOT NULL,
      cohort_id INTEGER NOT NULL,
      mentor_id INTEGER NOT NULL,
      tutor_id INTEGER, -- Nullable jika Mandiri Mentor atau Fisik/Gizi
      execution_type TEXT DEFAULT 'Dengan Tutor', -- 'Dengan Tutor', 'Mandiri Mentor', 'Fisik & Gizi (PMT)'
      pillar TEXT NOT NULL, -- Spiritual, Fisik, Kognitif, Sosio-Emosional
      name TEXT NOT NULL,
      duration_months INTEGER DEFAULT 3,
      target_sessions INTEGER DEFAULT 12,
      background TEXT NOT NULL,
      qualitative_objective TEXT NOT NULL,
      measurable_target TEXT NOT NULL,
      min_passing_score REAL DEFAULT 3.0,
      pmt_menu_details TEXT, -- Rincian menu jika PMT / Gizi
      status TEXT DEFAULT 'Berjalan', -- Direncanakan, Berjalan, Selesai, Disahkan
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ppa_id) REFERENCES ppa_profiles(id),
      FOREIGN KEY (semester_id) REFERENCES semesters(id),
      FOREIGN KEY (cohort_id) REFERENCES age_cohorts(id),
      FOREIGN KEY (mentor_id) REFERENCES users(id),
      FOREIGN KEY (tutor_id) REFERENCES users(id)
    );
  `);

  // 7B. Pemantauan Tumbuh Kembang Fisik & Gizi Anak (PMT / Antropometri)
  await run(`
    CREATE TABLE IF NOT EXISTS health_nutrition_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ppa_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      check_date DATE NOT NULL,
      weight_kg REAL NOT NULL,
      height_cm REAL NOT NULL,
      nutrition_status TEXT NOT NULL, -- Gizi Baik, Gizi Kurang, Berisiko Stunting, Sangat Baik
      pmt_menu_served TEXT NOT NULL, -- e.g. 'Nasi, Sup Telur Sayur, Tempe, Pisang, Susu'
      gross_motor_skills TEXT, -- e.g. 'Mampu melompat dengan 2 kaki sejauh 30 cm, lari zig-zag teratur'
      mentor_notes TEXT,
      FOREIGN KEY (ppa_id) REFERENCES ppa_profiles(id),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );
  `);

  // 8. Rencana Pembelajaran (Lesson Plans oleh Tutor / Mentor)
  await run(`
    CREATE TABLE IF NOT EXISTS lesson_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      session_number INTEGER NOT NULL,
      topic TEXT NOT NULL,
      competency_goal TEXT NOT NULL,
      learning_methods TEXT,
      materials_tools TEXT,
      success_indicator TEXT,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
    );
  `);

  // 9. Jadwal Pertemuan Pembelajaran
  await run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      session_number INTEGER NOT NULL,
      meeting_date DATE NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      room_location TEXT NOT NULL,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
    );
  `);

  // 10. Absensi / Presensi Pertemuan
  await run(`
    CREATE TABLE IF NOT EXISTS attendances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      status TEXT NOT NULL, -- Hadir, Izin, Sakit, Alpa
      notes TEXT,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id)
    );
  `);

  // 11. Jurnal Pelaksanaan Pertemuan (Laporan Pertemuan)
  await run(`
    CREATE TABLE IF NOT EXISTS meeting_journals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL UNIQUE,
      actual_materials_taught TEXT NOT NULL,
      children_present_count INTEGER DEFAULT 0,
      class_dynamics TEXT,
      challenges_notes TEXT,
      follow_up_action TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
    );
  `);

  // 12. Tugas / Kuis / Proyek
  await run(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      weight_percent REAL DEFAULT 20.0,
      due_date DATE,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
    );
  `);

  // 13. Nilai Tugas per Anak
  await run(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      score REAL,
      feedback TEXT,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id)
    );
  `);

  // 14. Laporan Hasil Pembelajaran Per-Tutor (Nilai Teknis & Narasi)
  await run(`
    CREATE TABLE IF NOT EXISTS tutor_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      material_mastery_score REAL NOT NULL, -- 1.0 - 4.0
      practical_task_score REAL NOT NULL,
      technical_discipline_score REAL NOT NULL,
      final_tutor_score REAL NOT NULL,
      qualitative_narrative TEXT NOT NULL,
      is_passed INTEGER DEFAULT 1,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id),
      UNIQUE(program_id, child_id)
    );
  `);

  // 15. Penilaian Karakter & Refleksi Mentor
  await run(`
    CREATE TABLE IF NOT EXISTS mentor_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      spiritual_attitude_score REAL NOT NULL, -- 1.0 - 4.0
      social_emotional_score REAL NOT NULL,
      attendance_commitment_score REAL NOT NULL,
      final_mentor_score REAL NOT NULL,
      mentor_reflection_narrative TEXT NOT NULL,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id),
      UNIQUE(program_id, child_id)
    );
  `);

  // 16. Laporan Hasil Belajar Keseluruhan (Rapor Semesteran 4 Pilar)
  await run(`
    CREATE TABLE IF NOT EXISTS semester_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ppa_id INTEGER NOT NULL,
      semester_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      spiritual_score REAL,
      cognitive_score REAL,
      physical_score REAL,
      socioemotional_score REAL,
      attendance_percentage REAL,
      overall_narrative_summary TEXT,
      mentor_homeroom_notes TEXT,
      verified_by_supervisor INTEGER DEFAULT 0,
      approved_by_coordinator INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ppa_id) REFERENCES ppa_profiles(id),
      FOREIGN KEY (semester_id) REFERENCES semesters(id),
      FOREIGN KEY (child_id) REFERENCES children(id),
      UNIQUE(semester_id, child_id)
    );
  `);

  // 17. Sertifikat Kelulusan Per-Kegiatan
  await run(`
    CREATE TABLE IF NOT EXISTS activity_certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_number TEXT UNIQUE NOT NULL,
      program_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      issue_date DATE NOT NULL,
      predicate TEXT NOT NULL,
      qr_code_hash TEXT,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id)
    );
  `);

  // 18. Sertifikat Kelulusan Akhir Exit & Portofolio Rekomendasi
  await run(`
    CREATE TABLE IF NOT EXISTS exit_portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL UNIQUE,
      exit_certificate_number TEXT UNIQUE NOT NULL,
      years_in_ppa INTEGER NOT NULL,
      holistic_gpa_score REAL NOT NULL,
      top_talents_skills TEXT NOT NULL,
      vocation_career_pathway TEXT NOT NULL,
      supervisory_recommendation TEXT NOT NULL,
      coordinator_signature_date DATE,
      supervisor_signature_date DATE,
      FOREIGN KEY (child_id) REFERENCES children(id)
    );
  `);

  // 19. Junction Table: Program ↔ Kelompok Usia (Many-to-Many)
  // Satu program bisa melibatkan lebih dari satu kelompok usia
  await run(`
    CREATE TABLE IF NOT EXISTS program_cohorts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      cohort_id INTEGER NOT NULL,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
      FOREIGN KEY (cohort_id) REFERENCES age_cohorts(id),
      UNIQUE(program_id, cohort_id)
    );
  `);

  // 20. Pendaftaran Individual Anak ke Program (Enrollment)
  // Tidak semua anak dalam kelompok wajib ikut — anak didaftarkan secara firm
  await run(`
    CREATE TABLE IF NOT EXISTS program_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      enrolled_date TEXT DEFAULT (date('now')),
      status TEXT DEFAULT 'Aktif',
      notes TEXT,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id),
      UNIQUE(program_id, child_id)
    );
  `);

  // Auto-migration: Sinkronkan data lama programs.cohort_id → program_cohorts & program_enrollments
  try {
    const existingPrograms = await all(`SELECT id, cohort_id, ppa_id FROM programs WHERE cohort_id IS NOT NULL`);
    for (const prog of existingPrograms) {
      // Pastikan program_cohorts terisi dari cohort_id lama
      const existingPC = await get(`SELECT id FROM program_cohorts WHERE program_id = ? AND cohort_id = ?`, [prog.id, prog.cohort_id]);
      if (!existingPC) {
        await run(`INSERT OR IGNORE INTO program_cohorts (program_id, cohort_id) VALUES (?, ?)`, [prog.id, prog.cohort_id]);
      }
      // Auto-enroll semua anak aktif dari cohort ke program (jika belum ada enrollment)
      const enrolledCount = await get(`SELECT COUNT(*) as c FROM program_enrollments WHERE program_id = ?`, [prog.id]);
      if (!enrolledCount || enrolledCount.c === 0) {
        const children = await all(`SELECT id FROM children WHERE cohort_id = ? AND ppa_id = ? AND status = 'Aktif'`, [prog.cohort_id, prog.ppa_id]);
        for (const ch of children) {
          await run(`INSERT OR IGNORE INTO program_enrollments (program_id, child_id, status) VALUES (?, ?, 'Aktif')`, [prog.id, ch.id]);
        }
      }
    }
    console.log(`Migration: Synced ${existingPrograms.length} programs → program_cohorts & program_enrollments.`);
  } catch (migErr) {
    console.error('Migration warning (program_cohorts/enrollments):', migErr.message);
  }

  console.log('Database schema initialized with Multi-Cohort & Individual Enrollment support.');
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
