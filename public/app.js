// State Management
let currentUser = null;
let currentRole = null;
let ppasData = [];
let currentPpaId = 1;
let ppaProfile = {};
let programsData = [];
let reportsData = [];
let childrenData = [];
let healthRecords = [];
let activityCerts = [];
let exitCerts = [];
let staffData = [];
let currentStaffFilterRole = 'all';
let currentCertType = 'activity';
let cohortsData = [];
let currentSchedules = [];

// ==========================================
// STATE RESET (BERSIHKAN DOM & MEMORI SAAT GANTI AKUN / LOGOUT)
// ==========================================
function clearAppState() {
  programsData = [];
  reportsData = [];
  childrenData = [];
  healthRecords = [];
  activityCerts = [];
  exitCerts = [];
  staffData = [];
  cohortsData = [];
  currentSchedules = [];

  const auditTbody = document.getElementById('audit-table-body');
  if (auditTbody) auditTbody.innerHTML = '';

  const progContainer = document.getElementById('programs-container');
  if (progContainer) progContainer.innerHTML = '';

  const childTbody = document.getElementById('children-table-body');
  if (childTbody) childTbody.innerHTML = '';

  const staffTbody = document.getElementById('staff-table-body');
  if (staffTbody) staffTbody.innerHTML = '';

  const healthTbody = document.getElementById('health-table-body');
  if (healthTbody) healthTbody.innerHTML = '';

  const lpContainer = document.getElementById('lessonplans-table-container');
  if (lpContainer) lpContainer.innerHTML = '';

  const lpSelect = document.getElementById('lp-program-select');
  if (lpSelect) lpSelect.innerHTML = '';

  const attProgSelect = document.getElementById('attendance-prog-select');
  if (attProgSelect) attProgSelect.innerHTML = '';

  const attSessionSelect = document.getElementById('session-select');
  if (attSessionSelect) attSessionSelect.innerHTML = '';

  const attTbody = document.getElementById('attendance-table-body');
  if (attTbody) attTbody.innerHTML = '';

  const attListBody = document.getElementById('attendance-list-body');
  if (attListBody) attListBody.innerHTML = '';

  const noSchedBox = document.getElementById('attendance-no-schedule-box');
  if (noSchedBox) noSchedBox.classList.add('hidden');

  const sessPanel = document.getElementById('attendance-session-panel');
  if (sessPanel) sessPanel.classList.add('hidden');

  activeScheduleId = null;
  currentEvalProgramId = null;
  currentEvalData = null;
  currentAssignmentsData = null;

  const evalContainer = document.getElementById('evaluations-container');
  if (evalContainer) evalContainer.innerHTML = '';

  const evalTableBody = document.getElementById('evaluations-table-body');
  if (evalTableBody) evalTableBody.innerHTML = '';

  const evalCardsContainer = document.getElementById('evaluations-cards-container');
  if (evalCardsContainer) evalCardsContainer.innerHTML = '';

  const assignList = document.getElementById('assignments-list-container');
  if (assignList) assignList.innerHTML = '';

  const reportSelect = document.getElementById('report-child-select');
  if (reportSelect) reportSelect.innerHTML = '';

  const reportScreen = document.getElementById('report-card-screen');
  if (reportScreen) reportScreen.innerHTML = '';

  const certContainer = document.getElementById('cert-preview-container');
  if (certContainer) certContainer.innerHTML = '';
}

// ==========================================
// MATRIKS WEWENANG MENU RESMI (RBAC ENTERPRISE)
// ==========================================
const ROLE_PERMISSIONS = {
  komisi_pengawas: {
    allowedTabs: ['dashboard', 'cohorts', 'programs', 'evaluations', 'reports', 'certificates', 'guide'],
    defaultTab: 'dashboard',
    banner: {
      title: 'Mode: Komisi Pengawas Kemitraan Gereja (BPK / CPC)',
      desc: 'Wewenang Resmi: Mengawasi tata kelola kemitraan, menguji keselarasan Lesson Plan terhadap Program Kebutuhan, verifikasi Rapor Semesteran 4 Pilar, serta verifikasi rekomendasi masa depan anak dampingan saat Kelulusan (Exit).'
    }
  },
  koordinator_ppa: {
    allowedTabs: ['dashboard', 'cohorts', 'staff', 'programs', 'lessonplans', 'health', 'attendance', 'evaluations', 'reports', 'certificates', 'profile', 'guide'],
    defaultTab: 'dashboard',
    banner: {
      title: 'Mode: Koordinator PPA (Pimpinan Operasional Sentra)',
      desc: 'Wewenang Resmi: Mengelola seluruh operasional harian sentra PPA, pendaftaran anak dampingan, penugasan staf mentor dan instruktur tutor, penerbitan akun resmi, pengesahan rapor 4 pilar, dan penerbitan sertifikat/ijazah.'
    }
  },
  mentor: {
    allowedTabs: ['dashboard', 'cohorts', 'programs', 'health', 'evaluations', 'reports', 'certificates', 'guide'],
    defaultTab: 'dashboard',
    banner: {
      title: 'Mode: Mentor (Wali Kelompok Usia)',
      desc: 'Wewenang Resmi: Merumuskan kurikulum kebutuhan kelompok usia dampingan, memantau tumbuh kembang fisik/motorik & PMT, mengevaluasi karakter/spiritualitas anak, menyusun Catatan Wali pada Rapor 4 Pilar, dan memberikan rekomendasi kelulusan.'
    }
  },
  tutor: {
    allowedTabs: ['dashboard', 'lessonplans', 'attendance', 'evaluations', 'certificates', 'guide'],
    defaultTab: 'dashboard',
    banner: {
      title: 'Mode: Tutor (Instruktur Keterampilan & Vokasi)',
      desc: 'Wewenang Resmi: Menyusun Lesson Plan (RPP 12 Pertemuan Modul Keterampilan), mencatat presensi harian & jurnal belajar, menguji pencapaian keterampilan teknis anak, dan memvalidasi kelulusan modul keterampilan.'
    }
  },
  compassion_pusat: {
    allowedTabs: ['dashboard', 'cohorts', 'programs', 'lessonplans', 'evaluations', 'reports', 'certificates', 'profile', 'guide'],
    defaultTab: 'dashboard',
    banner: {
      title: 'Mode: Fasilitator Kemitraan (Partnership Facilitator - PF)',
      desc: 'Wewenang Resmi: Pemantauan terpadu (Cloud Monitoring), audit mutu keselarasan program sentra dengan kurikulum Compassion, verifikasi data anak dampingan, dan evaluasi portofolio kelulusan.'
    }
  },
  admin: {
    allowedTabs: ['dashboard', 'cohorts', 'staff', 'programs', 'lessonplans', 'health', 'attendance', 'evaluations', 'reports', 'certificates', 'profile', 'guide'],
    defaultTab: 'dashboard',
    banner: {
      title: 'Mode: Administrator Sistem Master',
      desc: 'Wewenang Penuh: Manajemen konfigurasi database master, manajemen semua akun pengguna, audit log, dan integrasi multi-PPA.'
    }
  }
};

// ==========================================
// GLOBAL FETCH INTERCEPTOR (STRICT JWT HEADERS)
// ==========================================
const _originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const opts = Object.assign({}, options);
  opts.headers = Object.assign({}, opts.headers);

  const token = localStorage.getItem('pathway_token');
  if (token && !opts.headers['Authorization']) {
    opts.headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await _originalFetch(url, opts);

  // Auto redirect to auth screen if unauthorized or token expired (only on 401)
  if (response.status === 401 && token && !url.includes('/api/auth/login')) {
    console.warn(`Sesi login tidak valid (401) pada ${url}. Mengarahkan ke layar masuk.`);
    handleLogout();
    showLoginError('Sesi Anda telah kedaluwarsa. Silakan masuk kembali.');
  }

  return response;
};

// ==========================================
// 1. INITIALIZATION & SESSION VERIFICATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  document.body.classList.remove('overflow-hidden', 'modal-open');
  await checkAuthSession();
  lucide.createIcons();
});

async function checkAuthSession() {
  const token = localStorage.getItem('pathway_token');

  if (!token) {
    showAuthScreen();
    await loadPpasForLogin();
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error('Sesi kedaluwarsa.');
    }

    const user = await res.json();
    currentUser = user;
    currentRole = user.role;
    if (user.ppa_id) currentPpaId = user.ppa_id;
    localStorage.setItem('pathway_user', JSON.stringify(user));

    // Bersihkan seluruh data tampilan sesi sebelumnya
    clearAppState();
    
    // Reveal App Screen, Hide Auth Screen
    showAppScreen();
    applyRoleMenuPermissions(currentUser.role);
    updateUserNavbar();
    showTab(ROLE_PERMISSIONS[currentUser.role]?.defaultTab || 'dashboard');
    await loadInitialAppData();
  } catch (err) {
    console.warn('Verifikasi sesi gagal:', err);
    clearAppState();
    localStorage.removeItem('pathway_token');
    localStorage.removeItem('pathway_user');
    currentUser = null;
    currentRole = null;
    showAuthScreen();
    await loadPpasForLogin();
    showLoginError('Sesi Anda telah kedaluwarsa atau koneksi server belum siap. Silakan masuk kembali.');
  }
}

function showAuthScreen() {
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app-screen');
  if (authScreen) authScreen.classList.remove('hidden');
  if (appScreen) appScreen.classList.add('hidden');
  document.body.classList.remove('overflow-hidden', 'modal-open');
  lucide.createIcons();
}

function showAppScreen() {
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app-screen');
  if (authScreen) authScreen.classList.add('hidden');
  if (appScreen) appScreen.classList.remove('hidden');
  document.body.classList.remove('overflow-hidden', 'modal-open');
  lucide.createIcons();
}

function showLoginError(msg) {
  const alertEl = document.getElementById('login-error-alert');
  const msgEl = document.getElementById('login-error-msg');
  if (alertEl && msgEl) {
    msgEl.innerText = msg;
    alertEl.classList.remove('hidden');
  }
}

function hideLoginError() {
  const alertEl = document.getElementById('login-error-alert');
  if (alertEl) {
    alertEl.classList.add('hidden');
  }
}

async function loadPpasForLogin() {
  try {
    const res = await fetch('/api/auth/ppas');
    if (res.ok) {
      ppasData = await res.json();
      const select = document.getElementById('login-ppa-select');
      if (select && ppasData.length > 0) {
        select.innerHTML = ppasData.map(p => `
          <option value="${p.id}" ${p.id === currentPpaId ? 'selected' : ''}>${p.code} — ${p.name} (${p.church_district || p.city})</option>
        `).join('');
      }
    }
  } catch (e) {
    console.warn('Gagal memuat PPA untuk layar login:', e);
  }
}

function fillLoginForm(username, password) {
  const uInput = document.getElementById('login-username');
  const pInput = document.getElementById('login-password');
  if (uInput) uInput.value = username;
  if (pInput) pInput.value = password;
  hideLoginError();
  if (uInput) uInput.focus();
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  hideLoginError();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const ppaId = document.getElementById('login-ppa-select')?.value;

  const btn = document.getElementById('btn-login-submit');
  const origBtnContent = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span> Memverifikasi Kredensial...`;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, ppa_id: ppaId })
    });

    const data = await res.json();

    if (!res.ok) {
      showLoginError(data.error || 'Username atau password salah.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origBtnContent;
      }
      return;
    }

    // Login Sukses - Bersihkan data sesi sebelumnya
    clearAppState();
    localStorage.setItem('pathway_token', data.token);
    localStorage.setItem('pathway_user', JSON.stringify(data.user));
    currentUser = data.user;
    currentRole = data.user.role;
    if (data.user.ppa_id) currentPpaId = data.user.ppa_id;

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnContent;
    }

    showAppScreen();
    applyRoleMenuPermissions(currentUser.role);
    updateUserNavbar();
    showTab(ROLE_PERMISSIONS[currentUser.role]?.defaultTab || 'dashboard');
    showToast(`Selamat datang, ${currentUser.full_name}! Masuk sebagai ${currentUser.title || currentUser.role}.`);
    await loadInitialAppData();
  } catch (err) {
    console.error('Login connection error:', err);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnContent;
    }
    showLoginError('Terjadi kesalahan koneksi saat login. Pastikan server backend sedang aktif di localhost:3000.');
  }
}

async function loginAsStaff(username, password = 'password123') {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      clearAppState();
      localStorage.setItem('pathway_token', data.token);
      localStorage.setItem('pathway_user', JSON.stringify(data.user));
      currentUser = data.user;
      currentRole = data.user.role;
      if (data.user.ppa_id) currentPpaId = data.user.ppa_id;

      showAppScreen();
      applyRoleMenuPermissions(currentUser.role);
      updateUserNavbar();
      showTab(ROLE_PERMISSIONS[currentUser.role]?.defaultTab || 'dashboard');
      showToast(`Beralih wewenang ke: ${currentUser.full_name} (${currentUser.title || currentUser.role})`);
      await loadInitialAppData();
    } else {
      showToast(data.error || 'Gagal login sebagai akun tersebut.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan saat beralih akun.', 'error');
  }
}
const quickLogin = loginAsStaff;

// ==========================================
// PROFIL PENGGUNA MANDIRI (SELF-SERVICE PROFILE & CREDENTIAL CRUD)
// ==========================================
let originalProfileUsername = '';

async function openModalUserProfile() {
  try {
    const token = localStorage.getItem('pathway_token');
    if (!token) {
      showToast('Sesi belum aktif. Silakan login terlebih dahulu.', 'error');
      return;
    }

    const res = await fetch('/api/user/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal memuat profil pengguna.');
    }
    const data = await res.json();
    originalProfileUsername = data.username || '';

    // Populate input fields
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('uprof-fullname', data.full_name);
    setVal('uprof-title', data.title);
    setVal('uprof-phone', data.phone);
    setVal('uprof-email', data.email);
    setVal('uprof-specialization', data.specialization);
    setVal('uprof-username', data.username);
    setVal('uprof-photo-url', data.photo_url);
    setVal('uprof-new-password', '');
    setVal('uprof-confirm-password', '');
    setVal('uprof-current-password', '');

    const fileInput = document.getElementById('uprof-photo-file');
    if (fileInput) fileInput.value = '';

    // Update avatar preview
    updateProfilePhotoPreview(data.photo_url, data.full_name);

    // Badges & Scope
    const roleMeta = {
      komisi_pengawas: { label: '🛡️ Pengawas (BPK)', bg: 'bg-amber-100 text-amber-950 border border-amber-300' },
      koordinator_ppa: { label: '👔 Koordinator PPA', bg: 'bg-blue-100 text-blue-950 border border-blue-300' },
      mentor: { label: '📖 Mentor Wali', bg: 'bg-emerald-100 text-emerald-950 border border-emerald-300' },
      tutor: { label: '💻 Tutor Vokasi', bg: 'bg-purple-100 text-purple-950 border border-purple-300' },
      compassion_pusat: { label: '🌐 Fasilitator PF', bg: 'bg-sky-100 text-sky-950 border border-sky-300' },
      admin: { label: '⚡ Admin Master', bg: 'bg-red-100 text-red-950 border border-red-300' }
    };
    const meta = roleMeta[data.role] || { label: data.role, bg: 'bg-slate-100 text-slate-800 border border-slate-300' };

    const roleBadge = document.getElementById('uprof-role-badge');
    if (roleBadge) {
      roleBadge.innerText = meta.label;
      roleBadge.className = `px-2 py-0.5 rounded font-black text-[11px] ${meta.bg}`;
    }

    const ppaBadge = document.getElementById('uprof-ppa-badge');
    if (ppaBadge) {
      ppaBadge.innerText = data.ppa_code ? `${data.ppa_code} - ${data.ppa_name || ''}` : 'Pusat / Semua Sentra';
    }

    // Assignment details
    const assignText = document.getElementById('uprof-assignment-text');
    if (assignText) {
      if (data.role === 'mentor' && data.mentored_cohorts && data.mentored_cohorts.length > 0) {
        assignText.innerHTML = data.mentored_cohorts.map(c => `<span class="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold">${c.code} (${c.name})</span>`).join(' ');
      } else if (data.role === 'tutor' && data.tutored_programs && data.tutored_programs.length > 0) {
        assignText.innerHTML = data.tutored_programs.map(p => `<span class="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-bold">${p.name}</span>`).join(' ');
      } else if (['koordinator_ppa', 'komisi_pengawas', 'compassion_pusat', 'admin'].includes(data.role)) {
        assignText.innerHTML = `<span class="text-blue-900 font-semibold">Otoritas Menyeluruh (Seluruh Anak, Kelompok & Program PPA)</span>`;
      } else {
        assignText.innerText = 'Tidak ada penugasan kelas spesifik.';
      }
    }

    openModal('modal-user-profile');
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateProfilePhotoPreview(url, fullName) {
  const previewImg = document.getElementById('uprof-photo-preview');
  const fallback = document.getElementById('uprof-avatar-fallback');
  const name = fullName || (document.getElementById('uprof-fullname') ? document.getElementById('uprof-fullname').value : '') || 'User';

  const initials = name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  if (fallback) fallback.innerText = initials;

  if (url && url.trim()) {
    if (previewImg) {
      previewImg.src = url.trim();
      previewImg.onload = () => {
        previewImg.classList.remove('hidden');
        if (fallback) fallback.classList.add('hidden');
      };
      previewImg.onerror = () => {
        previewImg.classList.add('hidden');
        if (fallback) fallback.classList.remove('hidden');
      };
    }
  } else {
    if (previewImg) previewImg.classList.add('hidden');
    if (fallback) fallback.classList.remove('hidden');
  }
}

function handleProfilePhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Silakan pilih file gambar (JPG, PNG, atau WebP).', 'error');
    return;
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran foto terlalu besar (maksimal 5MB).', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const urlInput = document.getElementById('uprof-photo-url');
    if (urlInput) urlInput.value = dataUrl;
    updateProfilePhotoPreview(dataUrl);
    showToast('Foto berhasil dimuat. Klik Simpan untuk memperbarui profil.', 'info');
  };
  reader.onerror = function() {
    showToast('Gagal membaca file foto.', 'error');
  };
  reader.readAsDataURL(file);
}

async function handleUserProfileSubmit(event) {
  event.preventDefault();
  const btn = document.getElementById('btn-save-user-profile');
  const originalBtnHtml = btn ? btn.innerHTML : '';

  try {
    const full_name = (document.getElementById('uprof-fullname')?.value || '').trim();
    const title = (document.getElementById('uprof-title')?.value || '').trim();
    const phone = (document.getElementById('uprof-phone')?.value || '').trim();
    const email = (document.getElementById('uprof-email')?.value || '').trim();
    const specialization = (document.getElementById('uprof-specialization')?.value || '').trim();
    const photo_url = (document.getElementById('uprof-photo-url')?.value || '').trim();
    const username = (document.getElementById('uprof-username')?.value || '').trim();
    const new_password = document.getElementById('uprof-new-password')?.value || '';
    const confirm_password = document.getElementById('uprof-confirm-password')?.value || '';
    const current_password = document.getElementById('uprof-current-password')?.value || '';

    if (!full_name) {
      showToast('Nama lengkap wajib diisi.', 'error');
      return;
    }
    if (!username) {
      showToast('Username tidak boleh kosong.', 'error');
      return;
    }

    const isChangingPwd = Boolean(new_password.trim());
    const isChangingUser = username.toLowerCase() !== originalProfileUsername.toLowerCase();

    if (isChangingPwd) {
      if (new_password.length < 8) {
        showToast('Password baru minimal 8 karakter.', 'error');
        return;
      }
      if (new_password !== confirm_password) {
        showToast('Konfirmasi password baru tidak cocok.', 'error');
        return;
      }
    }

    if ((isChangingPwd || isChangingUser) && !current_password) {
      showToast('Silakan masukkan Password Saat Ini untuk mengonfirmasi perubahan kredensial.', 'error');
      document.getElementById('uprof-current-password')?.focus();
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block mr-1">⏳</span> Menyimpan...`;
    }

    const token = localStorage.getItem('pathway_token');
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        full_name,
        title,
        phone,
        email,
        specialization,
        photo_url,
        username,
        new_password: isChangingPwd ? new_password : null,
        current_password: (isChangingPwd || isChangingUser) ? current_password : null
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan profil.');
    }

    // Update session credentials and state
    if (data.token) {
      localStorage.setItem('pathway_token', data.token);
    }
    if (data.user) {
      localStorage.setItem('pathway_user', JSON.stringify(data.user));
      currentUser = data.user;
      updateUserNavbar();
    }

    showToast(data.message || 'Profil berhasil diperbarui!');
    closeModal('modal-user-profile');

    // If currently on staff or cohorts tab, reload them so any changes reflect immediately
    if (typeof loadStaff === 'function') loadStaff();
    if (typeof loadCohorts === 'function') loadCohorts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
  }
}

// ==========================================
// BACKUP DATABASE MASTER
// ==========================================

async function downloadBackup() {
  try {
    const res = await fetch('/api/admin/backup');
    if (!res.ok) throw new Error('Gagal mengunduh backup.');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pathway_ppa_backup_${new Date().toISOString().slice(0, 10)}.sqlite`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Cadangan database berhasil diunduh.');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleLogout() {
  clearAppState();
  localStorage.removeItem('pathway_token');
  localStorage.removeItem('pathway_user');
  currentUser = null;
  currentRole = null;
  const uInput = document.getElementById('login-username');
  const pInput = document.getElementById('login-password');
  if (uInput) uInput.value = '';
  if (pInput) pInput.value = '';
  hideLoginError();
  showAuthScreen();
  loadPpasForLogin();
  showToast('Anda telah keluar dari sistem secara aman.');
}

function updateUserNavbar() {
  if (!currentUser) return;
  const nameEl = document.getElementById('logged-user-name');
  const roleBadgeEl = document.getElementById('logged-user-role-badge');
  const avatarEl = document.getElementById('logged-user-avatar');
  const photoEl = document.getElementById('logged-user-photo');

  if (nameEl) nameEl.innerText = currentUser.full_name;

  // Handle Photo Profile vs Initial Avatar
  if (photoEl && avatarEl) {
    if (currentUser.photo_url) {
      photoEl.src = currentUser.photo_url;
      photoEl.classList.remove('hidden');
      avatarEl.classList.add('hidden');
    } else {
      photoEl.classList.add('hidden');
      avatarEl.classList.remove('hidden');
      const initials = currentUser.full_name
        ? currentUser.full_name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : 'U';
      avatarEl.innerText = initials;
    }
  }

  const roleMeta = {
    komisi_pengawas: { label: '🛡️ Pengawas (BPK)', bg: 'bg-amber-400 text-amber-950' },
    koordinator_ppa: { label: '👔 Koordinator PPA', bg: 'bg-blue-300 text-blue-950' },
    mentor: { label: '📖 Mentor Wali', bg: 'bg-emerald-300 text-emerald-950' },
    tutor: { label: '💻 Tutor Vokasi', bg: 'bg-purple-300 text-purple-950' },
    compassion_pusat: { label: '🌐 Fasilitator PF', bg: 'bg-sky-300 text-sky-950' },
    admin: { label: '⚡ Admin Master', bg: 'bg-red-400 text-red-950' }
  };

  const meta = roleMeta[currentUser.role] || { label: currentUser.role, bg: 'bg-slate-300 text-slate-900' };

  if (roleBadgeEl) {
    roleBadgeEl.innerText = meta.label;
    roleBadgeEl.className = `text-[10px] font-black px-2 py-0.5 rounded font-mono truncate max-w-[150px] shadow-sm text-center ${meta.bg}`;
  }
}

function applyRoleMenuPermissions(role) {
  const perm = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['komisi_pengawas'];
  const allowed = perm.allowedTabs;

  const allTabs = [
    'dashboard', 'cohorts', 'staff', 'programs', 'lessonplans',
    'health', 'attendance', 'evaluations', 'reports', 'certificates',
    'profile', 'guide'
  ];

  allTabs.forEach(tabId => {
    const btn = document.getElementById(`tab-btn-${tabId}`);
    if (btn) {
      if (allowed.includes(tabId)) {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    }
  });

  // Update Role Banner with formal mandate
  const banner = document.getElementById('role-banner');
  const bannerTitle = document.getElementById('role-banner-title');
  const bannerDesc = document.getElementById('role-banner-desc');
  const bannerIcon = document.getElementById('role-banner-icon');

  if (banner && perm.banner) {
    if (bannerTitle) bannerTitle.innerText = perm.banner.title;
    if (bannerDesc) bannerDesc.innerText = perm.banner.desc;

    if (role === 'komisi_pengawas') {
      banner.className = 'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/80 text-amber-950 shadow-sm';
      if (bannerIcon) {
        bannerIcon.className = 'p-2.5 bg-amber-200 text-amber-900 rounded-xl shadow-sm shrink-0';
        bannerIcon.innerHTML = `<i data-lucide="shield-check" class="w-5 h-5"></i>`;
      }
    } else if (role === 'koordinator_ppa') {
      banner.className = 'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/80 text-blue-950 shadow-sm';
      if (bannerIcon) {
        bannerIcon.className = 'p-2.5 bg-blue-200 text-blue-900 rounded-xl shadow-sm shrink-0';
        bannerIcon.innerHTML = `<i data-lucide="briefcase" class="w-5 h-5"></i>`;
      }
    } else if (role === 'mentor') {
      banner.className = 'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/80 text-emerald-950 shadow-sm';
      if (bannerIcon) {
        bannerIcon.className = 'p-2.5 bg-emerald-200 text-emerald-900 rounded-xl shadow-sm shrink-0';
        bannerIcon.innerHTML = `<i data-lucide="heart-handshake" class="w-5 h-5"></i>`;
      }
    } else if (role === 'tutor') {
      banner.className = 'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200/80 text-purple-950 shadow-sm';
      if (bannerIcon) {
        bannerIcon.className = 'p-2.5 bg-purple-200 text-purple-900 rounded-xl shadow-sm shrink-0';
        bannerIcon.innerHTML = `<i data-lucide="graduation-cap" class="w-5 h-5"></i>`;
      }
    } else {
      banner.className = 'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all bg-gradient-to-r from-slate-100 to-blue-50 border-slate-300 text-slate-900 shadow-sm';
      if (bannerIcon) {
        bannerIcon.className = 'p-2.5 bg-slate-200 text-slate-900 rounded-xl shadow-sm shrink-0';
        bannerIcon.innerHTML = `<i data-lucide="settings-2" class="w-5 h-5"></i>`;
      }
    }
  }

  for (const id of ['btn-generate-reports', 'btn-edit-report']) {
    const button = document.getElementById(id);
    if (button) button.classList.toggle('hidden', !['admin', 'koordinator_ppa', 'mentor'].includes(role));
  }

  const btnBackup = document.getElementById('btn-backup-db');
  if (btnBackup) {
    if (role === 'koordinator_ppa' || role === 'admin') btnBackup.classList.remove('hidden');
    else btnBackup.classList.add('hidden');
  }

  // Sembunyikan tombol-tombol aksi di luar kewenangan resmi peran (Bukan ditolak, memang tidak diperlihatkan):
  const isLeader = (role === 'koordinator_ppa' || role === 'admin');
  const isMentor = (role === 'mentor');
  const isTutor = (role === 'tutor');

  // 1. Bilah Tindakan Cepat di Dashboard & Tombol-tombol Cepat
  const quickBar = document.getElementById('dashboard-quick-actions');
  if (quickBar) {
    if (isLeader || isMentor) {
      quickBar.classList.remove('hidden');
    } else {
      quickBar.classList.add('hidden');
    }
  }

  const btnQuickChild = document.getElementById('btn-quick-child');
  if (btnQuickChild) {
    if (isLeader) btnQuickChild.classList.remove('hidden');
    else btnQuickChild.classList.add('hidden');
  }

  const btnQuickProg = document.getElementById('btn-quick-prog');
  if (btnQuickProg) {
    if (isLeader || isMentor) btnQuickProg.classList.remove('hidden');
    else btnQuickProg.classList.add('hidden');
  }

  const btnQuickHealth = document.getElementById('btn-quick-health');
  if (btnQuickHealth) {
    if (isLeader || isMentor) btnQuickHealth.classList.remove('hidden');
    else btnQuickHealth.classList.add('hidden');
  }

  // 2. Tombol + Buat Program Baru di Tab Program
  const btnAddProg = document.getElementById('btn-add-program');
  if (btnAddProg) {
    if (isLeader || isMentor) btnAddProg.classList.remove('hidden');
    else btnAddProg.classList.add('hidden');
  }

  // 3. Tombol + Daftarkan Anak Baru & Kelola Kelompok (Eksklusif Koordinator PPA / Admin)
  const btnAddChild = document.getElementById('btn-add-child');
  if (btnAddChild) {
    if (isLeader) btnAddChild.classList.remove('hidden');
    else btnAddChild.classList.add('hidden');
  }

  const btnManageCohorts = document.getElementById('btn-manage-cohorts');
  if (btnManageCohorts) {
    if (isLeader) btnManageCohorts.classList.remove('hidden');
    else btnManageCohorts.classList.add('hidden');
  }

  // 4. Tombol + Catat Data Fisik / PMT di Tab Fisik & Gizi
  const btnAddHealth = document.getElementById('btn-add-health');
  if (btnAddHealth) {
    if (isLeader || isMentor) btnAddHealth.classList.remove('hidden');
    else btnAddHealth.classList.add('hidden');
  }

  // 5. Tombol + Tambah Sesi di Tab Lesson Plan (Eksklusif Koordinator & Tutor)
  const btnAddLp = document.getElementById('btn-add-lp');
  if (btnAddLp) {
    if (isLeader || isTutor) btnAddLp.classList.remove('hidden');
    else btnAddLp.classList.add('hidden');
  }

  lucide.createIcons();
}

async function loadInitialAppData() {
  try {
    await loadPpas();
    await loadPpaProfile(currentPpaId);

    // 1. Muat program sesuai cakupan resmi wewenang akun aktif (Tutor -> modulnya saja, Mentor -> kelompoknya, dst)
    await loadProgramsData();

    // 2. Muat ringkasan KPI & matriks akuntabilitas di dashboard
    await loadDashboard();

    const activeTabId = ROLE_PERMISSIONS[currentUser?.role]?.defaultTab || 'dashboard';
    const activeView = document.getElementById(`view-${activeTabId}`);
    if (window.lucide) {
      if (activeView) lucide.createIcons({ root: activeView });
      else lucide.createIcons();
    }
  } catch (err) {
    console.error('Error loading initial app data:', err);
  }
}

// Global Toast Notification System
function showToast(message, type = 'success') {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'fixed top-4 right-4 z-[60] transition-all duration-300 transform translate-y-[-20px] opacity-0 pointer-events-none';
    document.body.appendChild(toast);
  }

  const bgClass = type === 'success' 
    ? 'bg-emerald-950 border-emerald-500 text-emerald-100 shadow-emerald-900/50' 
    : 'bg-red-950 border-red-500 text-red-100 shadow-red-900/50';

  toast.innerHTML = `
    <div class="flex items-center space-x-2.5 px-4 py-3 rounded-2xl border shadow-2xl ${bgClass} text-xs font-bold pointer-events-auto backdrop-blur-md">
      <span class="text-sm">${type === 'success' ? '✅' : '⚠️'}</span>
      <span>${message}</span>
    </div>
  `;

  toast.classList.remove('opacity-0', 'translate-y-[-20px]', 'pointer-events-none');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-[-20px]', 'pointer-events-none');
  }, 3500);
}

// Tab Navigation
function showTab(tabId) {
  if (tabId === 'lessonplans') tabId = 'programs';
  // Always restore full page scrolling and jump cleanly to top whenever navigating between tabs
  document.body.classList.remove('overflow-hidden', 'modal-open');
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Ensure any dangling modal overlays are closed
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.classList.add('hidden');
    m.classList.remove('flex');
  });

  // Check RBAC permission for current role
  if (currentUser && currentUser.role) {
    const perm = ROLE_PERMISSIONS[currentUser.role];
    if (perm && !perm.allowedTabs.includes(tabId)) {
      showToast(`Akses Dibatasi: Peran ${currentUser.title || currentUser.role} tidak memiliki kewenangan membuka menu ${tabId}.`, 'error');
      tabId = perm.defaultTab || 'dashboard';
    }
  }

  // Switch visible tab view with instant feedback
  document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.remove('bg-blue-800', 'text-white', 'shadow', 'bg-amber-400', 'bg-amber-300', 'text-blue-950', 'shadow-md', 'font-black', 'scale-[1.02]');
    btn.classList.add('text-blue-200');
  });

  const activeView = document.getElementById(`view-${tabId}`);
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.add('bg-blue-800', 'text-white', 'shadow');
    activeBtn.classList.remove('text-blue-200');
  }

  // Always invoke the tab loader so data is freshly rendered without blank areas!
  if (tabId === 'dashboard') loadDashboard();
  else if (tabId === 'cohorts') loadCohortsAndChildren();
  else if (tabId === 'staff') loadStaff();
  else if (tabId === 'programs') loadPrograms();
  else if (tabId === 'lessonplans') loadLessonPlans();
  else if (tabId === 'health') loadHealthRecords();
  else if (tabId === 'attendance') loadAttendanceTab();
  else if (tabId === 'evaluations') loadEvaluations();
  else if (tabId === 'reports') loadReports();
  else if (tabId === 'certificates') loadCertificates();
  else if (tabId === 'profile') loadPpas();

  // Fast icon render on active view only
  if (window.lucide) {
    if (activeView) lucide.createIcons({ root: activeView });
    else lucide.createIcons();
  }
}

// Modal Utility
function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
    document.body.classList.add('modal-open');
    lucide.createIcons();
  }
}

function closeModal(modalId) {
  if (modalId) {
    const m = document.getElementById(modalId);
    if (m) {
      m.classList.add('hidden');
      m.classList.remove('flex');
    }
  }
  // Check if any actual modal overlay is still open
  const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
  if (openModals.length === 0) {
    document.body.classList.remove('modal-open', 'overflow-hidden');
  }
}

function handleBackdropClick(event, modalId) {
  // Never close form/edit modals on backdrop click so users never lose their edits accidentally!
  const formModals = ['modal-staff', 'modal-child', 'modal-program', 'modal-lessonplan', 'modal-health', 'modal-ppa'];
  if (formModals.includes(modalId)) {
    return; // Form modal remains open and stable!
  }
  if (event.target.id === modalId) {
    closeModal(modalId);
  }
}

// Close modals on Escape key ONLY for preview/read-only popups, NEVER for form/edit modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const previewModals = ['modal-preview', 'modal-staff-credential', 'modal-child-journey'];
    previewModals.forEach(id => {
      const m = document.getElementById(id);
      if (m && !m.classList.contains('hidden')) {
        closeModal(id);
      }
    });
  }
});

// ==========================================
// 3. MASTER PROFIL PPA & MULTI-PPA SELURUH INDONESIA
// ==========================================
async function loadPpas() {
  try {
    const res = await fetch('/api/ppas');
    ppasData = await res.json();

    // Populate navbar selector
    const navSelect = document.getElementById('global-ppa-selector');
    if (navSelect) {
      navSelect.innerHTML = '';
      ppasData.forEach(p => {
        navSelect.innerHTML += `<option value="${p.id}" ${p.id == currentPpaId ? 'selected' : ''}>${p.code} - ${p.name} (${p.city || 'Sentra'})</option>`;
      });
    }

    // Populate login selector
    const loginSelect = document.getElementById('login-ppa-select');
    if (loginSelect) {
      loginSelect.innerHTML = '';
      ppasData.forEach(p => {
        loginSelect.innerHTML += `<option value="${p.id}" ${p.id == currentPpaId ? 'selected' : ''}>${p.code} - ${p.name} (${p.church_district || p.city})</option>`;
      });
    }

    // Update count badge in tab 11
    const countBadge = document.getElementById('ppa-count-badge');
    if (countBadge) countBadge.innerText = `${ppasData.length} PPA Terdaftar`;

    // Render PPA Grid in Tab 11
    renderPpasGrid();
  } catch (err) {
    console.error('Error loading PPAs:', err);
  }
}

function renderPpasGrid() {
  const container = document.getElementById('ppas-grid-container');
  if (!container) return;
  container.innerHTML = '';

  ppasData.forEach(p => {
    const isActive = p.id == currentPpaId;
    container.innerHTML += `
      <div class="p-4 rounded-2xl border-2 transition ${isActive ? 'border-blue-900 bg-blue-50/70 shadow-md ring-2 ring-blue-800/20' : 'border-slate-200 bg-white hover:border-slate-300'} flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-xs font-black ${isActive ? 'bg-blue-900 text-amber-300' : 'bg-slate-100 text-slate-700'} px-2.5 py-0.5 rounded-md">
              ${p.code}
            </span>
            ${isActive ? `
              <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Aktif Dipilih</span>
              </span>
            ` : `
              <button onclick="changeActivePpa(${p.id})" class="text-[11px] font-bold text-blue-900 hover:text-blue-700 underline">
                Pilih PPA Ini
              </button>
            `}
          </div>

          <h4 class="font-extrabold text-sm text-slate-900 leading-tight">${p.name}</h4>
          <p class="text-[11px] font-semibold text-slate-600 mt-1">${p.church_name}</p>
          <p class="text-[10px] text-slate-500">${p.church_district || '-'} • ${p.city || 'Indonesia'}</p>
          
          <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center space-x-2 text-[10px] text-slate-500">
            <img src="${p.church_logo_url || '/assets/logo_gnkp_indonesia.png'}" alt="Logo Gereja" class="w-6 h-7 object-contain">
            <div class="flex-1 truncate">
              <span class="block font-semibold text-slate-700">PJ: ${p.partnership_head_name || '-'}</span>
              <span class="block">Koord: ${p.coordinator_name || '-'}</span>
            </div>
            <img src="${p.ppa_logo_url || '/assets/logo_ppa_agape.png'}" alt="Logo PPA" class="w-6 h-6 object-contain">
          </div>
        </div>

        <div class="mt-4 pt-2.5 border-t border-slate-200 flex items-center justify-between">
          <button onclick="changeActivePpa(${p.id})" class="text-xs font-bold px-3 py-1.5 rounded-xl ${isActive ? 'bg-blue-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
            ${isActive ? '✓ Sedang Aktif' : 'Aktifkan PPA'}
          </button>
          <div class="space-x-1">
            <button onclick="openModalPpa(${p.id})" class="text-amber-800 hover:text-amber-950 font-bold text-xs p-1">Edit</button>
            <button onclick="deletePpa(${p.id})" class="text-red-700 hover:text-red-900 font-bold text-xs p-1" ${ppasData.length <= 1 ? 'disabled title="Minimal harus ada 1 PPA"' : ''}>Hapus</button>
          </div>
        </div>
      </div>
    `;
  });
}

async function changeActivePpa(id) {
  currentPpaId = parseInt(id);
  const p = ppasData.find(item => item.id == currentPpaId);

  // Update dropdown values
  const navSelect = document.getElementById('global-ppa-selector');
  if (navSelect) navSelect.value = currentPpaId;
  const loginSelect = document.getElementById('login-ppa-select');
  if (loginSelect) loginSelect.value = currentPpaId;

  // Reload profile & active data
  await loadPpaProfile(currentPpaId);
  renderPpasGrid();
  await loadDashboard();
  await loadPrograms();
  await loadCohortsAndChildren();
  await loadHealthRecords();
  await loadReports();
  await loadCertificates();

  lucide.createIcons();
}

function onLoginPpaChange(id) {
  changeActivePpa(id);
  const p = ppasData.find(item => item.id == id);
  if (p) {
    const badge = document.getElementById('login-active-badge');
    if (badge) badge.innerText = `${p.name} • ${p.code}`;
  }
}

async function loadPpaProfile(id) {
  try {
    const targetId = id || currentPpaId;
    const res = await fetch(`/api/profile?ppa_id=${targetId}`);
    ppaProfile = await res.json();
    
    if (ppaProfile.code && ppaProfile.name) {
      document.getElementById('nav-ppa-badge').innerText = `${ppaProfile.name} (${ppaProfile.code})`;
      document.getElementById('nav-church-subtitle').innerText = `${ppaProfile.church_name} ${ppaProfile.church_district || ''} | Mitra Compassion`;
    }

    // Populate Profile Form in Tab 11
    if (document.getElementById('prof-id')) {
      document.getElementById('prof-id').value = ppaProfile.id || '';
      document.getElementById('prof-code').value = ppaProfile.code || '';
      document.getElementById('prof-name').value = ppaProfile.name || '';
      document.getElementById('prof-church').value = ppaProfile.church_name || '';
      document.getElementById('prof-district').value = ppaProfile.church_district || '';
      document.getElementById('prof-membership').value = ppaProfile.church_membership || 'ANGGOTA PGI';
      document.getElementById('prof-address').value = ppaProfile.address || '';
      document.getElementById('prof-city').value = ppaProfile.city || '';
      document.getElementById('prof-phone').value = ppaProfile.phone || '';
      document.getElementById('prof-email').value = ppaProfile.email || '';
      document.getElementById('prof-pj-name').value = ppaProfile.partnership_head_name || '';
      document.getElementById('prof-coord-name').value = ppaProfile.coordinator_name || '';
      document.getElementById('prof-church-logo').value = ppaProfile.church_logo_url || '/assets/logo_gnkp_indonesia.png';
      document.getElementById('prof-ppa-logo').value = ppaProfile.ppa_logo_url || '/assets/logo_ppa_agape.png';
      document.getElementById('prof-stamp-logo').value = ppaProfile.stamp_url || '/assets/stempel_ppa_agape.png';
    }

    // Update Showcase Kop Surat Visual Preview
    const scChurch = document.getElementById('showcase-kop-church');
    if (scChurch) {
      scChurch.innerText = ppaProfile.church_name || 'GEREJA NIHA KERISO PROTESTAN INDONESIA';
      const scDistrict = document.getElementById('showcase-kop-district');
      if (scDistrict) scDistrict.innerText = ppaProfile.church_district || 'DISTRIK 3 DENNINGER';
      const scName = document.getElementById('showcase-kop-name');
      if (scName) scName.innerText = ppaProfile.name || 'PUSAT PENGEMBANGAN ANAK IO-0118 AGAPE DENNINGER';
      const scAddr = document.getElementById('showcase-kop-address');
      if (scAddr) scAddr.innerText = `${ppaProfile.address || ''} ${ppaProfile.city || ''} WA: ${ppaProfile.phone || ''}`;
      const scPj = document.getElementById('showcase-kop-pj');
      if (scPj) scPj.innerText = ppaProfile.partnership_head_name || 'SNK. Arozato Harefa, S.Pd';
      const scCoord = document.getElementById('showcase-kop-coord');
      if (scCoord) scCoord.innerText = ppaProfile.coordinator_name || 'Oryet Fanolo Harefa';
      const scChurchLogo = document.getElementById('showcase-kop-church-logo');
      if (scChurchLogo) scChurchLogo.src = ppaProfile.church_logo_url || '/assets/logo_gnkp_indonesia.png';
      const scPpaLogo = document.getElementById('showcase-kop-ppa-logo');
      if (scPpaLogo) scPpaLogo.src = ppaProfile.ppa_logo_url || '/assets/logo_ppa_agape.png';
      const scStamp = document.getElementById('showcase-kop-stamp');
      if (scStamp) scStamp.src = ppaProfile.stamp_url || '/assets/stempel_ppa_agape.png';
    }
  } catch (err) {
    console.error('Error loading PPA profile:', err);
  }
}

async function savePpaProfile() {
  try {
    const profId = document.getElementById('prof-id').value;
    const payload = {
      code: document.getElementById('prof-code').value,
      name: document.getElementById('prof-name').value,
      church_name: document.getElementById('prof-church').value,
      church_district: document.getElementById('prof-district').value,
      church_membership: document.getElementById('prof-membership').value,
      address: document.getElementById('prof-address').value,
      city: document.getElementById('prof-city').value,
      phone: document.getElementById('prof-phone').value,
      email: document.getElementById('prof-email').value,
      partnership_head_name: document.getElementById('prof-pj-name').value,
      partnership_head_title: 'Penanggungjawab Kemitraan',
      coordinator_name: document.getElementById('prof-coord-name').value,
      coordinator_title: 'Koordinator PPA',
      church_logo_url: document.getElementById('prof-church-logo').value || '/assets/logo_gnkp_indonesia.png',
      ppa_logo_url: document.getElementById('prof-ppa-logo').value || '/assets/logo_ppa_agape.png',
      stamp_url: document.getElementById('prof-stamp-logo').value || '/assets/stempel_ppa_agape.png'
    };

    const res = await fetch(`/api/ppas/${profId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Profil PPA berhasil diperbarui!', 'success');
      await loadPpas();
      await loadPpaProfile(profId);
    } else {
      showToast('Gagal menyimpan profil PPA.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan saat menyimpan profil PPA.', 'error');
  }
}

function openModalPpa(id) {
  document.getElementById('form-new-ppa').reset();
  if (id) {
    const p = ppasData.find(item => item.id == id);
    if (p) {
      document.getElementById('modal-ppa-id').value = p.id;
      document.getElementById('new-ppa-code').value = p.code;
      document.getElementById('new-ppa-name').value = p.name;
      document.getElementById('new-ppa-church').value = p.church_name;
      document.getElementById('new-ppa-district').value = p.church_district || '';
      document.getElementById('new-ppa-membership').value = p.church_membership || 'ANGGOTA PGI';
      document.getElementById('new-ppa-address').value = p.address || '';
      document.getElementById('new-ppa-city').value = p.city || '';
      document.getElementById('new-ppa-phone').value = p.phone || '';
      document.getElementById('new-ppa-email').value = p.email || '';
      document.getElementById('new-ppa-pj').value = p.partnership_head_name || '';
      document.getElementById('new-ppa-coord').value = p.coordinator_name || '';
      document.getElementById('new-ppa-church-logo').value = p.church_logo_url || '/assets/logo_gnkp_indonesia.png';
      document.getElementById('new-ppa-ppa-logo').value = p.ppa_logo_url || '/assets/logo_ppa_agape.png';
      document.getElementById('new-ppa-stamp').value = p.stamp_url || '/assets/stempel_ppa_agape.png';
      document.getElementById('modal-ppa-title').innerText = `Edit Profil PPA: ${p.name}`;
    }
  } else {
    document.getElementById('modal-ppa-id').value = '';
    document.getElementById('new-ppa-church-logo').value = '/assets/logo_gnkp_indonesia.png';
    document.getElementById('new-ppa-ppa-logo').value = '/assets/logo_ppa_agape.png';
    document.getElementById('new-ppa-stamp').value = '/assets/stempel_ppa_agape.png';
    document.getElementById('modal-ppa-title').innerText = 'Daftarkan Pusat Pengembangan Anak (PPA) Baru di Indonesia';
  }
  openModal('modal-ppa');
}

async function handleNewPpaSubmit(e) {
  e.preventDefault();
  const ppaId = document.getElementById('modal-ppa-id').value;
  const payload = {
    code: document.getElementById('new-ppa-code').value,
    name: document.getElementById('new-ppa-name').value,
    church_name: document.getElementById('new-ppa-church').value,
    church_district: document.getElementById('new-ppa-district').value,
    church_membership: document.getElementById('new-ppa-membership').value,
    address: document.getElementById('new-ppa-address').value,
    city: document.getElementById('new-ppa-city').value,
    phone: document.getElementById('new-ppa-phone').value,
    email: document.getElementById('new-ppa-email').value,
    partnership_head_name: document.getElementById('new-ppa-pj').value,
    partnership_head_title: 'Penanggungjawab Kemitraan',
    coordinator_name: document.getElementById('new-ppa-coord').value,
    coordinator_title: 'Koordinator PPA',
    church_logo_url: document.getElementById('new-ppa-church-logo').value || '/assets/logo_gnkp_indonesia.png',
    ppa_logo_url: document.getElementById('new-ppa-ppa-logo').value || '/assets/logo_ppa_agape.png',
    stamp_url: document.getElementById('new-ppa-stamp').value || '/assets/stempel_ppa_agape.png'
  };

  const url = ppaId ? `/api/ppas/${ppaId}` : '/api/ppas';
  const method = ppaId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const saved = await res.json();
      showToast(ppaId ? 'Profil PPA berhasil diperbarui!' : 'PPA Baru berhasil didaftarkan!', 'success');
      closeModal('modal-ppa');
      await loadPpas();
      if (!ppaId && saved.id) {
        changeActivePpa(saved.id);
      }
    } else {
      const err = await res.json();
      showToast(err.error || 'Gagal menyimpan data PPA.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menyimpan PPA.', 'error');
  }
}

async function deletePpa(id) {
  const p = ppasData.find(item => item.id == id);
  const name = p ? p.name : `PPA #${id}`;
  if (confirm(`Apakah Anda yakin ingin menghapus "${name}"?`)) {
    try {
      const res = await fetch(`/api/ppas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('PPA berhasil dihapus.', 'success');
        await loadPpas();
        if (currentPpaId == id && ppasData.length > 0) {
          changeActivePpa(ppasData[0].id);
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menghapus PPA.', 'error');
      }
    } catch (err) {
      showToast('Kesalahan koneksi saat menghapus PPA.', 'error');
    }
  }
}

// ==========================================
// 4. DATA PROGRAM SESUAI KEWENANGAN AKUN (RBAC) & DASHBOARD
// ==========================================

// Memuat data program dari backend berdasarkan scope token akun yang aktif
async function loadProgramsData() {
  try {
    const res = await fetch(`/api/programs?ppa_id=${currentPpaId}`);
    if (res.ok) {
      programsData = await res.json();
      if (!Array.isArray(programsData)) programsData = [];
    } else {
      programsData = [];
    }

    // Perbarui dropdown pilihan program di Lesson Plan & Presensi sesuai cakupan akun
    const lpSelect = document.getElementById('lp-program-select');
    if (lpSelect) {
      lpSelect.innerHTML = '';
      if (programsData.length > 0) {
        programsData.forEach(p => {
          lpSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.cohort_name})</option>`;
        });
      } else {
        lpSelect.innerHTML = '<option value="">-- Tidak ada program dalam cakupan akun Anda --</option>';
      }
    }

    const attSelect = document.getElementById('attendance-prog-select');
    if (attSelect) {
      attSelect.innerHTML = '';
      if (programsData.length > 0) {
        programsData.forEach(p => {
          attSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.cohort_name})</option>`;
        });
      } else {
        attSelect.innerHTML = '<option value="">-- Tidak ada program dalam cakupan akun Anda --</option>';
      }
    }
  } catch (err) {
    console.error('Error loading scoped programs data:', err);
    programsData = [];
  }
}

// Render tabel matriks akuntabilitas program pada Ringkasan (Dashboard)
function renderDashboardProgramsTable() {
  const auditTbody = document.getElementById('audit-table-body');
  const titleEl = document.getElementById('audit-panel-title');
  const descEl = document.getElementById('audit-panel-desc');
  const badgeEl = document.getElementById('audit-panel-badge');
  const iconEl = document.getElementById('audit-panel-icon');

  if (!auditTbody) return;
  auditTbody.innerHTML = '';

  const isLeader = (currentRole === 'koordinator_ppa' || currentRole === 'admin');
  const isMentor = (currentRole === 'mentor');
  const isTutor = (currentRole === 'tutor');
  const isSupervisor = (currentRole === 'komisi_pengawas' || currentRole === 'compassion_pusat');

  // Sesuaikan Judul & Header Panel Dashboard dengan Kewenangan Akun
  if (isTutor) {
    if (titleEl) titleEl.innerText = 'Modul Keterampilan & Vokasi Penugasan Anda';
    if (descEl) descEl.innerText = 'Daftar program keahlian yang Anda bimbing sebagai Instruktur / Tutor Vokasi.';
    if (badgeEl) {
      badgeEl.innerText = `Cakupan Akun: ${currentUser?.full_name || 'Tutor'}`;
      badgeEl.className = 'bg-purple-100 text-purple-950 text-xs px-3.5 py-1.5 rounded-full font-black border border-purple-300 self-start sm:self-auto';
    }
    if (iconEl) iconEl.innerHTML = `<i data-lucide="graduation-cap" class="w-5 h-5 text-purple-700"></i>`;
  } else if (isMentor) {
    if (titleEl) titleEl.innerText = 'Program Pembelajaran Kelompok Dampingan Anda';
    if (descEl) descEl.innerText = 'Kurikulum holistik 4 pilar di bawah tanggung jawab kelompok usia Anda.';
    if (badgeEl) {
      badgeEl.innerText = `Cakupan Akun: ${currentUser?.full_name || 'Mentor'}`;
      badgeEl.className = 'bg-emerald-100 text-emerald-950 text-xs px-3.5 py-1.5 rounded-full font-black border border-emerald-300 self-start sm:self-auto';
    }
    if (iconEl) iconEl.innerHTML = `<i data-lucide="heart-handshake" class="w-5 h-5 text-emerald-700"></i>`;
  } else {
    if (titleEl) titleEl.innerText = 'Evaluasi Pengawasan: Matriks Akuntabilitas Program (Target vs Capaian)';
    if (descEl) descEl.innerText = 'Menguji dampak riil Lesson Plan dan kegiatan terhadap target yang ditetapkan.';
    if (badgeEl) {
      badgeEl.innerText = '✓ Seluruh Target Terpenuhi';
      badgeEl.className = 'bg-emerald-100 text-emerald-900 text-xs px-3.5 py-1.5 rounded-full font-extrabold border border-emerald-300 self-start sm:self-auto';
    }
    if (iconEl) iconEl.innerHTML = `<i data-lucide="file-search" class="w-5 h-5 text-blue-900"></i>`;
  }

  // Tampilkan program yang berada di bawah wewenang akun aktif saja
  if (!programsData || programsData.length === 0) {
    auditTbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-slate-500 font-medium italic">
          Belum ada modul atau program yang berada di bawah penugasan akun Anda.
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  programsData.forEach(p => {
    const canEditProg = isLeader || (isMentor && p.mentor_id === currentUser?.id);
    const canDeleteProg = isLeader;

    let actionsHtml = `
      <button onclick="previewProgram(${p.id})" class="text-blue-700 hover:text-blue-900 font-bold" title="Lihat Rincian Program">Detail</button>
    `;

    if (canEditProg || isLeader) {
      actionsHtml += `
        <button onclick="openEnrollmentModal(${p.id})" class="text-indigo-700 hover:text-indigo-900 font-bold ml-2" title="Kelola Peserta Program">Peserta (${p.enrolled_count || 0})</button>
      `;
    }

    if (isTutor) {
      actionsHtml += `
        <button onclick="openTutorLessonPlan(${p.id})" class="text-purple-700 hover:text-purple-900 font-bold ml-2" title="Kelola Lesson Plan Modul Ini">Lesson Plan</button>
      `;
    }

    if (canEditProg) {
      actionsHtml += `
        <button onclick="editProgram(${p.id})" class="text-amber-700 hover:text-amber-900 font-bold ml-2" title="Ubah Program">Edit</button>
      `;
    }

    if (canDeleteProg) {
      actionsHtml += `
        <button onclick="deleteProgram(${p.id})" class="text-red-700 hover:text-red-900 font-bold ml-2" title="Hapus Program">Hapus</button>
      `;
    }

    auditTbody.innerHTML += `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="p-3 font-bold text-slate-900">${p.name}</td>
        <td class="p-3"><span class="bg-blue-50 text-blue-900 px-2.5 py-0.5 rounded-full font-bold text-[11px]">${p.execution_type}</span></td>
        <td class="p-3 font-semibold text-slate-700">${p.pillar}</td>
        <td class="p-3 text-slate-600 font-medium">${p.cohort_name}</td>
        <td class="p-3 text-slate-600">${p.mentor_name}${p.tutor_name ? ' / <span class="font-bold text-purple-900">' + p.tutor_name + '</span>' : ''}</td>
        <td class="p-3 text-center"><span class="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md font-bold text-[11px]">${p.status}</span></td>
        <td class="p-3 text-center space-x-1 whitespace-nowrap">
          ${actionsHtml}
        </td>
      </tr>
    `;
  });

  lucide.createIcons();
}

function openTutorLessonPlan(programId) {
  showTab('lessonplans');
  const lpSelect = document.getElementById('lp-program-select');
  if (lpSelect) {
    lpSelect.value = programId;
  }
  loadLessonPlans(programId);
}

async function loadDashboard() {
  try {
    const res = await fetch(`/api/analytics/dashboard?ppa_id=${currentPpaId}`);
    const data = await res.json();
    const statChildren = document.getElementById('stat-children');
    const statPrograms = document.getElementById('stat-programs');
    const statAttendance = document.getElementById('stat-attendance');
    const statChildrenSub = document.getElementById('stat-children-sub');
    const statProgramsSub = document.getElementById('stat-programs-sub');

    if (statChildren) statChildren.innerText = `${data.totalChildren || 0} Anak`;
    if (statPrograms) statPrograms.innerText = `${data.totalPrograms || 0} Program`;
    if (statAttendance) statAttendance.innerText = `${data.attendanceRate || 0}%`;
    if (statChildrenSub) {
      statChildrenSub.innerText = `${data.totalCohorts || 0} Kelompok Usia Dampingan`;
    }
    if (statProgramsSub) {
      statProgramsSub.innerText = currentUser ? `Cakupan Akun: ${currentUser.title || currentUser.role}` : 'Program Dampingan Aktif';
    }

    // Selalu perbarui matriks akuntabilitas program di dashboard sesuai cakupan akun aktif
    renderDashboardProgramsTable();
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

async function loadPrograms() {
  try {
    if (!programsData || programsData.length === 0) {
      await loadProgramsData();
    }

    // Render matriks di dashboard
    renderDashboardProgramsTable();

    // Render kartu program di Tab Program dengan filter
    filterAndRenderPrograms();
  } catch (err) {
    console.error('Error loading programs:', err);
  }
}

function resetProgFilters() {
  const pPillar = document.getElementById('filter-prog-pillar');
  const pCohort = document.getElementById('filter-prog-cohort');
  const pTutor = document.getElementById('filter-prog-tutor');
  const pSearch = document.getElementById('filter-prog-search');
  if (pPillar) pPillar.value = '';
  if (pCohort) pCohort.value = '';
  if (pTutor) pTutor.value = '';
  if (pSearch) pSearch.value = '';
  filterAndRenderPrograms();
}

function filterAndRenderPrograms() {
  const container = document.getElementById('programs-container');
  if (!container) return;
  container.innerHTML = '';

  if (!Array.isArray(programsData) || programsData.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
        <p class="font-bold text-sm text-slate-700">Tidak ada program dampingan dalam cakupan wewenang akun Anda.</p>
      </div>
    `;
    return;
  }

  const selPillar = document.getElementById('filter-prog-pillar')?.value;
  const selCohort = document.getElementById('filter-prog-cohort')?.value;
  const selTutor = document.getElementById('filter-prog-tutor')?.value;
  const searchQ = (document.getElementById('filter-prog-search')?.value || '').toLowerCase().trim();

  const filtered = programsData.filter(p => {
    if (selPillar && p.pillar !== selPillar) return false;
    if (selCohort) {
      const cohortIdsArr = p.cohort_ids_str ? p.cohort_ids_str.split(',').map(x => x.trim()) : [String(p.cohort_id)];
      if (!cohortIdsArr.includes(String(selCohort))) return false;
    }
    if (selTutor) {
      const matchTutor = p.tutor_name && p.tutor_name.toLowerCase().includes(selTutor.toLowerCase());
      const matchMentor = p.mentor_name && p.mentor_name.toLowerCase().includes(selTutor.toLowerCase());
      if (!matchTutor && !matchMentor) return false;
    }
    if (searchQ) {
      const matchName = (p.name || '').toLowerCase().includes(searchQ);
      const matchBg = (p.background || '').toLowerCase().includes(searchQ);
      const matchTarget = (p.measurable_target || '').toLowerCase().includes(searchQ);
      if (!matchName && !matchBg && !matchTarget) return false;
    }
    return true;
  });

  const countEl = document.getElementById('prog-filter-count');
  if (countEl) countEl.innerText = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
        <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-2xl font-black">🎯</div>
        <p class="font-bold text-sm text-slate-800">Tidak ada program yang cocok dengan filter yang dipilih.</p>
        <p class="text-xs text-slate-500 mt-1">Silakan sesuaikan kriteria pilar atau tutor.</p>
        <button type="button" onclick="resetProgFilters()" class="mt-4 px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-800 transition">
          🔄 Reset Filter Program
        </button>
      </div>
    `;
    return;
  }

  const isLeader = (currentRole === 'koordinator_ppa' || currentRole === 'admin');
  const isMentor = (currentRole === 'mentor');

  filtered.forEach((p, progIndex) => {
    const canEditProg = isLeader || (isMentor && p.mentor_id === currentUser.id);
    const canDeleteProg = isLeader;
    const canManageLp = isLeader || (isTutor && p.tutor_id === currentUser.id) || (isMentor && p.mentor_id === currentUser.id);

    // Full Program Card with Actions
    const isTutor = p.execution_type === 'Dengan Tutor';
    const badgeColor = isTutor ? 'bg-blue-100 text-blue-900 border-blue-200' : (p.execution_type === 'Mandiri Mentor' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-200');

    container.innerHTML += `
      <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition">
        <div class="p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="bg-blue-950 text-white text-xs px-3 py-1 rounded-full font-black shadow-sm">
                No. ${progIndex + 1}
              </span>
              <span class="text-xs px-3 py-1 rounded-full font-extrabold border ${badgeColor}">
                Kategori: ${p.execution_type || 'Dengan Tutor'}
              </span>
              <span class="bg-blue-100 text-blue-900 text-xs px-2.5 py-1 rounded-full font-bold">Pilar ${p.pillar}</span>
              <span class="bg-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-full font-semibold">${p.cohort_name}</span>
              <span class="bg-indigo-100 text-indigo-900 text-xs px-2.5 py-1 rounded-full font-extrabold border border-indigo-200">👥 ${p.enrolled_count || 0} Peserta Firm</span>
              <span class="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">Status: ${p.status}</span>
              ${p.tutor_name ? `
                <span class="bg-purple-100 text-purple-950 text-xs px-2.5 py-1 rounded-full font-black border border-purple-300">
                  💻 Instruktur: ${p.tutor_name}
                </span>
              ` : ''}
            </div>
            <h3 class="text-lg font-black text-blue-950 mt-2">
              <span class="text-indigo-600 font-extrabold mr-1">#${progIndex + 1}.</span> ${p.name}
            </h3>
            <p class="text-xs text-slate-500">${p.semester_name || 'Semester 1'} | Alokasi Waktu: ${p.duration_months} Bulan (${p.target_sessions} Pertemuan)</p>
          </div>
          
          <!-- CRUD Action Buttons: Hanya tampil sesuai kewenangan resmi -->
          <div class="flex items-center space-x-2 shrink-0">
            <button onclick="previewProgram(${p.id})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 flex items-center space-x-1" title="Lihat Rincian">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
              <span>Preview</span>
            </button>
            ${(canEditProg || isLeader) ? `
              <button onclick="openEnrollmentModal(${p.id})" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-300 flex items-center space-x-1" title="Tunjuk / Kelola Peserta Siswa Firm">
                <i data-lucide="users" class="w-3.5 h-3.5"></i>
                <span>Peserta (${p.enrolled_count || 0})</span>
              </button>
            ` : ''}
            ${canEditProg ? `
              <button onclick="editProgram(${p.id})" class="bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-300 flex items-center space-x-1" title="Ubah Program">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                <span>Edit</span>
              </button>
            ` : ''}
            ${canDeleteProg ? `
              <button onclick="deleteProgram(${p.id})" class="bg-red-50 hover:bg-red-100 text-red-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-200 flex items-center space-x-1" title="Hapus Program">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                <span>Hapus</span>
              </button>
            ` : ''}
          </div>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span class="font-bold text-slate-700 block uppercase tracking-wider text-[11px] mb-1">1. Latar Belakang (Kebutuhan Anak):</span>
            <p class="text-slate-600 leading-relaxed">${p.background}</p>
          </div>

          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span class="font-bold text-slate-700 block uppercase tracking-wider text-[11px] mb-1">2. Tujuan Kualitatif (Arah Karakter):</span>
            <p class="text-slate-600 leading-relaxed">${p.qualitative_objective}</p>
          </div>

          <div class="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200">
            <span class="font-bold text-emerald-900 block uppercase tracking-wider text-[11px] mb-1">3. Target Terukur (Tolok Ukur Angka):</span>
            <p class="text-emerald-800 font-semibold leading-relaxed">${p.measurable_target}</p>
            ${p.pmt_menu_details ? `<div class="mt-2 pt-2 border-t border-emerald-200 font-medium text-amber-950"><strong>Menu PMT:</strong> ${p.pmt_menu_details}</div>` : ''}
            <div class="mt-2 pt-2 border-t border-emerald-200 flex justify-between font-bold text-emerald-950">
              <span>Passing Grade:</span>
              <span>Skor ${p.min_passing_score} / 4.0</span>
            </div>
          </div>
        </div>

        <!-- LESSON PLAN INLINE -->
        ${buildLessonPlanSection(p, canManageLp)}
      </div>
    `;
  });

  lucide.createIcons();
}

function buildLessonPlanSection(p, canManageLp) {
  const lps = Array.isArray(p.lesson_plans) ? p.lesson_plans : [];
  const scheduledCount = lps.filter(lp => lp.meeting_date).length;
  const totalCount = lps.length;
  const previewLps = lps.slice(0, 4);
  const hiddenLps = lps.slice(4);
  const hiddenCount = hiddenLps.length;
  const progressPct = totalCount > 0 ? Math.round((scheduledCount / totalCount) * 100) : 0;

  function renderLpRow(lp, isLast) {
    const isScheduled = !!lp.meeting_date;
    let dateStr = '';
    if (isScheduled) {
      try {
        const d = new Date(lp.meeting_date);
        dateStr = d.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
      } catch(e) { dateStr = lp.meeting_date; }
    }
    const timeStr = lp.start_time ? lp.start_time.substring(0,5) : '';
    const borderClass = !isLast ? 'border-b border-slate-100' : '';

    const circleHtml = isScheduled
      ? `<div class="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center shrink-0"><svg class="w-3 h-3 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg></div>`
      : `<div class="w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center shrink-0"><span class="text-[10px] font-black text-slate-500">${lp.session_number}</span></div>`;

    const badgeHtml = isScheduled
      ? `<span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">📅 ${dateStr}${timeStr ? ' ' + timeStr : ''}</span>`
      : `<span class="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap">⬜ Belum dijadwal</span>`;

    const actionBtns = canManageLp ? `
      <div class="flex items-center gap-1 shrink-0 ml-1">
        <button type="button" onclick="openModalEditLessonPlan(${p.id}, ${lp.id})" class="text-indigo-700 hover:text-indigo-900 p-1 hover:bg-indigo-100 rounded transition" title="Ubah Sesi &amp; Jadwal">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button type="button" onclick="deleteLessonPlanInline(${p.id}, ${lp.id})" class="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded transition" title="Hapus Sesi">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    ` : '';

    return `
      <div class="flex items-start gap-3 py-2.5 ${borderClass} hover:bg-slate-50/80 px-2 rounded-xl transition">
        <div class="flex-shrink-0 mt-0.5">${circleHtml}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] font-black text-slate-800">Sesi ${lp.session_number}:</span>
            <span class="text-[11px] font-semibold text-slate-700">${lp.topic || '(Topik belum diisi)'}</span>
          </div>
          ${lp.competency_goal ? `<p class="text-[10px] text-slate-500 mt-0.5 line-clamp-1">${lp.competency_goal}</p>` : ''}
        </div>
        <div class="flex items-center gap-2 flex-shrink-0 text-right">
          ${badgeHtml}
          ${actionBtns}
        </div>
      </div>
    `;
  }

  const addSesiBtn = canManageLp ? `
    <button type="button" onclick="openModalAddLessonPlan(${p.id})"
      class="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white text-[10px] sm:text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
      <span>+ Tambah Sesi &amp; Jadwal</span>
    </button>
  ` : '';

  if (lps.length === 0) {
    return `
      <div class="px-6 pb-5">
        <div class="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4 text-center text-xs text-slate-500">
          <p class="font-bold text-slate-700 mb-1">Belum ada Sesi Pembelajaran (Lesson Plan)</p>
          <p class="text-[11px] text-slate-500 mb-3">Tutor / Mentor dapat menyusun alur sesi yang mempedomani Latar Belakang dan Target di atas.</p>
          ${addSesiBtn ? `<div class="inline-block">${addSesiBtn}</div>` : ''}
        </div>
      </div>
    `;
  }

  const previewRows = previewLps.map((lp, i) => renderLpRow(lp, i === previewLps.length - 1 && hiddenCount === 0)).join('');
  const hiddenRows = hiddenLps.map((lp, i) => renderLpRow(lp, i === hiddenLps.length - 1)).join('');

  const hiddenSection = hiddenCount > 0 ? `
    <div class="hidden px-2" id="lp-extra-${p.id}">${hiddenRows}</div>
    <div class="border-t border-slate-100 px-4 py-2 text-center" id="lp-toggle-${p.id}">
      <button type="button" onclick="toggleLessonPlanExpand(${p.id}, ${hiddenCount})"
        class="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline transition flex items-center gap-1 mx-auto">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        Lihat ${hiddenCount} sesi lagi
      </button>
    </div>
  ` : '';

  return `
    <div class="px-6 pb-5">
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border-b border-slate-200 gap-2 flex-wrap">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            <span class="text-xs font-black text-blue-900">Alur Lesson Plan &amp; Jadwal</span>
            <span class="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">${scheduledCount}/${totalCount} terjadwal</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
              <div class="w-16 sm:w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full" style="width:${progressPct}%"></div>
              </div>
              <span class="text-[10px] font-black text-slate-700">${progressPct}%</span>
            </div>
            ${addSesiBtn}
          </div>
        </div>
        <div class="px-2 divide-y divide-slate-50" id="lp-preview-${p.id}">${previewRows}</div>
        ${hiddenSection}
      </div>
    </div>
  `;
}

function toggleLessonPlanExpand(programId, hiddenCount) {
  const extraEl = document.getElementById('lp-extra-' + programId);
  const toggleEl = document.getElementById('lp-toggle-' + programId);
  if (!extraEl || !toggleEl) return;
  const isHidden = extraEl.classList.contains('hidden');
  if (isHidden) {
    extraEl.classList.remove('hidden');
    toggleEl.innerHTML = `
      <button type="button" onclick="toggleLessonPlanExpand(${programId}, ${hiddenCount})"
        class="text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline transition flex items-center gap-1 mx-auto">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
        Sembunyikan ${hiddenCount} sesi
      </button>
    `;
  } else {
    extraEl.classList.add('hidden');
    toggleEl.innerHTML = `
      <button type="button" onclick="toggleLessonPlanExpand(${programId}, ${hiddenCount})"
        class="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline transition flex items-center gap-1 mx-auto">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        Lihat ${hiddenCount} sesi lagi
      </button>
    `;
  }
}

async function loadTutorsDropdown() {
  const tutorSelect = document.getElementById('prog-tutor');
  if (!tutorSelect) return;
  try {
    const res = await fetch(`/api/staff?role=tutor&ppa_id=${currentPpaId}`);
    if (res.ok) {
      const tutors = await res.json();
      tutorSelect.innerHTML = '<option value="">-- Pilih Instruktur Tutor untuk Modul Ini --</option>' +
        tutors.map(t => `<option value="${t.id}">${t.full_name} (${t.specialization || 'Instruktur Teknis'})</option>`).join('');
    }
  } catch (e) {
    console.warn('Gagal memuat daftar tutor:', e);
  }
}

// Muat kelompok usia sebagai checkboxes multi-select di modal program
async function loadCohortsForProgramModal(selectedIds = []) {
  const container = document.getElementById('prog-cohort-checkboxes');
  if (!container) return;
  try {
    const res = await fetch(`/api/cohorts?ppa_id=${currentPpaId}`);
    if (!res.ok) throw new Error();
    const cohorts = await res.json();
    if (!cohorts || cohorts.length === 0) {
      container.innerHTML = '<div class="col-span-2 text-xs text-red-500 p-2">Belum ada kelompok usia terdaftar.</div>';
      return;
    }
    container.innerHTML = cohorts.map(c => `
      <label class="flex items-center gap-2 p-2 rounded-xl border cursor-pointer hover:bg-indigo-100 transition ${selectedIds.includes(Number(c.id)) ? 'bg-indigo-100 border-indigo-400' : 'bg-white border-slate-200'}">
        <input type="checkbox" name="prog-cohort-cb" value="${c.id}" ${selectedIds.includes(Number(c.id)) ? 'checked' : ''}
          class="accent-indigo-700 w-4 h-4 shrink-0">
        <span class="text-[11px] font-semibold text-slate-800 leading-tight">${c.code}: ${c.name}<br><span class="font-normal text-slate-500">${c.age_range} &middot; ${c.active_children_count || 0} anak</span></span>
      </label>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="col-span-2 text-xs text-red-500 p-2">Gagal memuat daftar kelompok.</div>';
  }
}

// Ambil cohort_ids yang dipilih dari checkboxes
function getSelectedCohortIds() {
  const checks = document.querySelectorAll('input[name="prog-cohort-cb"]:checked');
  return Array.from(checks).map(cb => parseInt(cb.value));
}

function onProgExecTypeChange(val) {
  const cont = document.getElementById('prog-tutor-container');
  const tutorSelect = document.getElementById('prog-tutor');
  if (cont) {
    if (val === 'Dengan Tutor') {
      cont.classList.remove('hidden');
    } else {
      cont.classList.add('hidden');
      if (tutorSelect) tutorSelect.value = '';
    }
  }
}

async function openModalProgram() {
  document.getElementById('form-program').reset();
  document.getElementById('prog-id').value = '';
  document.getElementById('modal-program-title').innerText = 'Buat Usulan Program / Kegiatan Baru';
  await loadTutorsDropdown();
  await loadCohortsForProgramModal([]);
  onProgExecTypeChange(document.getElementById('prog-exec-type').value);
  openModal('modal-program');
}

async function editProgram(id) {
  const p = programsData.find(item => item.id === id);
  if (!p) return;

  await loadTutorsDropdown();

  // Ambil cohort_ids dari program (via API program cohorts atau dari cohort_ids_str)
  let selectedCohortIds = [];
  try {
    const pcRes = await fetch(`/api/programs/${id}/cohorts`);
    if (pcRes.ok) {
      const pCohorts = await pcRes.json();
      selectedCohortIds = pCohorts.map(c => Number(c.cohort_id));
    }
  } catch (e) { /* fallback ke cohort_id */ }
  if (selectedCohortIds.length === 0 && p.cohort_id) selectedCohortIds = [Number(p.cohort_id)];

  await loadCohortsForProgramModal(selectedCohortIds);

  document.getElementById('prog-id').value = p.id;
  document.getElementById('prog-name').value = p.name;
  document.getElementById('prog-exec-type').value = p.execution_type || 'Dengan Tutor';
  document.getElementById('prog-pillar').value = p.pillar;
  document.getElementById('prog-bg').value = p.background;
  document.getElementById('prog-goal').value = p.qualitative_objective;
  document.getElementById('prog-target').value = p.measurable_target;
  document.getElementById('prog-pmt').value = p.pmt_menu_details || '';

  const tutorSelect = document.getElementById('prog-tutor');
  if (tutorSelect) {
    tutorSelect.value = p.tutor_id ? p.tutor_id.toString() : '';
  }
  onProgExecTypeChange(p.execution_type || 'Dengan Tutor');

  document.getElementById('modal-program-title').innerText = `Edit Program: ${p.name}`;
  openModal('modal-program');
}

async function handleProgramSubmit(event) {
  event.preventDefault();
  const progId = document.getElementById('prog-id').value;
  const execType = document.getElementById('prog-exec-type').value;
  const tutorIdVal = document.getElementById('prog-tutor')?.value;

  const selectedCohortIds = getSelectedCohortIds();
  if (!selectedCohortIds || selectedCohortIds.length === 0) {
    showToast('Pilih minimal satu kelompok usia peserta untuk program ini.', 'warning');
    return;
  }

  const payload = {
    name: document.getElementById('prog-name').value,
    execution_type: execType,
    tutor_id: execType === 'Dengan Tutor' && tutorIdVal ? parseInt(tutorIdVal) : null,
    pillar: document.getElementById('prog-pillar').value,
    cohort_id: selectedCohortIds[0],
    cohort_ids: selectedCohortIds,
    duration_months: 3,
    target_sessions: 12,
    background: document.getElementById('prog-bg').value,
    qualitative_objective: document.getElementById('prog-goal').value,
    measurable_target: document.getElementById('prog-target').value,
    pmt_menu_details: document.getElementById('prog-pmt').value || null,
    min_passing_score: 3.0
  };

  const url = progId ? `/api/programs/${progId}` : '/api/programs';
  const method = progId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      showToast(progId ? 'Program berhasil diperbarui!' : 'Program baru berhasil ditambahkan!', 'success');
      closeModal('modal-program');
      await loadProgramsData();
      await loadPrograms();
      await loadDashboard();

      // Jika program baru, langsung buka modal penunjukan peserta firm
      if (!progId && data.id) {
        setTimeout(() => {
          openEnrollmentModal(data.id);
        }, 300);
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.error || 'Gagal menyimpan program.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menyimpan program.', 'error');
  }
}

async function deleteProgram(id) {
  const p = programsData.find(item => item.id === id);
  const name = p ? p.name : 'ini';
  if (confirm(`Apakah Anda yakin ingin menghapus program "${name}"? Seluruh sesi dan jadwal terkait akan ikut terhapus.`)) {
    try {
      const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Program berhasil dihapus.', 'success');
        await loadPrograms();
        await loadDashboard();
      } else {
        showToast('Gagal menghapus program.', 'error');
      }
    } catch (err) {
      showToast('Kesalahan koneksi saat menghapus program.', 'error');
    }
  }
}

function previewProgram(id) {
  const p = programsData.find(item => item.id === id);
  if (!p) return;

  document.getElementById('modal-preview-title').innerText = `Pratinjau Program: ${p.name}`;
  document.getElementById('modal-preview-body').innerHTML = `
    <div class="space-y-3">
      <div class="p-3 bg-blue-50 rounded-xl border border-blue-200">
        <h4 class="font-extrabold text-blue-950 text-sm">${p.name}</h4>
        <p class="text-blue-900 mt-0.5">Kategori: <strong>${p.execution_type}</strong> | Pilar: <strong>${p.pillar}</strong> | Kelompok: <strong>${p.cohort_name}</strong></p>
      </div>
      <div>
        <span class="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">Latar Belakang:</span>
        <p class="text-slate-600 mt-0.5 bg-slate-50 p-2.5 rounded-lg border">${p.background}</p>
      </div>
      <div>
        <span class="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">Tujuan Kualitatif:</span>
        <p class="text-slate-600 mt-0.5 bg-slate-50 p-2.5 rounded-lg border">${p.qualitative_objective}</p>
      </div>
      <div>
        <span class="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">Target Terukur Capaian:</span>
        <p class="text-emerald-900 font-semibold mt-0.5 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">${p.measurable_target}</p>
      </div>
      ${p.pmt_menu_details ? `
        <div>
          <span class="font-bold text-amber-900 block uppercase tracking-wider text-[11px]">Menu Gizi PMT:</span>
          <p class="text-amber-950 mt-0.5 bg-amber-50 p-2.5 rounded-lg border border-amber-200">${p.pmt_menu_details}</p>
        </div>
      ` : ''}
    </div>
  `;
  openModal('modal-preview');
}

// ==========================================
// 4B. MANAJEMEN PESERTA PROGRAM (ENROLLMENT FIRM)
// ==========================================
let currentEnrollProgId = null;
let currentEnrollCandidates = [];

async function openEnrollmentModal(progId) {
  currentEnrollProgId = progId;
  const p = programsData.find(item => item.id === progId);
  
  const progNameEl = document.getElementById('enrollment-modal-prog-name');
  if (progNameEl) {
    if (p) {
      progNameEl.innerHTML = `<strong>${p.name}</strong> &bull; Kelompok: <span class="text-indigo-100 font-semibold">${p.cohort_name}</span> &bull; Pelaksana: <strong>${p.execution_type}${p.tutor_name ? ' (' + p.tutor_name + ')' : ''}</strong>`;
    } else {
      progNameEl.innerText = `Program #${progId}`;
    }
  }

  switchEnrollTab('enrolled');
  await loadEnrolledChildren(progId);
  await loadEnrollmentCandidates(progId);
  openModal('modal-enrollment');
}

function switchEnrollTab(tab) {
  const btnEnrolled = document.getElementById('enroll-tab-enrolled');
  const btnAdd = document.getElementById('enroll-tab-add');
  const panelEnrolled = document.getElementById('enroll-panel-enrolled');
  const panelAdd = document.getElementById('enroll-panel-add');

  if (tab === 'enrolled') {
    if (btnEnrolled) btnEnrolled.className = 'px-4 py-1.5 rounded-xl font-bold text-xs bg-indigo-900 text-white shadow';
    if (btnAdd) btnAdd.className = 'px-4 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
    if (panelEnrolled) panelEnrolled.classList.remove('hidden');
    if (panelAdd) panelAdd.classList.add('hidden');
  } else {
    if (btnEnrolled) btnEnrolled.className = 'px-4 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
    if (btnAdd) btnAdd.className = 'px-4 py-1.5 rounded-xl font-bold text-xs bg-indigo-900 text-white shadow';
    if (panelEnrolled) panelEnrolled.classList.add('hidden');
    if (panelAdd) panelAdd.classList.remove('hidden');
  }
}

async function loadEnrolledChildren(progId) {
  const listEl = document.getElementById('enrolled-list');
  const badgeEl = document.getElementById('enrolled-count-badge');
  if (!listEl) return;

  listEl.innerHTML = '<div class="text-center text-slate-400 py-6 italic">Memuat data peserta...</div>';

  try {
    const res = await fetch(`/api/programs/${progId}/enrollments`);
    if (!res.ok) throw new Error('Gagal memuat peserta');
    const enrolled = await res.json();

    if (badgeEl) badgeEl.innerText = `${enrolled.length} peserta firm`;

    if (enrolled.length === 0) {
      listEl.innerHTML = `
        <div class="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <p class="font-bold text-slate-700">Belum ada anak yang ditunjuk / didaftarkan ke program ini.</p>
          <p class="text-xs text-slate-500 mt-1">Klik tab <strong>"+ Tambah Peserta"</strong> di atas untuk menunjuk siswa yang firm mengikuti kegiatan ini.</p>
        </div>
      `;
      return;
    }

    const isLeader = (currentRole === 'koordinator_ppa' || currentRole === 'admin');
    const isMentor = (currentRole === 'mentor');
    const canManage = isLeader || isMentor;

    listEl.innerHTML = enrolled.map((item, idx) => `
      <div class="flex items-center justify-between p-3 rounded-2xl border ${item.enrollment_status === 'Aktif' ? 'bg-white border-slate-200 hover:border-indigo-200' : 'bg-slate-100 border-slate-200 opacity-60'} transition">
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">${idx + 1}</span>
          <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-900 font-bold flex items-center justify-center shrink-0 overflow-hidden border border-indigo-200">
            ${item.photo_data ? `<img src="${item.photo_data}" class="w-full h-full object-cover">` : (item.nickname ? item.nickname[0].toUpperCase() : item.full_name[0].toUpperCase())}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900 truncate">${idx + 1}. ${item.full_name}</span>
              ${item.nickname ? `<span class="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">"${item.nickname}"</span>` : ''}
              <span class="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-semibold">${item.cohort_name}</span>
              <span class="text-[10px] ${item.enrollment_status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} px-2 py-0.5 rounded-full font-bold">${item.enrollment_status}</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5 font-mono">No. ID: ${item.child_id_compassion || '-'} &bull; Terdaftar: ${item.enrolled_date || '-'}</p>
          </div>
        </div>
        ${canManage ? `
          <div class="shrink-0 ml-2">
            ${item.enrollment_status === 'Aktif' ? `
              <button onclick="removeChildFromProgram(${item.child_id}, '${escapeJs(item.full_name)}')" class="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition">
                Keluarkan
              </button>
            ` : `
              <span class="text-[11px] text-slate-400 italic">Nonaktif</span>
            `}
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (err) {
    listEl.innerHTML = `<div class="p-4 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200">Gagal memuat peserta: ${err.message}</div>`;
  }
}

function escapeJs(str) {
  return (str || '').replace(/'/g, "\\'");
}

async function removeChildFromProgram(childId, childName) {
  if (!confirm(`Apakah Anda yakin ingin mengeluarkan "${childName}" dari program ini?`)) return;
  try {
    const res = await fetch(`/api/programs/${currentEnrollProgId}/enrollments/${childId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      showToast(`Peserta "${childName}" berhasil dikeluarkan dari program.`, 'success');
      await loadEnrolledChildren(currentEnrollProgId);
      await loadEnrollmentCandidates(currentEnrollProgId);
      await loadProgramsData();
      filterAndRenderPrograms();
      renderDashboardProgramsTable();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Gagal mengeluarkan peserta.', 'error');
    }
  } catch (e) {
    showToast('Kesalahan koneksi saat mengeluarkan peserta.', 'error');
  }
}

async function loadEnrollmentCandidates(progId) {
  const candidateListEl = document.getElementById('candidate-list');
  if (!candidateListEl) return;

  candidateListEl.innerHTML = '<div class="text-center text-slate-400 py-6 italic">Memuat kandidat anak dari kelompok program...</div>';

  try {
    const res = await fetch(`/api/programs/${progId}/enrollment-candidates`);
    if (!res.ok) throw new Error('Gagal memuat kandidat');
    currentEnrollCandidates = await res.json();

    if (currentEnrollCandidates.length === 0) {
      candidateListEl.innerHTML = `
        <div class="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <p class="font-bold text-slate-700">Tidak ada anak yang ditemukan pada kelompok usia program ini.</p>
        </div>
      `;
      updateCandidateSelectionCount();
      return;
    }

    candidateListEl.innerHTML = currentEnrollCandidates.map((c, idx) => {
      const isEnrolled = c.already_enrolled === 1 && c.enrollment_status === 'Aktif';
      return `
        <label class="flex items-center justify-between p-2.5 rounded-2xl border ${isEnrolled ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:bg-indigo-50/50 cursor-pointer'} transition">
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-[10px] font-bold text-slate-400 w-5 shrink-0 text-center">${idx + 1}.</span>
            <input type="checkbox" name="candidate-enroll-cb" value="${c.id}" ${isEnrolled ? 'disabled checked' : ''} onchange="updateCandidateSelectionCount()"
              class="accent-indigo-700 w-4 h-4 shrink-0">
            <div class="w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 overflow-hidden text-[10px]">
              ${c.photo_data ? `<img src="${c.photo_data}" class="w-full h-full object-cover">` : (c.nickname ? c.nickname[0].toUpperCase() : c.full_name[0].toUpperCase())}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900 truncate">${c.full_name}</span>
                ${c.nickname ? `<span class="text-[10px] text-slate-500">(${c.nickname})</span>` : ''}
                <span class="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-semibold">${c.cohort_name}</span>
              </div>
              <p class="text-[10px] text-slate-500 font-mono">ID: ${c.child_id_compassion || '-'}</p>
            </div>
          </div>
          <div class="shrink-0 ml-2">
            ${isEnrolled ? '<span class="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">Sudah Terdaftar</span>' : '<span class="text-[10px] text-slate-400">Belum Ikut</span>'}
          </div>
        </label>
      `;
    }).join('');

    updateCandidateSelectionCount();
  } catch (err) {
    candidateListEl.innerHTML = `<div class="p-4 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200">Gagal memuat kandidat: ${err.message}</div>`;
  }
}

function updateCandidateSelectionCount() {
  const checks = document.querySelectorAll('input[name="candidate-enroll-cb"]:checked:not(:disabled)');
  const countEl = document.getElementById('selected-candidates-count');
  if (countEl) countEl.innerText = `${checks.length} dipilih`;
}

function enrollAllCandidates() {
  const checks = document.querySelectorAll('input[name="candidate-enroll-cb"]:not(:disabled)');
  checks.forEach(cb => { cb.checked = true; });
  updateCandidateSelectionCount();
}

function clearCandidateSelection() {
  const checks = document.querySelectorAll('input[name="candidate-enroll-cb"]:not(:disabled)');
  checks.forEach(cb => { cb.checked = false; });
  updateCandidateSelectionCount();
}

async function submitEnrollment() {
  if (!currentEnrollProgId) return;
  const checks = document.querySelectorAll('input[name="candidate-enroll-cb"]:checked:not(:disabled)');
  const childIds = Array.from(checks).map(cb => parseInt(cb.value));

  if (childIds.length === 0) {
    showToast('Pilih minimal satu anak yang akan didaftarkan ke program ini.', 'warning');
    return;
  }

  try {
    const res = await fetch(`/api/programs/${currentEnrollProgId}/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_ids: childIds })
    });

    if (res.ok) {
      const data = await res.json();
      showToast(data.message || `${childIds.length} peserta firm berhasil didaftarkan!`, 'success');
      await loadEnrolledChildren(currentEnrollProgId);
      await loadEnrollmentCandidates(currentEnrollProgId);
      switchEnrollTab('enrolled');
      await loadProgramsData();
      filterAndRenderPrograms();
      renderDashboardProgramsTable();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Gagal mendaftarkan peserta.', 'error');
    }
  } catch (e) {
    showToast('Kesalahan koneksi saat mendaftarkan peserta.', 'error');
  }
}

// ==========================================
// 5. LESSON PLAN CRUD
// ==========================================
async function loadLessonPlans(programId) {
  if (!programsData || programsData.length === 0) {
    await loadProgramsData();
  }

  const selectedFromDom = document.getElementById('lp-program-select')?.value;
  const pId = programId || selectedFromDom || (programsData[0] ? programsData[0].id : null);

  const container = document.getElementById('lessonplans-table-container');
  if (!container) return;

  if (!pId) {
    container.innerHTML = `<p class="p-6 text-center text-slate-400 italic">Tidak ada modul atau program yang ditugaskan kepada Anda saat ini.</p>`;
    return;
  }

  // Sinkronkan pilihan dropdown bila dibuka dari tombol cepat
  const lpSelect = document.getElementById('lp-program-select');
  if (lpSelect && lpSelect.value != pId) {
    lpSelect.value = pId;
  }

  try {
    const res = await fetch(`/api/programs/${pId}/lesson-plans`);
    const plans = await res.json();

    container.innerHTML = '';

    if (!Array.isArray(plans) || plans.length === 0) {
      container.innerHTML = `<p class="p-6 text-center text-slate-400">Belum ada sesi pertemuan. Klik tombol "+ Tambah Sesi" di atas.</p>`;
      return;
    }

    const isLeader = ['koordinator_ppa', 'admin'].includes(currentUser?.role);
    const isTutor = currentUser?.role === 'tutor';
    const canDeleteLP = isLeader || isTutor;

    plans.forEach(lp => {
      container.innerHTML += `
        <div class="p-5 hover:bg-slate-50 flex items-start justify-between space-x-4">
          <div class="flex items-start space-x-3.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white font-black flex items-center justify-center shrink-0 shadow">
              #${lp.session_number}
            </div>
            <div class="flex-1 text-xs">
              <div class="flex items-center space-x-2">
                <h4 class="font-bold text-slate-900 text-sm">${lp.topic}</h4>
                <span class="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded text-[11px]">Metode: ${lp.learning_methods || 'Praktik'}</span>
              </div>
              <p class="text-slate-600 mt-1"><span class="font-semibold text-slate-700">Sasaran Kompetensi:</span> ${lp.competency_goal}</p>
              <div class="mt-2 flex flex-wrap gap-2 text-slate-500">
                <span class="bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 font-medium">Alat/Bahan: ${lp.materials_tools}</span>
                <span class="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-lg border border-emerald-200 font-semibold">Indikator: ${lp.success_indicator}</span>
              </div>
            </div>
          </div>
          ${canDeleteLP ? `
            <button onclick="deleteLessonPlan(${lp.id})" class="text-red-700 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 text-xs font-bold shrink-0" title="Hapus Sesi">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          ` : ''}
        </div>
      `;
    });

    lucide.createIcons();
  } catch (err) {
    console.error('Error loading lesson plans:', err);
  }
}

// [REMOVED: openModalLessonPlan legacy]

// [REMOVED: handleLessonPlanSubmit legacy]

// [REMOVED: deleteLessonPlan legacy]

// ==========================================
// 6. HEALTH & NUTRITION CRUD
// ==========================================
async function loadHealthRecords() {
  try {
    if (!childrenData || childrenData.length === 0) {
      const chRes = await fetch(`/api/children?ppa_id=${currentPpaId}`);
      childrenData = await chRes.json();
    }

    const res = await fetch(`/api/health-records?ppa_id=${currentPpaId}`);
    healthRecords = await res.json();

    const tbody = document.getElementById('health-table-body');
    const childSelect = document.getElementById('health-child');
    if (tbody) tbody.innerHTML = '';
    if (childSelect) childSelect.innerHTML = '';

    // Populate child select in modal with scoped children
    if (childSelect && Array.isArray(childrenData)) {
      childrenData.forEach(ch => {
        childSelect.innerHTML += `<option value="${ch.id}">${ch.full_name} (${ch.child_id_compassion}) - ${ch.cohort_name}</option>`;
      });
    }

    populateAllFilterDropdowns();
    filterAndRenderHealth();
  } catch (err) {
    console.error('Error loading health records:', err);
  }
}

function filterAndRenderHealth() {
  const tbody = document.getElementById('health-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!Array.isArray(healthRecords) || healthRecords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-slate-500 font-medium">
          Belum ada rekam catatan fisik & PMT dalam cakupan tugas akun Anda.
        </td>
      </tr>
    `;
    return;
  }

  const selCohort = document.getElementById('health-filter-cohort')?.value;
  const searchQ = (document.getElementById('health-filter-search')?.value || '').toLowerCase().trim();

  const filtered = healthRecords.filter(h => {
    if (selCohort && h.cohort_id != selCohort) return false;
    if (searchQ) {
      const matchName = (h.child_name || '').toLowerCase().includes(searchQ);
      const matchId = (h.child_id_compassion || '').toLowerCase().includes(searchQ);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-slate-500 font-medium">
          Tidak ada catatan fisik yang cocok dengan filter.
        </td>
      </tr>
    `;
    return;
  }

  const canDeleteHealth = ['koordinator_ppa', 'admin'].includes(currentUser?.role);

  filtered.forEach(h => {
    tbody.innerHTML += `
      <tr class="hover:bg-slate-50">
        <td class="p-3 font-bold text-slate-900">${h.child_name} <span class="text-slate-400 font-normal">(${h.cohort_name})</span></td>
        <td class="p-3 text-center font-bold text-emerald-900">${h.weight_kg} kg</td>
        <td class="p-3 text-center font-bold text-blue-900">${h.height_cm} cm</td>
        <td class="p-3 text-center"><span class="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">${h.nutrition_status}</span></td>
        <td class="p-3 text-slate-700">${h.gross_motor_skills || '-'}</td>
        <td class="p-3 text-center">
          ${canDeleteHealth ? `
            <button onclick="deleteHealth(${h.id})" class="text-red-700 hover:text-red-900 font-bold">Hapus</button>
          ` : `<span class="text-slate-400 text-xs">-</span>`}
        </td>
      </tr>
    `;
  });
}

function openModalHealth() {
  document.getElementById('form-health').reset();
  openModal('modal-health');
}

async function handleHealthSubmit(event) {
  event.preventDefault();
  const payload = {
    child_id: parseInt(document.getElementById('health-child').value),
    check_date: new Date().toISOString().split('T')[0],
    weight_kg: parseFloat(document.getElementById('health-weight').value),
    height_cm: parseFloat(document.getElementById('health-height').value),
    nutrition_status: document.getElementById('health-status').value,
    gross_motor_skills: document.getElementById('health-motorik').value,
    pmt_menu_served: document.getElementById('health-pmt').value,
    mentor_notes: 'Tercatat sehat dalam evaluasi triwulan.'
  };

  try {
    const res = await fetch('/api/health-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('Data fisik & PMT berhasil dicatat!', 'success');
      closeModal('modal-health');
      await loadHealthRecords();
    }
  } catch (err) {
    showToast('Gagal menyimpan data.', 'error');
  }
}

async function deleteHealth(id) {
  if (confirm('Hapus rekam data fisik ini?')) {
    try {
      const res = await fetch(`/api/health-records/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Data berhasil dihapus.', 'success');
        await loadHealthRecords();
      }
    } catch (err) {
      showToast('Gagal menghapus data.', 'error');
    }
  }
}

// ==========================================
// 7. CHILDREN CRUD (DATA BIODATA LENGKAP & FOTO ANAK)
// ==========================================
function previewChildPhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('child-photo-preview').src = e.target.result;
      document.getElementById('child-photo-data').value = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// ==========================================
// 6B. AGE COHORTS CRUD (PEMBENTUKAN & MANAJEMEN KELOMPOK USIA)
// ==========================================
async function openModalManageCohorts() {
  try {
    const res = await fetch(`/api/cohorts?ppa_id=${currentPpaId}`);
    if (res.ok) {
      cohortsData = await res.json();
    }
  } catch (e) {
    console.warn('Gagal memuat daftar kelompok:', e);
  }

  const tbody = document.getElementById('manage-cohorts-table-body');
  const totalBadge = document.getElementById('cohort-total-badge');
  const childrenBadge = document.getElementById('cohort-children-badge');

  let totalActiveChildren = 0;
  if (totalBadge) totalBadge.innerText = cohortsData.length;

  if (tbody) {
    if (!cohortsData || cohortsData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-8 text-center text-slate-400">
            <div class="flex flex-col items-center justify-center space-y-2">
              <i data-lucide="layers" class="w-8 h-8 text-slate-300"></i>
              <p class="font-bold">Belum ada kelompok usia yang dibentuk.</p>
              <button type="button" onclick="openModalCohortForm()" class="text-xs bg-blue-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-800 transition">
                + Bentuk Kelompok Pertama
              </button>
            </div>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = cohortsData.map(c => {
        const count = c.active_children_count || 0;
        totalActiveChildren += count;
        const mentorDisplay = c.mentor_name 
          ? `<div class="flex items-center space-x-1.5">
               <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-900 font-black flex items-center justify-center text-[10px] shrink-0">
                 ${c.mentor_name.charAt(0)}
               </span>
               <span class="font-bold text-slate-800">${c.mentor_name}</span>
             </div>`
          : `<span class="text-slate-400 italic text-[11px]">Belum Ditugaskan</span>`;

        return `
          <tr class="hover:bg-slate-50 transition border-b border-slate-100">
            <td class="p-3.5 pl-4 font-mono font-black text-blue-950">
              <span class="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-black">${c.code}</span>
            </td>
            <td class="p-3.5 font-bold text-slate-900">
              ${c.name}
            </td>
            <td class="p-3.5 text-slate-600 font-semibold">
              <span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">${c.age_range || '-'}</span>
            </td>
            <td class="p-3.5">
              ${mentorDisplay}
            </td>
            <td class="p-3.5 text-center">
              <span class="px-2.5 py-1 rounded-full ${count > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-black' : 'bg-slate-100 text-slate-500 font-bold'} text-[11px]">
                ${count} Anak Binaan
              </span>
            </td>
            <td class="p-3.5 pr-4 text-right">
              <div class="flex items-center justify-end space-x-1.5">
                <button type="button" onclick="openModalCohortForm(${c.id})" class="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg font-bold transition" title="Edit Kelompok">
                  <i data-lucide="edit" class="w-4 h-4"></i>
                </button>
                <button type="button" onclick="deleteCohort(${c.id}, '${c.name.replace(/'/g, "\\'")}', ${count})" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold transition" title="Hapus Kelompok">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  if (childrenBadge) childrenBadge.innerText = totalActiveChildren;
  openModal('modal-manage-cohorts');
  lucide.createIcons();
}

async function openModalCohortForm(id = null) {
  // 1. Populate Mentor dropdown from /api/staff?role=mentor
  const mentorSelect = document.getElementById('cohort-form-mentor');
  if (mentorSelect) {
    try {
      const res = await fetch(`/api/staff?role=mentor&ppa_id=${currentPpaId}`);
      if (res.ok) {
        const mentors = await res.json();
        mentorSelect.innerHTML = `<option value="">-- Belum Ditugaskan / Bebas --</option>` +
          mentors.map(m => `
            <option value="${m.id}">${m.full_name} (${m.cohort_name || 'Belum Ada Kelompok'})</option>
          `).join('');
      }
    } catch (e) {
      console.warn('Gagal memuat daftar mentor untuk kelompok:', e);
    }
  }

  const idInput = document.getElementById('cohort-form-id');
  const codeInput = document.getElementById('cohort-form-code');
  const nameInput = document.getElementById('cohort-form-name');
  const rangeInput = document.getElementById('cohort-form-range');
  const titleEl = document.getElementById('modal-cohort-form-title');
  const subEl = document.getElementById('modal-cohort-form-subtitle');

  if (id) {
    // Edit mode
    const cohort = cohortsData.find(c => c.id == id);
    if (idInput) idInput.value = id;
    if (codeInput) codeInput.value = cohort?.code || '';
    if (nameInput) nameInput.value = cohort?.name || '';
    if (rangeInput) rangeInput.value = cohort?.age_range || '';
    if (mentorSelect && cohort?.mentor_id) mentorSelect.value = cohort.mentor_id;

    if (titleEl) titleEl.innerText = `Edit Kelompok: ${cohort?.name || ''}`;
    if (subEl) subEl.innerText = `Perbarui nama, rentang usia, atau alihkan mentor pengampu kelompok.`;
  } else {
    // Create mode
    if (idInput) idInput.value = '';
    const nextNum = (cohortsData && cohortsData.length > 0) ? cohortsData.length + 1 : 1;
    const nextCode = `KEL-${String(nextNum).padStart(2, '0')}`;
    if (codeInput) codeInput.value = nextCode;
    if (nameInput) nameInput.value = `Kelompok ${nextNum}`;
    if (rangeInput) rangeInput.value = '';
    if (mentorSelect) mentorSelect.value = '';

    if (titleEl) titleEl.innerText = 'Bentuk Kelompok Usia Baru';
    if (subEl) subEl.innerText = 'Tentukan kode, nama, rentang usia, dan penugasan mentor wali kelas.';
  }

  openModal('modal-cohort-form');
  lucide.createIcons();
}

async function handleCohortFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('cohort-form-id')?.value;
  const code = document.getElementById('cohort-form-code')?.value.trim();
  const name = document.getElementById('cohort-form-name')?.value.trim();
  const age_range = document.getElementById('cohort-form-range')?.value.trim();
  const mentor_id = document.getElementById('cohort-form-mentor')?.value || null;

  if (!code || !name) {
    showToast('Kode Kelompok dan Nama Kelompok wajib diisi!', 'error');
    return;
  }

  const btn = document.getElementById('btn-save-cohort-submit');
  const origBtnText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin inline-block mr-1">⌛</span> Menyimpan...`;
  }

  try {
    let url = '/api/cohorts';
    let method = 'POST';
    const payload = { ppa_id: currentPpaId, code, name, age_range, mentor_id };

    if (id) {
      url = `/api/cohorts/${id}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan data kelompok usia.');
    }

    closeModal('modal-cohort-form');
    showToast(data.message || 'Data kelompok usia berhasil disimpan!');

    // Refresh cohorts and children
    await loadCohortsAndChildren();
    
    // Refresh manage cohorts table if currently opened
    const manageModal = document.getElementById('modal-manage-cohorts');
    if (manageModal && !manageModal.classList.contains('hidden')) {
      await openModalManageCohorts();
    }
  } catch (err) {
    console.error('Submit cohort failed:', err);
    showToast(err.message || 'Terjadi kesalahan saat memproses kelompok.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnText;
      lucide.createIcons();
    }
  }
}

async function deleteCohort(id, name, childCount) {
  if (childCount > 0) {
    showToast(`Kelompok "${name}" tidak dapat dihapus: masih ada ${childCount} anak binaan. Pindahkan anak ke kelompok lain dahulu.`, 'error');
    return;
  }

  if (!confirm(`Apakah Anda yakin ingin menghapus kelompok "${name}"?\nTindakan ini tidak dapat dibatalkan.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/cohorts/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menghapus kelompok.');
    }

    showToast(data.message || `Kelompok "${name}" berhasil dihapus.`);
    await loadCohortsAndChildren();
    await openModalManageCohorts();
  } catch (err) {
    console.error('Delete cohort failed:', err);
    showToast(err.message || 'Gagal menghapus kelompok.', 'error');
  }
}

// ==========================================
// 7. CHILDREN CRUD (DATA BIODATA LENGKAP & ADVANCED MULTI-FILTER)
// ==========================================
let activeQuickFilter = 'all';

async function loadCohortsAndChildren() {
  try {
    // 1. Load cohorts within account scope
    const coRes = await fetch(`/api/cohorts?ppa_id=${currentPpaId}`);
    cohortsData = await coRes.json();

    // Populate Filter Dropdowns across Tabs (Data Anak, Program, Rapor, Sertifikat, Kesehatan, Modals)
    populateAllFilterDropdowns();

    // 2. Load children within account scope
    const chRes = await fetch(`/api/children?ppa_id=${currentPpaId}`);
    childrenData = await chRes.json();

    const subtitleEl = document.getElementById('children-subtitle');
    if (subtitleEl && Array.isArray(childrenData)) {
      const mentorCount = new Set((cohortsData || []).map(c => c.mentor_id).filter(Boolean)).size;
      subtitleEl.innerText = `Database ${childrenData.length} anak dampingan PPA, terbagi dalam ${cohortsData.length} kelompok usia dan ${mentorCount} mentor pengampu.`;
    }

    // Render dengan filter aktif
    filterAndRenderChildren();
  } catch (err) {
    console.error('Error loading cohorts and children:', err);
  }
}

function populateAllFilterDropdowns() {
  if (!Array.isArray(cohortsData) || cohortsData.length === 0) return;

  const cohortOptions = `<option value="">-- Semua Kelompok (1 - ${cohortsData.length}) --</option>` +
    cohortsData.map(c => `<option value="${c.id}">${c.name} (${c.age_range || ''})</option>`).join('');

  // Dropdown filter tabel
  ['filter-child-cohort', 'filter-prog-cohort', 'report-filter-cohort', 'cert-filter-cohort', 'health-filter-cohort'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const prevVal = el.value;
      el.innerHTML = cohortOptions;
      if (prevVal) el.value = prevVal;
    }
  });

  // Dropdown modal form anak
  const childCohortSelect = document.getElementById('child-cohort');
  if (childCohortSelect) {
    const prevVal = childCohortSelect.value;
    childCohortSelect.innerHTML = cohortsData.map(c => `
      <option value="${c.id}">${c.name} (${c.age_range || ''})</option>
    `).join('');
    if (prevVal) childCohortSelect.value = prevVal;
  }

  // Dropdown modal form program
  const progCohortSelect = document.getElementById('prog-cohort');
  if (progCohortSelect) {
    const prevVal = progCohortSelect.value;
    progCohortSelect.innerHTML = cohortsData.map(c => `
      <option value="${c.id}">${c.name} (${c.age_range || ''})</option>
    `).join('');
    if (prevVal) progCohortSelect.value = prevVal;
  }
}

function setQuickCohortFilter(range) {
  activeQuickFilter = range;

  // Reset visual styles on all pills
  document.querySelectorAll('.mentor-quick-pill').forEach(btn => {
    btn.className = 'mentor-quick-pill px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 shrink-0 transition active:scale-95 hover:bg-slate-200';
  });

  const activeBtn = {
    'all': 'pill-mentor-all',
    '1-2': 'pill-mentor-lestetis',
    '3-4': 'pill-mentor-agus',
    '5-6': 'pill-mentor-junita',
    '7-8': 'pill-mentor-leni',
    '9-10': 'pill-mentor-mei',
    '11-12': 'pill-mentor-fineria',
    '13-15': 'pill-mentor-disisi'
  }[range];

  if (activeBtn && document.getElementById(activeBtn)) {
    document.getElementById(activeBtn).className = 'mentor-quick-pill px-3 py-1.5 rounded-xl bg-blue-900 text-white shadow-xs shrink-0 transition active:scale-95 font-black ring-2 ring-blue-500/50';
  }

  const mentorSelect = document.getElementById('filter-child-mentor');
  const cohortSelect = document.getElementById('filter-child-cohort');

  if (range === 'all') {
    if (mentorSelect) mentorSelect.value = '';
    if (cohortSelect) cohortSelect.value = '';
  } else if (range === '1-2') {
    if (mentorSelect) mentorSelect.value = 'Lestetis Hulu, SE';
    if (cohortSelect) cohortSelect.value = '';
  } else if (range === '3-4') {
    if (mentorSelect) mentorSelect.value = 'Agus Riang Hura, S.Pd';
    if (cohortSelect) cohortSelect.value = '';
  } else if (range === '5-6') {
    if (mentorSelect) mentorSelect.value = 'Junita Prihatini Zebua, S.Th';
    if (cohortSelect) cohortSelect.value = '';
  } else if (range === '7-8') {
    if (mentorSelect) mentorSelect.value = 'Leni Marlina Zega, S.Th';
    if (cohortSelect) cohortSelect.value = '';
  } else if (range === '9-10') {
    if (mentorSelect) mentorSelect.value = 'Mei Krisnawati Zendrato, S.Th';
    if (cohortSelect) cohortSelect.value = '';
  } else if (range === '11-12') {
    if (mentorSelect) mentorSelect.value = 'Fineria Hulu, S.Pd';
    if (cohortSelect) cohortSelect.value = '';
  } else if (range === '13-15') {
    if (mentorSelect) mentorSelect.value = 'Disisi Hati Sarumaha';
    if (cohortSelect) cohortSelect.value = '';
  }

  filterAndRenderChildren();
}

function resetChildFilters() {
  const cohortSelect = document.getElementById('filter-child-cohort');
  const mentorSelect = document.getElementById('filter-child-mentor');
  const gradeSelect = document.getElementById('filter-child-grade');
  const genderSelect = document.getElementById('filter-child-gender');
  const searchInput = document.getElementById('filter-child-search');

  if (cohortSelect) cohortSelect.value = '';
  if (mentorSelect) mentorSelect.value = '';
  if (gradeSelect) gradeSelect.value = '';
  if (genderSelect) genderSelect.value = '';
  if (searchInput) searchInput.value = '';

  setQuickCohortFilter('all');
}

let currentFilteredChildren = [];

function exportChildrenToCSV() {
  const dataToExport = (Array.isArray(currentFilteredChildren) && currentFilteredChildren.length > 0)
    ? currentFilteredChildren
    : childrenData;

  if (!Array.isArray(dataToExport) || dataToExport.length === 0) {
    showToast('Tidak ada data anak untuk diekspor.', 'error');
    return;
  }

  const headers = [
    'No',
    'ID Compassion',
    'Nama Lengkap',
    'Panggilan',
    'Jenis Kelamin',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Kelompok Usia',
    'Mentor Pengampu',
    'Nama Orang Tua / Wali',
    'No HP Orang Tua',
    'Asal Sekolah',
    'Tingkat / Kelas',
    'Hobi',
    'Cita-Cita',
    'Status Dampingan'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = dataToExport.map((ch, idx) => [
    idx + 1,
    escapeCSV(ch.child_id_compassion || '-'),
    escapeCSV(ch.full_name || '-'),
    escapeCSV(ch.nickname || '-'),
    escapeCSV(ch.gender === 'L' ? 'Laki-Laki' : ch.gender === 'P' ? 'Perempuan' : ch.gender || '-'),
    escapeCSV(ch.birth_place || '-'),
    escapeCSV(ch.birth_date || '-'),
    escapeCSV(ch.cohort_name || `Kelompok ${ch.cohort_id}`),
    escapeCSV(ch.mentor_name || '-'),
    escapeCSV(ch.parent_name || `${ch.father_name || ''} / ${ch.mother_name || ''}`.replace(/^\s*\/\s*$/, '-')),
    escapeCSV(ch.parent_phone || '-'),
    escapeCSV(ch.school_name || '-'),
    escapeCSV(ch.school_grade || '-'),
    escapeCSV(ch.hobby || '-'),
    escapeCSV(ch.dream_ambition || '-'),
    escapeCSV(ch.status || 'Aktif')
  ].join(','));

  const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const nowStr = new Date().toISOString().slice(0, 10);
  a.download = `Data_Anak_PPA_IO0118_Agape_${nowStr}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast(`Berhasil mengekspor ${dataToExport.length} data anak dampingan ke Excel / CSV.`);
}

function filterAndRenderChildren() {
  const tbody = document.getElementById('children-table-body');
  if (!tbody) return;

  if (!Array.isArray(childrenData) || childrenData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="p-8 text-center text-slate-500 font-medium">
          Tidak ada data anak dampingan dalam cakupan tugas akun Anda.
        </td>
      </tr>
    `;
    return;
  }

  const selCohort = document.getElementById('filter-child-cohort')?.value;
  const selMentor = document.getElementById('filter-child-mentor')?.value;
  const selGrade = document.getElementById('filter-child-grade')?.value;
  const selGender = document.getElementById('filter-child-gender')?.value;
  const searchQuery = (document.getElementById('filter-child-search')?.value || '').toLowerCase().trim();

  // Pemetaan Mentor ke Cohort ID bila data anak belum punya kolom mentor_name
  const mentorCohortMap = {
    'Lestetis Hulu, SE': [1, 2],
    'Agus Riang Hura, S.Pd': [3, 4],
    'Junita Prihatini Zebua, S.Th': [5, 6],
    'Leni Marlina Zega, S.Th': [7, 8],
    'Mei Krisnawati Zendrato, S.Th': [9, 10],
    'Fineria Hulu, S.Pd': [11, 12],
    'Disisi Hati Sarumaha': [13, 14, 15]
  };

  const filtered = childrenData.filter(ch => {
    // 1. Filter Kelompok Usia
    if (selCohort && ch.cohort_id != selCohort) {
      return false;
    }

    // 2. Filter Mentor
    if (selMentor) {
      const allowedCohorts = mentorCohortMap[selMentor] || [];
      const matchByName = ch.mentor_name && ch.mentor_name.toLowerCase().includes(selMentor.toLowerCase());
      const matchByCohort = allowedCohorts.includes(Number(ch.cohort_id));
      if (!matchByName && !matchByCohort) return false;
    }

    // 3. Filter Jenjang Pendidikan
    if (selGrade) {
      const gradeStr = (ch.school_grade || '') + ' ' + (ch.school_name || '') + ' ' + (ch.cohort_name || '');
      if (selGrade === 'PAUD/TK') {
        const isPaud = [1, 2].includes(Number(ch.cohort_id)) || /PAUD|TK|Balita/i.test(gradeStr);
        if (!isPaud) return false;
      } else if (selGrade === 'SD') {
        const isSd = [3, 4, 5, 6].includes(Number(ch.cohort_id)) || /SD|Sekolah Dasar/i.test(gradeStr);
        if (!isSd) return false;
      } else if (selGrade === 'SMP') {
        const isSmp = [7, 8].includes(Number(ch.cohort_id)) || /SMP/i.test(gradeStr);
        if (!isSmp) return false;
      } else if (selGrade === 'SMA/SMK') {
        const isSma = [9, 10, 11, 12].includes(Number(ch.cohort_id)) || /SMA|SMK/i.test(gradeStr);
        if (!isSma) return false;
      } else if (selGrade === 'Kuliah') {
        const isKuliah = [13, 14, 15].includes(Number(ch.cohort_id)) || /Kuliah|Universitas|STT|Mahasiswa|Politeknik/i.test(gradeStr);
        if (!isKuliah) return false;
      }
    }

    // 4. Filter Jenis Kelamin
    if (selGender && ch.gender !== selGender) {
      return false;
    }

    // 5. Pencarian Teks (Nama, Panggilan, ID Compassion, Sekolah, Cita-Cita)
    if (searchQuery) {
      const matchName = (ch.full_name || '').toLowerCase().includes(searchQuery);
      const matchNick = (ch.nickname || '').toLowerCase().includes(searchQuery);
      const matchId = (ch.child_id_compassion || '').toLowerCase().includes(searchQuery);
      const matchSchool = (ch.school_name || '').toLowerCase().includes(searchQuery);
      const matchDream = (ch.dream_ambition || '').toLowerCase().includes(searchQuery);
      if (!matchName && !matchNick && !matchId && !matchSchool && !matchDream) {
        return false;
      }
    }

    return true;
  });

  currentFilteredChildren = filtered;

  // Update Counters & Badges
  const countEl = document.getElementById('child-filter-count');
  const totalEl = document.getElementById('child-total-count');
  const totalEl2 = document.getElementById('child-total-count-2');
  if (countEl) countEl.innerText = filtered.length;
  if (totalEl) totalEl.innerText = childrenData.length;
  if (totalEl2) totalEl2.innerText = childrenData.length;

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="p-12 text-center text-slate-500">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-2xl font-black">🔎</div>
          <p class="font-bold text-slate-800 text-sm">Tidak ada anak binaan yang cocok dengan kriteria filter.</p>
          <p class="text-xs text-slate-500 mt-1">Coba ubah kata kunci pencarian atau sesuaikan pilihan kelompok/mentor.</p>
          <button type="button" onclick="resetChildFilters()" class="mt-4 px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-800 transition">
            🔄 Reset Semua Filter
          </button>
        </td>
      </tr>
    `;
    return;
  }

  const isLeader = ['koordinator_ppa', 'admin'].includes(currentUser?.role);
  const canEditChild = isLeader || currentUser?.role === 'mentor';
  const canDeleteChild = isLeader;

  filtered.forEach((ch, idx) => {
    const photoSrc = ch.photo_data || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=300&q=80';
    tbody.innerHTML += `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="p-3 text-center font-bold text-slate-500 text-xs">${idx + 1}</td>
        <td class="p-3 text-center">
          <img src="${photoSrc}" alt="${ch.full_name}" class="w-12 h-14 object-cover rounded-xl border border-slate-300 shadow-sm mx-auto bg-white">
        </td>
        <td class="p-3 font-mono font-bold text-blue-950 text-xs sm:text-sm whitespace-nowrap">${ch.child_id_compassion}</td>
        <td class="p-3">
          <span class="font-black text-slate-900 block text-xs sm:text-sm">${ch.full_name}</span>
          <span class="text-[11px] text-slate-500">Panggilan: <strong class="text-slate-800">${ch.nickname || '-'}</strong></span>
        </td>
        <td class="p-3 text-center">
          <span class="px-2 py-1 rounded-lg text-xs font-black ${ch.gender === 'L' ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'bg-pink-50 text-pink-900 border border-pink-200'}">
            ${ch.gender === 'L' ? 'L' : 'P'}
          </span>
        </td>
        <td class="p-3 text-xs">
          <span class="font-extrabold text-slate-800 block">${ch.cohort_name}</span>
          ${ch.mentor_name ? `<span class="text-[10px] text-slate-500 font-semibold">Mentor: ${ch.mentor_name}</span>` : ''}
        </td>
        <td class="p-3 text-slate-600 text-xs">
          <span class="block font-semibold text-slate-800">${ch.school_name || 'Sekolah'} (${ch.school_grade || '-'})</span>
          <span class="text-[11px] text-emerald-800 font-bold block mt-0.5">Cita-Cita: ${ch.dream_ambition || '-'}</span>
        </td>
        <td class="p-3 text-slate-600 text-xs">
          <span class="block font-bold text-slate-800">${ch.parent_name || (ch.father_name || '-')}</span>
          <span class="text-[11px] text-slate-500">${ch.home_address || 'Gunungsitoli'}</span>
        </td>
        <td class="p-3 text-center">
          <span class="px-3 py-1 rounded-full font-black text-xs ${ch.status === 'Aktif' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-purple-100 text-purple-900 border border-purple-300'}">
            ${ch.status}
          </span>
        </td>
        <td class="p-3 text-center space-x-1 shrink-0 whitespace-nowrap">
          <button onclick="viewChildJourney(${ch.id})" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 px-2.5 py-1.5 rounded-xl border border-indigo-200 font-black text-xs shadow-sm transition active:scale-95" title="Lihat Portofolio Perjalanan Daur Hidup Anak (Insert -> Berproses -> Exit)">
            🌟 Daur Hidup
          </button>
          <button onclick="printChildBiodata(${ch.id})" class="bg-blue-50 hover:bg-blue-100 text-blue-950 px-2.5 py-1.5 rounded-xl border border-blue-200 font-black text-xs shadow-sm transition active:scale-95" title="Cetak / Pratinjau Kartu Biodata">
            📇 Biodata
          </button>
          ${canEditChild ? `
            <button onclick="editChild(${ch.id})" class="bg-amber-50 hover:bg-amber-100 text-amber-950 px-2.5 py-1.5 rounded-xl border border-amber-200 font-bold text-xs shadow-sm transition active:scale-95" title="Edit Biodata">
              Edit
            </button>
          ` : ''}
          ${canDeleteChild ? `
            <button onclick="deleteChild(${ch.id})" class="bg-red-50 hover:bg-red-100 text-red-900 px-2.5 py-1.5 rounded-xl border border-red-200 font-bold text-xs shadow-sm transition active:scale-95" title="Hapus Data">
              Hapus
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  });

  lucide.createIcons();
}

function openModalChild() {
  document.getElementById('form-child').reset();
  document.getElementById('child-id').value = '';
  document.getElementById('child-photo-data').value = '';
  document.getElementById('child-photo-preview').src = 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=300&q=80';
  document.getElementById('modal-child-title').innerText = 'Daftarkan Biodata Lengkap & Foto Anak Baru';
  openModal('modal-child');
}

function editChild(id) {
  const ch = childrenData.find(item => item.id === id);
  if (!ch) return;

  document.getElementById('child-id').value = ch.id;
  document.getElementById('child-code').value = ch.child_id_compassion;
  document.getElementById('child-cohort').value = ch.cohort_id;
  document.getElementById('child-name').value = ch.full_name;
  document.getElementById('child-nick').value = ch.nickname || '';
  document.getElementById('child-gender').value = ch.gender;
  document.getElementById('child-birthplace').value = ch.birth_place || 'Gunungsitoli';
  document.getElementById('child-birth').value = ch.birth_date;
  document.getElementById('child-school').value = ch.school_name || '';
  document.getElementById('child-grade').value = ch.school_grade || '';
  document.getElementById('child-hobby').value = ch.hobby || '';
  document.getElementById('child-dream').value = ch.dream_ambition || '';
  document.getElementById('child-father').value = ch.father_name || '';
  document.getElementById('child-mother').value = ch.mother_name || '';
  document.getElementById('child-phone').value = ch.parent_phone || '';
  document.getElementById('child-address').value = ch.home_address || '';
  document.getElementById('child-status').value = ch.status || 'Aktif';

  const photo = ch.photo_data || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=300&q=80';
  document.getElementById('child-photo-preview').src = photo;
  document.getElementById('child-photo-data').value = ch.photo_data || '';

  document.getElementById('modal-child-title').innerText = `Edit Biodata: ${ch.full_name}`;
  openModal('modal-child');
}

async function handleChildSubmit(event) {
  event.preventDefault();
  const childId = document.getElementById('child-id').value;

  const payload = {
    ppa_id: currentPpaId,
    child_id_compassion: document.getElementById('child-code').value,
    cohort_id: parseInt(document.getElementById('child-cohort').value),
    full_name: document.getElementById('child-name').value,
    nickname: document.getElementById('child-nick').value,
    gender: document.getElementById('child-gender').value,
    birth_place: document.getElementById('child-birthplace').value,
    birth_date: document.getElementById('child-birth').value,
    school_name: document.getElementById('child-school').value,
    school_grade: document.getElementById('child-grade').value,
    hobby: document.getElementById('child-hobby').value,
    dream_ambition: document.getElementById('child-dream').value,
    father_name: document.getElementById('child-father').value,
    mother_name: document.getElementById('child-mother').value,
    parent_name: `${document.getElementById('child-father').value} / ${document.getElementById('child-mother').value}`,
    parent_phone: document.getElementById('child-phone').value,
    home_address: document.getElementById('child-address').value,
    photo_data: document.getElementById('child-photo-data').value,
    status: document.getElementById('child-status').value
  };

  const url = childId ? `/api/children/${childId}` : '/api/children';
  const method = childId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast(childId ? 'Biodata anak berhasil diperbarui!' : 'Biodata dan pasfoto anak berhasil didaftarkan!', 'success');
      closeModal('modal-child');
      await loadCohortsAndChildren();
    } else {
      showToast('Gagal menyimpan biodata anak.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menyimpan biodata anak.', 'error');
  }
}

async function deleteChild(id) {
  const ch = childrenData.find(item => item.id === id);
  const name = ch ? ch.full_name : 'ini';
  if (confirm(`Apakah Anda yakin ingin menghapus data anak "${name}"?`)) {
    try {
      const res = await fetch(`/api/children/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Data anak berhasil dihapus.', 'success');
        await loadCohortsAndChildren();
      }
    } catch (err) {
      showToast('Gagal menghapus data anak.', 'error');
    }
  }
}

function printChildBiodata(id) {
  const ch = childrenData.find(item => item.id === id);
  if (!ch) return;

  const photo = ch.photo_data || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=300&q=80';

  const cardHtml = `
    <!-- KOP SURAT RESMI PPA (DOKUMEN ASLI: SINGLE LOGO KIRI, TANPA LOGO GANDA KANAN) -->
    <div class="border-b-4 border-double border-slate-900 pb-3 mb-5">
      <div class="flex items-center space-x-4">
        <img src="${ppaProfile.ppa_logo_url || '/assets/logo_ppa_agape.png'}" alt="Logo PPA" class="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0">

        <div class="flex-1 text-center">
          <h2 class="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
            ${ppaProfile.church_name || 'GEREJA NIHA KERISO PROTESTAN INDONESIA'}
          </h2>
          ${ppaProfile.church_membership ? `<p class="text-[9px] font-bold tracking-widest text-slate-700 uppercase">(${ppaProfile.church_membership})</p>` : ''}
          <h3 class="text-xs font-black uppercase tracking-widest text-slate-800 mt-0.5">
            ${ppaProfile.church_district || 'DISTRIK 3 DENNINGER'}
          </h3>
          <h1 class="text-sm sm:text-base font-black uppercase tracking-tight text-blue-950 mt-1">
            ${ppaProfile.name || 'PUSAT PENGEMBANGAN ANAK IO-0118 AGAPE DENNINGER'}
          </h1>
          <p class="text-[10px] text-slate-600 font-medium mt-0.5">
            ${ppaProfile.address || 'JALAN DIPONEGORO NO. 260-A'} HP/WA. ${ppaProfile.phone || '085184166754'} ${ppaProfile.city ? ppaProfile.city.toUpperCase() : 'KOTA GUNUNGSITOLI'} ${ppaProfile.postal_code || '22815'}
          </p>
        </div>
      </div>
    </div>

    <!-- Judul Formulir Biodata -->
    <div class="text-center mb-6">
      <h3 class="text-base font-black uppercase tracking-wider text-slate-900 underline">KARTU BIODATA & PROFIL ANAK DAMPINGAN (CHILD PROFILE)</h3>
      <p class="text-xs text-slate-600 mt-0.5">Nomor Registrasi Sponsor: <strong class="font-mono text-blue-950">${ch.child_id_compassion}</strong> | Kelas: <strong>${ch.cohort_name}</strong></p>
    </div>

    <!-- Header Profil dengan Pasfoto 3x4 -->
    <div class="flex items-start gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6">
      <div class="shrink-0 text-center">
        <img src="${photo}" alt="${ch.full_name}" class="w-28 h-36 object-cover rounded-xl border-2 border-slate-400 shadow-md bg-white">
        <span class="text-[10px] font-bold text-slate-500 block mt-1.5 uppercase tracking-wider">Pasfoto Anak</span>
      </div>
      <div class="flex-1 text-xs space-y-2">
        <table class="w-full">
          <tr><td class="w-36 py-1 text-slate-500 font-semibold">Nama Lengkap</td><td class="py-1 font-bold text-slate-900 text-sm">: ${ch.full_name}</td></tr>
          <tr><td class="py-1 text-slate-500 font-semibold">Nama Panggilan</td><td class="py-1 font-semibold text-slate-800">: ${ch.nickname || '-'}</td></tr>
          <tr><td class="py-1 text-slate-500 font-semibold">Jenis Kelamin</td><td class="py-1 font-semibold text-slate-800">: ${ch.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</td></tr>
          <tr><td class="py-1 text-slate-500 font-semibold">Tempat / Tgl Lahir</td><td class="py-1 font-semibold text-slate-800">: ${ch.birth_place || 'Gunungsitoli'}, ${ch.birth_date}</td></tr>
          <tr><td class="py-1 text-slate-500 font-semibold">Status Dampingan</td><td class="py-1"><span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[11px]">${ch.status}</span></td></tr>
        </table>
      </div>
    </div>

    <!-- Seksi II: Pendidikan & Minat Cita-Cita -->
    <div class="mb-5 text-xs">
      <h4 class="font-extrabold text-blue-950 uppercase tracking-wider mb-2 border-b pb-1">I. Data Pendidikan Formal & Cita-Cita Masa Depan</h4>
      <div class="grid grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
        <div>
          <p class="text-slate-500 font-semibold">Sekolah Umum:</p>
          <p class="font-bold text-slate-900">${ch.school_name || 'SD/SMP/SMA di Gunungsitoli'}</p>
        </div>
        <div>
          <p class="text-slate-500 font-semibold">Tingkat / Kelas Sekolah:</p>
          <p class="font-bold text-slate-900">${ch.school_grade || '-'}</p>
        </div>
        <div>
          <p class="text-slate-500 font-semibold">Hobi / Kegemaran:</p>
          <p class="font-bold text-slate-800">${ch.hobby || '-'}</p>
        </div>
        <div>
          <p class="text-slate-500 font-semibold">Cita-Cita Anak:</p>
          <p class="font-extrabold text-emerald-900">${ch.dream_ambition || '-'}</p>
        </div>
      </div>
    </div>

    <!-- Seksi III: Data Keluarga & Kontak -->
    <div class="mb-6 text-xs">
      <h4 class="font-extrabold text-blue-950 uppercase tracking-wider mb-2 border-b pb-1">II. Data Orang Tua / Wali & Tempat Tinggal</h4>
      <div class="grid grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
        <div>
          <p class="text-slate-500 font-semibold">Nama Ayah (Ama):</p>
          <p class="font-bold text-slate-900">${ch.father_name || '-'}</p>
        </div>
        <div>
          <p class="text-slate-500 font-semibold">Nama Ibu (Ina):</p>
          <p class="font-bold text-slate-900">${ch.mother_name || '-'}</p>
        </div>
        <div>
          <p class="text-slate-500 font-semibold">Nomor WhatsApp / HP Orang Tua:</p>
          <p class="font-bold text-slate-900 font-mono">${ch.parent_phone || '-'}</p>
        </div>
        <div>
          <p class="text-slate-500 font-semibold">Alamat Tempat Tinggal:</p>
          <p class="font-semibold text-slate-800">${ch.home_address || 'Kota Gunungsitoli'}</p>
        </div>
      </div>
    </div>

    <!-- Tanda Tangan Validasi Biodata (Tanpa Stempel) -->
    <div class="mt-8 pt-4 border-t border-slate-200 text-xs">
      <div class="text-center text-slate-500 mb-4">${ppaProfile.city || 'Gunungsitoli'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-slate-600 mb-12">Orang Tua / Wali Anak,</p>
          <p class="font-bold text-slate-900 underline">${ch.parent_name || 'Orang Tua Anak'}</p>
          <p class="text-[10px] text-slate-500">Keluarga Dampingan</p>
        </div>
        <div>
          <p class="text-slate-600 mb-12">Wali Kelas (Mentor),</p>
          <p class="font-bold text-slate-900 underline">${ch.mentor_name || 'Wali Kelas (Mentor)'}</p>
          <p class="text-[10px] text-slate-500">Mentor ${ch.cohort_name || 'Kelompok Usia'}</p>
        </div>
        <div>
          <p class="text-slate-600 mb-12">Disahkan Oleh,<br><span class="font-semibold text-slate-800">Koordinator PPA</span>,</p>
          <p class="font-bold text-slate-900 underline">${ppaProfile.coordinator_name || 'Oryet Fanolo Harefa'}</p>
          <p class="text-[10px] text-slate-500">${ppaProfile.name || 'Koordinator PPA'}</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-preview-title').innerText = `Kartu Biodata Resmi: ${ch.full_name} (${ch.child_id_compassion})`;
  document.getElementById('modal-preview-body').innerHTML = `
    <div class="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">${cardHtml}</div>
  `;
  document.getElementById('print-area').innerHTML = `<div class="print-sheet p-8">${cardHtml}</div>`;
  openModal('modal-preview');
  lucide.createIcons();
}

// ==========================================
// 8. ATTENDANCE & JURNAL TAB (DENGAN PLOT LESSON PLAN & PENYESUAIAN WAKTU REAL)
// ==========================================
let activeScheduleId = null;

async function loadAttendanceTab() {
  try {
    if (!programsData || programsData.length === 0) {
      await loadProgramsData();
    }

    const progSelect = document.getElementById('attendance-prog-select');
    if (progSelect && programsData.length > 0) {
      progSelect.innerHTML = programsData.map(p => `
        <option value="${p.id}">${p.name} (${p.cohort_name})</option>
      `).join('');
    }

    const pId = progSelect?.value || (programsData[0] ? programsData[0].id : null);
    if (!pId) {
      const sessionSelect = document.getElementById('session-select');
      if (sessionSelect) sessionSelect.innerHTML = '<option value="">Tidak ada jadwal</option>';
      return;
    }

    await loadProgramSchedules(pId);
  } catch (err) {
    console.error('Error loading attendance tab:', err);
  }
}

async function handleAttendanceProgramChange(progId) {
  await loadProgramSchedules(progId);
}

// Dialog Modal Plot Lesson Plan ke Jadwal
async function openModalPlotSchedule() {
  const pId = document.getElementById('attendance-prog-select')?.value
    || document.getElementById('lp-program-select')?.value
    || (programsData[0] ? programsData[0].id : null);

  const prog = programsData.find(p => p.id == pId) || programsData[0];
  const nameEl = document.getElementById('plot-modal-program-name');
  const infoEl = document.getElementById('plot-modal-plan-info');
  const dateInput = document.getElementById('plot-start-date');

  if (nameEl) nameEl.innerText = prog ? `${prog.name} (${prog.cohort_name})` : '-';

  // Default tanggal: Sabtu terdekat dari hari ini
  if (dateInput) {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 6 is Saturday
    const diff = (6 - day + 7) % 7;
    const nextSat = new Date(today);
    nextSat.setDate(today.getDate() + (diff === 0 ? 0 : diff));
    dateInput.value = nextSat.toISOString().split('T')[0];
  }

  // Hitung berapa sesi lesson plan yang tersedia
  if (prog && infoEl) {
    try {
      const res = await fetch(`/api/programs/${prog.id}/lesson-plans`);
      const plans = await res.json();
      const count = Array.isArray(plans) ? plans.length : 0;
      if (count > 0) {
        infoEl.innerHTML = `✅ Ditemukan <strong>${count} sesi Lesson Plan (RPP)</strong> yang siap dijadwalkan secara terstruktur.`;
      } else {
        infoEl.innerHTML = `⚠️ Program ini belum memiliki sesi Lesson Plan. Silakan buat sesi di tab Lesson Plan terlebih dahulu.`;
      }
    } catch (e) {
      infoEl.innerText = 'Siap menjadwalkan sesi modul pembelajaran.';
    }
  }

  openModal('modal-plot-schedule');
}

async function handlePlotScheduleSubmit(event) {
  event.preventDefault();
  const pId = document.getElementById('attendance-prog-select')?.value
    || document.getElementById('lp-program-select')?.value
    || (programsData[0] ? programsData[0].id : null);

  if (!pId) {
    showToast('Pilih program terlebih dahulu.', 'error');
    return;
  }

  const startDate = document.getElementById('plot-start-date').value;
  const interval = parseInt(document.getElementById('plot-interval').value) || 7;
  const startTime = document.getElementById('plot-start-time').value;
  const endTime = document.getElementById('plot-end-time').value;
  const room = document.getElementById('plot-room').value;

  const btn = document.getElementById('btn-submit-plot');
  const origBtnContent = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block animate-spin mr-1.5">⏳</span> Mem-plot Jadwal...`;
  }

  try {
    const res = await fetch(`/api/programs/${pId}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch: true,
        start_date: startDate,
        day_interval: interval,
        start_time: startTime,
        end_time: endTime,
        room_location: room
      })
    });

    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Jadwal pertemuan berhasil di-plot!', 'success');
      closeModal('modal-plot-schedule');
      await loadProgramSchedules(pId);
      // Sinkronkan juga pilihan dropdown program presensi jika sedang di tab presensi
      const progSelect = document.getElementById('attendance-prog-select');
      if (progSelect) progSelect.value = pId;
    } else {
      showToast(data.error || 'Gagal mem-plot jadwal pertemuan.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat mem-plot jadwal.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnContent;
    }
  }
}

async function loadProgramSchedules(progId) {
  try {
    const res = await fetch(`/api/programs/${progId}/schedules`);
    currentSchedules = await res.json();

    const sessionSelect = document.getElementById('session-select');
    const noScheduleBox = document.getElementById('attendance-no-schedule-box');
    const sessionPanel = document.getElementById('attendance-session-panel');

    if (!sessionSelect) return;
    sessionSelect.innerHTML = '';

    if (!Array.isArray(currentSchedules) || currentSchedules.length === 0) {
      sessionSelect.innerHTML = '<option value="">Belum ada jadwal sesi</option>';
      activeScheduleId = null;
      if (noScheduleBox) noScheduleBox.classList.remove('hidden');
      if (sessionPanel) sessionPanel.classList.add('hidden');
      return;
    }

    if (noScheduleBox) noScheduleBox.classList.add('hidden');
    if (sessionPanel) sessionPanel.classList.remove('hidden');

    currentSchedules.forEach(s => {
      const topic = s.lesson_topic || s.actual_materials_taught || `Sesi Pertemuan #${s.session_number}`;
      sessionSelect.innerHTML += `<option value="${s.id}">Pertemuan #${s.session_number} (${s.meeting_date}) - ${topic}</option>`;
    });

    loadSessionDetail(currentSchedules[0].id);
  } catch (err) {
    console.error('Error loading program schedules:', err);
  }
}

async function loadSessionDetail(scheduleId) {
  try {
    activeScheduleId = scheduleId;
    const s = Array.isArray(currentSchedules) ? currentSchedules.find(x => x.id == scheduleId) : null;
    if (!s) return;

    // 1. Perbarui Info Pertemuan & Sesi Aktif
    const badgeEl = document.getElementById('active-session-badge');
    const titleEl = document.getElementById('active-session-title');
    const infoEl = document.getElementById('active-session-plan-info');
    if (badgeEl) badgeEl.innerText = `#${s.session_number}`;
    if (titleEl) titleEl.innerText = `Sesi #${s.session_number}: ${s.lesson_topic || s.actual_materials_taught || 'Pertemuan Pembelajaran'}`;
    if (infoEl) infoEl.innerText = `Rencana Terjadwal: ${s.meeting_date} (${s.start_time || '14:00'} - ${s.end_time || '16:00'}) | ${s.room_location || 'Ruang Belajar PPA'}`;

    // 2. Formulir Penyesuaian Waktu Real Terlaksana
    const dateInput = document.getElementById('sched-real-date');
    const startInput = document.getElementById('sched-real-start');
    const endInput = document.getElementById('sched-real-end');
    const roomInput = document.getElementById('sched-real-room');
    if (dateInput) dateInput.value = s.meeting_date || '';
    if (startInput) startInput.value = s.start_time || '14:00';
    if (endInput) endInput.value = s.end_time || '16:00';
    if (roomInput) roomInput.value = s.room_location || 'Ruang Belajar PPA IO-0118';

    // 3. Formulir Jurnal Pengajaran Sesi
    const jMaterial = document.getElementById('journal-actual-material');
    const jDynamics = document.getElementById('journal-class-dynamics');
    const jChallenges = document.getElementById('journal-challenges');
    const jFollowUp = document.getElementById('journal-follow-up');
    if (jMaterial) jMaterial.value = s.actual_materials_taught || s.lesson_topic || '';
    if (jDynamics) jDynamics.value = s.class_dynamics || '';
    if (jChallenges) jChallenges.value = s.challenges_notes || '';
    if (jFollowUp) jFollowUp.value = s.follow_up_action || '';

    // 4. Ambil Daftar Kehadiran Anak
    const attRes = await fetch(`/api/schedules/${scheduleId}/attendances`);
    const attendances = await attRes.json();

    const tbody = document.getElementById('attendance-list-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!Array.isArray(attendances) || attendances.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="p-6 text-center text-slate-500 font-medium italic">
            Tidak ada anak terdaftar di kelompok usia modul ini.
          </td>
        </tr>
      `;
      return;
    }

    attendances.forEach(a => {
      const status = a.status || '';
      const photoSrc = a.photo_data || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=300&q=80';

      tbody.innerHTML += `
        <tr class="hover:bg-slate-50/80 transition border-b border-slate-100 attendance-child-row" data-child-id="${a.child_id}">
          <td class="p-3 text-center">
            <img src="${photoSrc}" alt="${a.child_name}" class="w-10 h-12 object-cover rounded-xl border border-slate-300 shadow-xs mx-auto bg-white">
          </td>
          <td class="p-3">
            <span class="font-black text-slate-900 text-xs sm:text-sm block">${a.child_name}</span>
            <span class="font-mono text-[11px] text-blue-950 font-semibold">${a.child_id_compassion}</span>
          </td>
          <td class="p-3 text-center">
            <div class="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 gap-1 attendance-status-group" data-child-id="${a.child_id}">
              <button type="button" onclick="setChildStatus(${a.child_id}, 'Hadir')" class="att-pill-hadir px-2.5 py-1 rounded-lg text-xs font-black transition ${status === 'Hadir' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:bg-white'}">Hadir</button>
              <button type="button" onclick="setChildStatus(${a.child_id}, 'Izin')" class="att-pill-izin px-2.5 py-1 rounded-lg text-xs font-black transition ${status === 'Izin' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-white'}">Izin</button>
              <button type="button" onclick="setChildStatus(${a.child_id}, 'Sakit')" class="att-pill-sakit px-2.5 py-1 rounded-lg text-xs font-black transition ${status === 'Sakit' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:bg-white'}">Sakit</button>
              <button type="button" onclick="setChildStatus(${a.child_id}, 'Alpa')" class="att-pill-alpa px-2.5 py-1 rounded-lg text-xs font-black transition ${status === 'Alpa' ? 'bg-red-600 text-white shadow' : 'text-slate-600 hover:bg-white'}">Alpa</button>
            </div>
            <input type="hidden" id="status-child-${a.child_id}" value="${status}">
          </td>
          <td class="p-3">
            <input type="text" id="notes-child-${a.child_id}" value="${a.notes || ''}" placeholder="Catatan keaktifan / alasan jika izin..." class="w-full text-xs p-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none font-medium">
          </td>
        </tr>
      `;
    });

    lucide.createIcons();
  } catch (err) {
    console.error('Error loading session detail:', err);
  }
}

function setChildStatus(childId, status) {
  const hiddenInput = document.getElementById(`status-child-${childId}`);
  if (hiddenInput) hiddenInput.value = status;

  const row = document.querySelector(`.attendance-child-row[data-child-id="${childId}"]`);
  if (!row) return;

  const hadirBtn = row.querySelector('.att-pill-hadir');
  const izinBtn = row.querySelector('.att-pill-izin');
  const sakitBtn = row.querySelector('.att-pill-sakit');
  const alpaBtn = row.querySelector('.att-pill-alpa');

  [hadirBtn, izinBtn, sakitBtn, alpaBtn].forEach(btn => {
    if (btn) btn.className = btn.className.replace(/bg-\w+-600|bg-\w+-500|text-white|shadow/g, '').trim() + ' text-slate-600 hover:bg-white';
  });

  if (status === 'Hadir' && hadirBtn) {
    hadirBtn.className = 'att-pill-hadir px-2.5 py-1 rounded-lg text-xs font-black transition bg-emerald-600 text-white shadow';
  } else if (status === 'Izin' && izinBtn) {
    izinBtn.className = 'att-pill-izin px-2.5 py-1 rounded-lg text-xs font-black transition bg-blue-600 text-white shadow';
  } else if (status === 'Sakit' && sakitBtn) {
    sakitBtn.className = 'att-pill-sakit px-2.5 py-1 rounded-lg text-xs font-black transition bg-amber-500 text-white shadow';
  } else if (status === 'Alpa' && alpaBtn) {
    alpaBtn.className = 'att-pill-alpa px-2.5 py-1 rounded-lg text-xs font-black transition bg-red-600 text-white shadow';
  }
}

function markAllAttendance(status) {
  document.querySelectorAll('.attendance-child-row').forEach(row => {
    const childId = row.getAttribute('data-child-id');
    if (childId) setChildStatus(childId, status);
  });
  showToast(`Semua anak pada sesi ini ditandai "${status}".`);
}

async function saveAttendanceAndRealSchedule() {
  if (!activeScheduleId) {
    showToast('Pilih jadwal sesi pertemuan terlebih dahulu.', 'error');
    return;
  }

  const realDate = document.getElementById('sched-real-date')?.value;
  const realStart = document.getElementById('sched-real-start')?.value;
  const realEnd = document.getElementById('sched-real-end')?.value;
  const realRoom = document.getElementById('sched-real-room')?.value;

  // Kumpulkan status kehadiran anak
  const attendances = [];
  document.querySelectorAll('.attendance-child-row').forEach(row => {
    const childId = parseInt(row.getAttribute('data-child-id'));
    const status = document.getElementById(`status-child-${childId}`)?.value || '';
    const notes = document.getElementById(`notes-child-${childId}`)?.value || '';
    attendances.push({ child_id: childId, status, notes });
  });

  if (attendances.some(item => !item.status)) {
    showToast('Pilih status kehadiran setiap anak sebelum menyimpan.', 'error');
    return;
  }

  const btn = document.getElementById('btn-save-attendance');
  const origBtnContent = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block animate-spin mr-1.5">⏳</span> Menyimpan Presensi...`;
  }

  try {
    const res = await fetch(`/api/schedules/${activeScheduleId}/attendances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        real_meeting_date: realDate,
        real_start_time: realStart,
        real_end_time: realEnd,
        real_room_location: realRoom,
        attendances
      })
    });

    const data = await res.json();
    if (res.ok) {
      // Simpan juga form jurnal secara otomatis jika materi diisi
      const jMat = document.getElementById('journal-actual-material')?.value;
      const jDyn = document.getElementById('journal-class-dynamics')?.value;
      const jChal = document.getElementById('journal-challenges')?.value;
      const jFol = document.getElementById('journal-follow-up')?.value;
      if (jMat) {
        await fetch(`/api/schedules/${activeScheduleId}/journal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actual_materials_taught: jMat,
            children_present_count: attendances.filter(a => a.status === 'Hadir').length,
            class_dynamics: jDyn || 'Siswa hadir dan mempraktikkan materi.',
            challenges_notes: jChal || '',
            follow_up_action: jFol || ''
          })
        });
      }

      showToast('Presensi, penyesuaian jadwal real, dan jurnal pertemuan berhasil disimpan!', 'success');
      
      const pId = document.getElementById('attendance-prog-select')?.value;
      if (pId) {
        const curId = activeScheduleId;
        await loadProgramSchedules(pId);
        const sessionSelect = document.getElementById('session-select');
        if (sessionSelect) sessionSelect.value = curId;
      }
      await loadDashboard();
    } else {
      showToast(data.error || 'Gagal menyimpan presensi.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menyimpan presensi.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnContent;
    }
  }
}

async function handleJournalSubmit(event) {
  event.preventDefault();
  if (!activeScheduleId) {
    showToast('Pilih jadwal sesi pertemuan terlebih dahulu.', 'error');
    return;
  }

  const jMat = document.getElementById('journal-actual-material')?.value;
  const jDyn = document.getElementById('journal-class-dynamics')?.value;
  const jChal = document.getElementById('journal-challenges')?.value;
  const jFol = document.getElementById('journal-follow-up')?.value;

  const btn = document.getElementById('btn-save-journal');
  const origBtnContent = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block animate-spin mr-1.5">⏳</span> Menyimpan...`;
  }

  try {
    const res = await fetch(`/api/schedules/${activeScheduleId}/journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actual_materials_taught: jMat || 'Materi pembelajaran sesi.',
        children_present_count: 2,
        class_dynamics: jDyn || '',
        challenges_notes: jChal || '',
        follow_up_action: jFol || ''
      })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Jurnal pertemuan berhasil disimpan!', 'success');
    } else {
      showToast(data.error || 'Gagal menyimpan jurnal.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menyimpan jurnal.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnContent;
    }
  }
}

// ==========================================
// 9. EVALUATIONS & ASSIGNMENTS TAB
// ==========================================
let currentEvalProgramId = null;
let currentEvalData = null;
let currentAssignmentsData = null;
let currentEvalSubTab = 'evaluations';
let currentGradingAssignmentId = null;

async function loadEvaluations() {
  const tbody = document.getElementById('evaluations-table-body');
  const progSelect = document.getElementById('eval-program-select');
  if (!tbody || !progSelect) return;

  tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500"><span class="animate-spin inline-block mr-2">⏳</span> Memuat evaluasi hasil belajar...</td></tr>`;

  try {
    if (!programsData || programsData.length === 0) {
      await loadProgramsData();
    }

    if (!programsData || programsData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500">Tidak ada modul atau kelas dalam cakupan tugas akun Anda.</td></tr>`;
      return;
    }

    // Populate Program Dropdown
    progSelect.innerHTML = '';
    programsData.forEach(p => {
      progSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.cohort_name || 'Kelompok'})</option>`;
    });

    if (!currentEvalProgramId || !programsData.some(p => p.id === parseInt(currentEvalProgramId))) {
      currentEvalProgramId = programsData[0].id;
    }
    progSelect.value = currentEvalProgramId;

    await loadProgramEvaluationDetail(currentEvalProgramId);
  } catch (err) {
    console.error('Error loadEvaluations:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-600">Gagal memuat evaluasi program.</td></tr>`;
  }
}

async function onEvaluationProgramChange(progId) {
  currentEvalProgramId = parseInt(progId);
  await loadProgramEvaluationDetail(currentEvalProgramId);
  if (currentEvalSubTab === 'assignments') {
    await loadProgramAssignments(currentEvalProgramId);
  }
}

function switchEvaluationSubTab(subTab) {
  currentEvalSubTab = subTab;
  const btnEvals = document.getElementById('subtab-btn-evaluations');
  const btnAssign = document.getElementById('subtab-btn-assignments');
  const contentEvals = document.getElementById('subtab-content-evaluations');
  const contentAssign = document.getElementById('subtab-content-assignments');

  if (subTab === 'evaluations') {
    if (btnEvals) btnEvals.className = 'px-4 py-2 rounded-xl text-xs font-black bg-blue-900 text-white shadow transition flex items-center space-x-1.5';
    if (btnAssign) btnAssign.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition flex items-center space-x-1.5';
    if (contentEvals) contentEvals.classList.remove('hidden');
    if (contentAssign) contentAssign.classList.add('hidden');
  } else {
    if (btnEvals) btnEvals.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition flex items-center space-x-1.5';
    if (btnAssign) btnAssign.className = 'px-4 py-2 rounded-xl text-xs font-black bg-blue-900 text-white shadow transition flex items-center space-x-1.5';
    if (contentEvals) contentEvals.classList.add('hidden');
    if (contentAssign) contentAssign.classList.remove('hidden');
    if (currentEvalProgramId) loadProgramAssignments(currentEvalProgramId);
  }
  lucide.createIcons();
}

async function loadProgramEvaluationDetail(progId) {
  const tbody = document.getElementById('evaluations-table-body');
  const cardsContainer = document.getElementById('evaluations-cards-container');
  if (!tbody) return;

  try {
    const res = await fetch(`/api/programs/${progId}/evaluations`);
    if (!res.ok) throw new Error('Gagal memuat evaluasi program.');
    const data = await res.json();
    currentEvalData = data;

    const prog = data.program;
    const children = data.children || [];
    const tutorEvals = data.tutorEvals || [];
    const mentorEvals = data.mentorEvals || [];
    const certs = data.certificates || [];
    const taskAvgs = data.assignmentAverages || [];

    // 1. Update Program Banner
    if (prog) {
      const bTitle = document.getElementById('eval-banner-title');
      const bPillar = document.getElementById('eval-banner-pillar');
      const bCohort = document.getElementById('eval-banner-cohort');
      const bTarget = document.getElementById('eval-banner-target');
      const bTutor = document.getElementById('eval-banner-tutor');
      const bMentor = document.getElementById('eval-banner-mentor');
      const bPass = document.getElementById('eval-banner-pass');

      if (bTitle) bTitle.innerText = prog.name;
      if (bPillar) bPillar.innerText = `Pilar ${prog.pillar || 'Kognitif'}`;
      if (bCohort) bCohort.innerText = prog.cohort_name || 'Kelompok Usia';
      if (bTarget) bTarget.innerText = `🎯 Target Terukur: ${prog.measurable_target || 'Siswa mencapai standar kelulusan minimal.'}`;
      if (bTutor) bTutor.innerText = prog.tutor_name || 'Tutor Vokasi';
      if (bMentor) bMentor.innerText = prog.mentor_name || 'Wali Kelas';
      if (bPass) bPass.innerText = `${prog.min_passing_score ? parseFloat(prog.min_passing_score).toFixed(1) : '3.0'} / 4.0`;
    }

    if (children.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada anak yang terdaftar firm pada modul ini. Buka tab <strong>Program &rarr; Peserta</strong> untuk mendaftarkan siswa.</td></tr>`;
      if (cardsContainer) cardsContainer.innerHTML = '';
      return;
    }

    // 2. Build Table Rows
    let tableHtml = '';
    let cardsHtml = '';
    const isTutorOrLeader = currentUser && (currentUser.role === 'tutor' || currentUser.role === 'koordinator_ppa' || currentUser.role === 'admin');
    const isMentorOrLeader = currentUser && (currentUser.role === 'mentor' || currentUser.role === 'koordinator_ppa' || currentUser.role === 'admin');

    children.forEach(ch => {
      const te = tutorEvals.find(t => t.child_id === ch.id);
      const me = mentorEvals.find(m => m.child_id === ch.id);
      const cert = certs.find(c => c.child_id === ch.id);
      const taskAvg = taskAvgs.find(a => a.child_id === ch.id);

      let calcScore = null;
      let scoreLabel = '-';
      if (te && me) {
        calcScore = ((parseFloat(te.final_tutor_score) * 0.6) + (parseFloat(me.final_mentor_score) * 0.4)).toFixed(2);
        scoreLabel = `${calcScore} / 4.0`;
      } else if (te) {
        calcScore = parseFloat(te.final_tutor_score).toFixed(2);
        scoreLabel = `${calcScore} / 4.0 (Tutor)`;
      } else if (me) {
        calcScore = parseFloat(me.final_mentor_score).toFixed(2);
        scoreLabel = `${calcScore} / 4.0 (Mentor)`;
      }

      const minPassing = (prog && prog.min_passing_score) ? parseFloat(prog.min_passing_score) : 3.0;
      const isPassed = calcScore !== null && parseFloat(calcScore) >= minPassing;

      let passBadge = `<span class="bg-slate-100 text-slate-500 font-semibold px-2.5 py-1 rounded-full text-[11px]">Belum Lengkap</span>`;
      if (te && me) {
        passBadge = isPassed
          ? `<span class="bg-emerald-100 text-emerald-800 font-black px-2.5 py-1 rounded-full text-[11px] flex items-center justify-center space-x-1"><span>✅ LULUS</span></span>`
          : `<span class="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-[11px]">Belum Lulus</span>`;
      }

      tableHtml += `
        <tr class="hover:bg-slate-50/80 transition">
          <td class="p-3.5 pl-6">
            <span class="font-bold text-slate-900 block">${ch.full_name}</span>
            <span class="text-[10px] font-mono text-slate-500">${ch.child_id_compassion}</span>
          </td>
          <td class="p-3.5">
            ${te ? `
              <div>
                <span class="font-bold text-blue-900 text-sm">${te.final_tutor_score}</span>
                <span class="text-[10px] text-slate-500 block">Praktik: ${te.practical_task_score} | Materi: ${te.material_mastery_score}</span>
              </div>
            ` : `
              <span class="text-slate-400 italic text-[11px]">Belum dinilai Tutor</span>
            `}
          </td>
          <td class="p-3.5">
            ${me ? `
              <div>
                <span class="font-bold text-emerald-900 text-sm">${me.final_mentor_score}</span>
                <span class="text-[10px] text-slate-500 block">Rohani: ${me.spiritual_attitude_score} | Sosial: ${me.social_emotional_score}</span>
              </div>
            ` : `
              <span class="text-slate-400 italic text-[11px]">Belum dinilai Mentor</span>
            `}
          </td>
          <td class="p-3.5 text-center font-black text-slate-800 text-sm">
            ${scoreLabel}
          </td>
          <td class="p-3.5 text-center">
            ${passBadge}
          </td>
          <td class="p-3.5 pr-6 text-right space-x-1.5 whitespace-nowrap">
            ${isTutorOrLeader ? `
              <button onclick="openModalEvalTutor(${ch.id})" class="px-2.5 py-1 rounded-lg border border-blue-300 text-blue-800 hover:bg-blue-50 font-bold text-[11px] shadow-sm">
                ${te ? '✏️ Nilai Tutor' : '+ Nilai Tutor'}
              </button>
            ` : ''}

            ${isMentorOrLeader ? `
              <button onclick="openModalEvalMentor(${ch.id})" class="px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold text-[11px] shadow-sm">
                ${me ? '✏️ Nilai Mentor' : '+ Nilai Mentor'}
              </button>
            ` : ''}

            ${cert ? `
              <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-bold text-[10px]">
                <i data-lucide="award" class="w-3.5 h-3.5"></i>
                <span>Tersertifikasi</span>
              </span>
            ` : (isPassed ? `
              <button onclick="issueProgramCertificate(${progId}, ${ch.id})" class="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] shadow-sm">
                🏆 Terbitkan Sertifikat
              </button>
            ` : '')}
          </td>
        </tr>
      `;

      // Card for Qualitative Narrative
      if (te || me) {
        cardsHtml += `
          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <span class="text-xs font-mono text-slate-500">${ch.child_id_compassion} • ${prog.cohort_name || 'Kelompok'}</span>
                <h3 class="text-base font-black text-slate-900">${ch.full_name} <span class="text-blue-900 font-bold text-sm block sm:inline sm:ml-1">(${prog.name})</span></h3>
              </div>
              <div class="text-left sm:text-right">
                <span class="text-xs text-slate-500 font-semibold block">Skor Terbobot Akumulatif:</span>
                <span class="text-xl font-black text-blue-900">${scoreLabel} ${isPassed ? '• Lulus' : ''}</span>
              </div>
            </div>

            <div class="grid grid-cols-1 ${te && me ? 'md:grid-cols-2' : ''} gap-4 text-xs">
              ${te ? `
                <div class="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
                  <div class="flex items-center justify-between font-bold text-blue-950 mb-1">
                    <span>Evaluasi Teknis oleh Tutor (${prog.tutor_name || 'Instruktur'})</span>
                    <span class="bg-blue-200 px-2.5 py-0.5 rounded font-extrabold">Skor: ${te.final_tutor_score}</span>
                  </div>
                  <p class="text-slate-600 mb-2">Praktik: ${te.practical_task_score || '-'} | Teori/Materi: ${te.material_mastery_score || '-'} | Disiplin: ${te.technical_discipline_score || '-'}</p>
                  <p class="italic text-slate-700 bg-white p-3 rounded-xl border border-blue-100 leading-relaxed">
                    "${te.qualitative_narrative || 'Kompetensi teknis memenuhi standar kurikulum.'}"
                  </p>
                </div>
              ` : ''}

              ${me ? `
                <div class="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                  <div class="flex items-center justify-between font-bold text-emerald-950 mb-1">
                    <span>Evaluasi Karakter & Rohani oleh Mentor (${prog.mentor_name || 'Wali Kelas'})</span>
                    <span class="bg-emerald-200 px-2.5 py-0.5 rounded font-extrabold">Skor: ${me.final_mentor_score}</span>
                  </div>
                  <p class="text-slate-600 mb-2">Sikap Rohani: ${me.spiritual_attitude_score || '-'} | Sosio-Emosional: ${me.social_emotional_score || '-'} | Komitmen: ${me.attendance_commitment_score || '-'}</p>
                  <p class="italic text-slate-700 bg-white p-3 rounded-xl border border-emerald-100 leading-relaxed">
                    "${me.mentor_reflection_narrative || 'Karakter anak berkembang dengan sangat baik.'}"
                  </p>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }
    });

    tbody.innerHTML = tableHtml;
    if (cardsContainer) cardsContainer.innerHTML = cardsHtml;
    lucide.createIcons();
  } catch (err) {
    console.error('Error loadProgramEvaluationDetail:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-600">Terjadi kesalahan saat memuat lembar evaluasi.</td></tr>`;
  }
}

// Assignments Sub-Tab
async function loadProgramAssignments(progId) {
  const container = document.getElementById('assignments-list-container');
  if (!container) return;

  container.innerHTML = `<div class="col-span-full p-8 text-center text-slate-500"><span class="animate-spin inline-block mr-2">⏳</span> Memuat tugas & kuis modul...</div>`;

  try {
    const res = await fetch(`/api/programs/${progId}/assignments`);
    if (!res.ok) throw new Error('Gagal memuat tugas');
    const data = await res.json();
    currentAssignmentsData = data;

    const assignments = data.assignments || [];
    const children = data.children || [];
    const submissions = data.submissions || [];

    if (assignments.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
          <p class="font-bold text-sm text-slate-700 mb-1">Belum Ada Tugas atau Kuis</p>
          <p class="text-xs">Klik tombol "+ Tambah Tugas / Kuis" di atas untuk membuat tugas atau kuis pertama untuk modul ini.</p>
        </div>
      `;
      return;
    }

    let cardsHtml = '';
    assignments.forEach(a => {
      const gradedCount = submissions.filter(s => s.assignment_id === a.id && s.score !== null).length;
      cardsHtml += `
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-3 flex flex-col justify-between">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full">Bobot: ${a.weight_percent}%</span>
              <span class="text-[11px] text-slate-500">${a.due_date ? 'Batas: ' + a.due_date : 'Fleksibel'}</span>
            </div>
            <h4 class="font-black text-sm text-slate-900">${a.title}</h4>
            <p class="text-xs text-slate-600 leading-relaxed">${a.description || 'Tidak ada petunjuk khusus.'}</p>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500">Dinilai: <strong class="text-blue-900">${gradedCount}/${children.length}</strong> siswa</span>
            <div class="flex items-center space-x-1.5">
              <button onclick="openModalGradeAssignment(${a.id})" class="bg-blue-900 hover:bg-blue-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow transition">
                Nilai Siswa
              </button>
              <button onclick="deleteAssignment(${a.id})" class="text-red-500 hover:bg-red-50 p-1.5 rounded-lg text-xs" title="Hapus Tugas">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = cardsHtml;
    lucide.createIcons();
  } catch (err) {
    console.error('Error loadProgramAssignments:', err);
    container.innerHTML = `<div class="col-span-full p-8 text-center text-red-600 bg-white rounded-3xl border border-red-200">Gagal memuat tugas & kuis modul.</div>`;
  }
}

function openModalAddAssignment() {
  const form = document.getElementById('form-add-assignment');
  if (form) form.reset();
  openModal('modal-add-assignment');
}

async function handleAssignmentSubmit(event) {
  event.preventDefault();
  if (!currentEvalProgramId) return;

  const title = document.getElementById('assign-title').value;
  const description = document.getElementById('assign-desc').value;
  const weight_percent = parseFloat(document.getElementById('assign-weight').value) || 20;
  const due_date = document.getElementById('assign-due-date').value || null;

  try {
    const res = await fetch(`/api/programs/${currentEvalProgramId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, weight_percent, due_date })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Tugas / Kuis berhasil ditambahkan!');
      closeModal('modal-add-assignment');
      await loadProgramAssignments(currentEvalProgramId);
    } else {
      showToast(data.error || 'Gagal menambahkan tugas.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menyimpan tugas.', 'error');
  }
}

async function deleteAssignment(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus tugas/kuis ini beserta seluruh nilai yang sudah masuk?')) return;
  try {
    const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('Tugas berhasil dihapus.');
      await loadProgramAssignments(currentEvalProgramId);
      await loadProgramEvaluationDetail(currentEvalProgramId);
    } else {
      showToast(data.error || 'Gagal menghapus tugas.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menghapus tugas.', 'error');
  }
}

function openModalGradeAssignment(assignmentId) {
  currentGradingAssignmentId = assignmentId;
  if (!currentAssignmentsData) return;

  const assignment = currentAssignmentsData.assignments.find(a => a.id === assignmentId);
  const children = currentAssignmentsData.children || [];
  const submissions = currentAssignmentsData.submissions || [];

  const titleEl = document.getElementById('modal-grade-title');
  const subEl = document.getElementById('modal-grade-subtitle');
  if (titleEl && assignment) titleEl.innerText = `Input Nilai: ${assignment.title}`;
  if (subEl && assignment) subEl.innerText = `Bobot: ${assignment.weight_percent}% • Skala Nilai: 0 - 100`;

  const tbody = document.getElementById('grade-table-body');
  if (!tbody) return;

  let rowsHtml = '';
  children.forEach(ch => {
    const sub = submissions.find(s => s.assignment_id === assignmentId && s.child_id === ch.id);
    const scoreVal = (sub && sub.score !== null && sub.score !== undefined) ? sub.score : '';
    const feedbackVal = (sub && sub.feedback) ? sub.feedback : '';

    rowsHtml += `
      <tr data-child-id="${ch.id}">
        <td class="p-3 pl-4">
          <span class="font-bold text-slate-900 block">${ch.full_name}</span>
          <span class="text-[10px] font-mono text-slate-500">${ch.child_id_compassion}</span>
        </td>
        <td class="p-3 text-center">
          <input type="number" step="0.5" min="0" max="100" class="input-assign-score w-24 text-center p-2 border border-slate-300 rounded-xl font-black text-blue-900 bg-slate-50 focus:bg-white" value="${scoreVal}" placeholder="0-100">
        </td>
        <td class="p-3 pr-4">
          <input type="text" class="input-assign-feedback w-full p-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white" value="${feedbackVal}" placeholder="Catatan perbaikan / apresiasi...">
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;
  openModal('modal-grade-assignment');
}

async function saveAssignmentScores() {
  if (!currentGradingAssignmentId) return;

  const tbody = document.getElementById('grade-table-body');
  const rows = tbody.querySelectorAll('tr[data-child-id]');
  const submissions = [];

  rows.forEach(r => {
    const child_id = parseInt(r.getAttribute('data-child-id'));
    const scoreInput = r.querySelector('.input-assign-score');
    const feedbackInput = r.querySelector('.input-assign-feedback');

    const score = scoreInput && scoreInput.value !== '' ? parseFloat(scoreInput.value) : null;
    const feedback = feedbackInput ? feedbackInput.value : '';

    submissions.push({ child_id, score, feedback });
  });

  try {
    const res = await fetch(`/api/assignments/${currentGradingAssignmentId}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Seluruh nilai tugas siswa berhasil disimpan!');
      closeModal('modal-grade-assignment');
      await loadProgramAssignments(currentEvalProgramId);
      await loadProgramEvaluationDetail(currentEvalProgramId);
    } else {
      showToast(data.error || 'Gagal menyimpan nilai.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menyimpan nilai tugas.', 'error');
  }
}

// Rubrik Can-Do: Konversi Narasi Kualitatif ke Bobot Nilai Angka (Tutor)
function applyTutorCanDo(level) {
  const prog = currentEvalData?.program;
  const progName = prog ? prog.name : 'modul keterampilan';
  
  document.querySelectorAll('.tutor-cando-btn').forEach(b => {
    b.classList.remove('ring-2', 'ring-blue-600', 'bg-blue-100');
    b.classList.add('bg-white');
  });
  const activeBtn = document.getElementById(`btn-tutor-cando-${level}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-white');
    activeBtn.classList.add('ring-2', 'ring-blue-600', 'bg-blue-100');
  }

  let m = 3.5, p = 3.5, d = 4.0, narr = '';
  if (level === 4) {
    m = 4.0; p = 4.0; d = 4.0;
    narr = `Anak telah mampu mempraktikkan keterampilan ${progName} secara mandiri, akurat, dan percaya diri tanpa bantuan, serta proaktif membimbing teman sebayanya.`;
  } else if (level === 3) {
    m = 3.6; p = 3.6; d = 3.8;
    narr = `Anak menunjukkan penguasaan materi yang sangat baik, mampu menyelesaikan tugas praktik ${progName} secara tepat dengan sedikit bimbingan, serta berdisiplin tinggi.`;
  } else if (level === 2) {
    m = 3.1; p = 3.1; d = 3.2;
    narr = `Anak memahami konsep dasar materi ${progName}, aktif mencoba tugas praktik meski masih memerlukan arahan berkala dari tutor untuk hasil optimal.`;
  } else if (level === 1) {
    m = 2.6; p = 2.5; d = 3.0;
    narr = `Anak masih memerlukan bimbingan intensif dan latihan berulang untuk menguasai keterampilan dasar ${progName}, namun tetap bersemangat dalam proses belajar.`;
  }

  document.getElementById('eval-tutor-mastery').value = m;
  document.getElementById('eval-tutor-practical').value = p;
  document.getElementById('eval-tutor-discipline').value = d;
  document.getElementById('eval-tutor-narrative').value = narr;
  recalcTutorScore();
  showToast(`Rubrik Can-Do Tingkat ${level} diterapkan: Skor & Narasi terkonversi otomatis!`);
}

// Rubrik Can-Do: Konversi Narasi Karakter ke Bobot Nilai Angka (Mentor)
function applyMentorCanDo(level) {
  document.querySelectorAll('.mentor-cando-btn').forEach(b => {
    b.classList.remove('ring-2', 'ring-emerald-600', 'bg-emerald-100');
    b.classList.add('bg-white');
  });
  const activeBtn = document.getElementById(`btn-mentor-cando-${level}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-white');
    activeBtn.classList.add('ring-2', 'ring-emerald-600', 'bg-emerald-100');
  }

  let spi = 3.8, soc = 3.8, att = 4.0, refl = '';
  if (level === 4) {
    spi = 4.0; soc = 4.0; att = 4.0;
    refl = `Anak menjadi teladan dalam doa, memiliki rasa empati tinggi, proaktif menolong sesama, sopan santun, dan selalu hadir tepat waktu dengan antusiasme penuh.`;
  } else if (level === 3) {
    spi = 3.7; soc = 3.6; att = 3.8;
    refl = `Anak menunjukkan pertumbuhan karakter yang positif, ramah, mampu bekerja sama dengan baik dalam dinamika kelompok, dan tekun beribadah.`;
  } else if (level === 2) {
    spi = 3.2; soc = 3.1; att = 3.3;
    refl = `Anak bersikap santun dan tertib dalam kelompok, namun masih perlu dorongan dan latihan untuk lebih percaya diri dalam memimpin doa serta mengungkapkan pendapat.`;
  } else if (level === 1) {
    spi = 2.7; soc = 2.6; att = 2.8;
    refl = `Anak memerlukan pendampingan personal dan pendekatan kasih secara berkelanjutan untuk membangun rasa percaya diri, kedisiplinan hadir, dan interaksi emosi sosial.`;
  }

  document.getElementById('eval-mentor-spiritual').value = spi;
  document.getElementById('eval-mentor-social').value = soc;
  document.getElementById('eval-mentor-attendance').value = att;
  document.getElementById('eval-mentor-reflection').value = refl;
  recalcMentorScore();
  showToast(`Rubrik Can-Do Karakter Tingkat ${level} diterapkan: Skor & Narasi terkonversi otomatis!`);
}

// Modal Evaluasi Tutor
function openModalEvalTutor(childId) {
  if (!currentEvalData) return;
  const child = currentEvalData.children.find(c => c.id === childId);
  const prog = currentEvalData.program;
  const te = currentEvalData.tutorEvals.find(t => t.child_id === childId);

  document.getElementById('eval-tutor-child-id').value = childId;
  document.getElementById('eval-tutor-child-name').innerText = child ? `${child.full_name} (${child.child_id_compassion})` : '-';
  document.getElementById('eval-tutor-program-name').innerText = prog ? `${prog.name} • ${prog.cohort_name || 'Kelompok'}` : '-';

  const m = te ? te.material_mastery_score : 3.5;
  const p = te ? te.practical_task_score : 3.5;
  const d = te ? te.technical_discipline_score : 4.0;
  document.getElementById('eval-tutor-mastery').value = m;
  document.getElementById('eval-tutor-practical').value = p;
  document.getElementById('eval-tutor-discipline').value = d;
  document.getElementById('eval-tutor-narrative').value = te ? te.qualitative_narrative : `Menguasai materi pembelajaran modul ${prog?.name || ''} dengan baik serta menunjukkan ketekunan praktik.`;

  // Sorot tombol can-do yang sesuai
  const total = ((m * 0.35) + (p * 0.40) + (d * 0.25));
  let lvl = 3;
  if (total >= 3.85) lvl = 4;
  else if (total >= 3.35) lvl = 3;
  else if (total >= 2.85) lvl = 2;
  else lvl = 1;

  document.querySelectorAll('.tutor-cando-btn').forEach(b => {
    b.classList.remove('ring-2', 'ring-blue-600', 'bg-blue-100');
    b.classList.add('bg-white');
  });
  const btn = document.getElementById(`btn-tutor-cando-${lvl}`);
  if (btn) {
    btn.classList.remove('bg-white');
    btn.classList.add('ring-2', 'ring-blue-600', 'bg-blue-100');
  }

  recalcTutorScore();
  openModal('modal-eval-tutor');
}

function recalcTutorScore() {
  const m = parseFloat(document.getElementById('eval-tutor-mastery')?.value) || 0;
  const p = parseFloat(document.getElementById('eval-tutor-practical')?.value) || 0;
  const d = parseFloat(document.getElementById('eval-tutor-discipline')?.value) || 0;
  const total = ((m * 0.35) + (p * 0.40) + (d * 0.25)).toFixed(2);
  const calcEl = document.getElementById('eval-tutor-final-calc');
  if (calcEl) calcEl.innerText = `${total} / 4.0 (${total >= 3.0 ? 'Lulus' : 'Belum Lulus'})`;
}

function pullAverageAssignmentScore() {
  const childId = parseInt(document.getElementById('eval-tutor-child-id')?.value);
  if (!childId || !currentEvalData) return;

  const taskAvg = (currentEvalData.assignmentAverages || []).find(a => a.child_id === childId);
  if (taskAvg && taskAvg.avg_score !== null) {
    const raw = parseFloat(taskAvg.avg_score);
    const normalized = raw > 4.0 ? ((raw / 100) * 4.0).toFixed(1) : raw.toFixed(1);
    document.getElementById('eval-tutor-practical').value = normalized;
    recalcTutorScore();
    showToast(`Nilai Praktik ditarik dari rata-rata ${taskAvg.task_count} tugas/kuis (${normalized} / 4.0)`);
  } else {
    showToast('Belum ada nilai tugas/kuis yang tercatat untuk anak ini.', 'error');
  }
}

async function handleEvalTutorSubmit(event) {
  event.preventDefault();
  if (!currentEvalProgramId) return;

  const child_id = parseInt(document.getElementById('eval-tutor-child-id').value);
  const material_mastery_score = parseFloat(document.getElementById('eval-tutor-mastery').value);
  const practical_task_score = parseFloat(document.getElementById('eval-tutor-practical').value);
  const technical_discipline_score = parseFloat(document.getElementById('eval-tutor-discipline').value);
  const qualitative_narrative = document.getElementById('eval-tutor-narrative').value;

  try {
    const res = await fetch(`/api/programs/${currentEvalProgramId}/evaluations/tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id, material_mastery_score, practical_task_score, technical_discipline_score, qualitative_narrative })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Nilai & narasi evaluasi Tutor berhasil disimpan!');
      closeModal('modal-eval-tutor');
      await loadProgramEvaluationDetail(currentEvalProgramId);
    } else {
      showToast(data.error || 'Gagal menyimpan evaluasi Tutor.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menyimpan evaluasi Tutor.', 'error');
  }
}

// Modal Evaluasi Mentor
function openModalEvalMentor(childId) {
  if (!currentEvalData) return;
  const child = currentEvalData.children.find(c => c.id === childId);
  const prog = currentEvalData.program;
  const me = currentEvalData.mentorEvals.find(m => m.child_id === childId);

  document.getElementById('eval-mentor-child-id').value = childId;
  document.getElementById('eval-mentor-child-name').innerText = child ? `${child.full_name} (${child.child_id_compassion})` : '-';
  document.getElementById('eval-mentor-program-name').innerText = prog ? `${prog.name} • ${prog.cohort_name || 'Kelompok'}` : '-';

  const spi = me ? me.spiritual_attitude_score : 3.8;
  const soc = me ? me.social_emotional_score : 3.8;
  const att = me ? me.attendance_commitment_score : 4.0;
  document.getElementById('eval-mentor-spiritual').value = spi;
  document.getElementById('eval-mentor-social').value = soc;
  document.getElementById('eval-mentor-attendance').value = att;
  document.getElementById('eval-mentor-reflection').value = me ? me.mentor_reflection_narrative : `Menunjukkan keteladanan rohani, santun, dan sangat aktif bekerjasama dengan teman sebaya.`;

  // Sorot tombol can-do mentor yang sesuai
  const total = ((spi * 0.40) + (soc * 0.35) + (att * 0.25));
  let lvl = 3;
  if (total >= 3.85) lvl = 4;
  else if (total >= 3.35) lvl = 3;
  else if (total >= 2.85) lvl = 2;
  else lvl = 1;

  document.querySelectorAll('.mentor-cando-btn').forEach(b => {
    b.classList.remove('ring-2', 'ring-emerald-600', 'bg-emerald-100');
    b.classList.add('bg-white');
  });
  const btn = document.getElementById(`btn-mentor-cando-${lvl}`);
  if (btn) {
    btn.classList.remove('bg-white');
    btn.classList.add('ring-2', 'ring-emerald-600', 'bg-emerald-100');
  }

  recalcMentorScore();
  openModal('modal-eval-mentor');
}

function recalcMentorScore() {
  const spi = parseFloat(document.getElementById('eval-mentor-spiritual')?.value) || 0;
  const soc = parseFloat(document.getElementById('eval-mentor-social')?.value) || 0;
  const att = parseFloat(document.getElementById('eval-mentor-attendance')?.value) || 0;
  const total = ((spi * 0.40) + (soc * 0.35) + (att * 0.25)).toFixed(2);
  const calcEl = document.getElementById('eval-mentor-final-calc');
  if (calcEl) calcEl.innerText = `${total} / 4.0`;
}

async function handleEvalMentorSubmit(event) {
  event.preventDefault();
  if (!currentEvalProgramId) return;

  const child_id = parseInt(document.getElementById('eval-mentor-child-id').value);
  const spiritual_attitude_score = parseFloat(document.getElementById('eval-mentor-spiritual').value);
  const social_emotional_score = parseFloat(document.getElementById('eval-mentor-social').value);
  const attendance_commitment_score = parseFloat(document.getElementById('eval-mentor-attendance').value);
  const mentor_reflection_narrative = document.getElementById('eval-mentor-reflection').value;

  try {
    const res = await fetch(`/api/programs/${currentEvalProgramId}/evaluations/mentor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id, spiritual_attitude_score, social_emotional_score, attendance_commitment_score, mentor_reflection_narrative })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Evaluasi karakter & refleksi Mentor berhasil disimpan!');
      closeModal('modal-eval-mentor');
      await loadProgramEvaluationDetail(currentEvalProgramId);
    } else {
      showToast(data.error || 'Gagal menyimpan evaluasi Mentor.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menyimpan evaluasi Mentor.', 'error');
  }
}

// Issue Certificate
async function issueProgramCertificate(progId, childId) {
  try {
    const res = await fetch(`/api/programs/${progId}/certificates/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`🏆 ${data.message} (${data.certificate_number})`);
      await loadProgramEvaluationDetail(progId);
      await loadCertificates();
    } else {
      showToast(data.error || 'Gagal menerbitkan sertifikat.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menerbitkan sertifikat.', 'error');
  }
}

// Rapor Semesteran
async function generateSemesterReports() {
  if (!confirm('Sinkronkan nilai semester aktif? Rapor yang diproses akan kembali menjadi draf. Catatan mentor tetap tersimpan.')) return;

  try {
    const res = await fetch('/api/reports/semester/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ppa_id: currentPpaId })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`⚡ ${data.message}`);
      await loadReports();
    } else {
      showToast(data.error || 'Gagal menyinkronkan rapor.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat menyinkronkan rapor semesteran.', 'error');
  }
}

function openModalEditCurrentReport() {
  const select = document.getElementById('report-child-select');
  const rep = reportsData.find(report => report.id === Number(select?.value));

  if (!rep) {
    showToast('Pilih rapor anak terlebih dahulu.', 'error');
    return;
  }

  document.getElementById('edit-report-id').value = rep.id;
  document.getElementById('edit-report-child-name').innerText = `${rep.child_name} (${rep.child_id_compassion}) - ${rep.cohort_name}`;

  document.getElementById('edit-report-spiritual').value = rep.spiritual_score ?? '';
  document.getElementById('edit-report-cognitive').value = rep.cognitive_score ?? '';
  document.getElementById('edit-report-socio').value = rep.socioemotional_score ?? '';
  document.getElementById('edit-report-physical').value = rep.physical_score ?? '';
  document.getElementById('edit-report-attendance').value = rep.attendance_percentage ?? '';
  document.getElementById('edit-report-narrative').value = rep.overall_narrative_summary || '';
  document.getElementById('edit-report-mentor-notes').value = rep.mentor_homeroom_notes || '';

  openModal('modal-edit-report');
}

async function handleEditReportSubmit(event) {
  event.preventDefault();
  const reportId = document.getElementById('edit-report-id').value;
  if (!reportId) return;

  const spiritual_score = parseFloat(document.getElementById('edit-report-spiritual').value);
  const cognitive_score = parseFloat(document.getElementById('edit-report-cognitive').value);
  const socioemotional_score = parseFloat(document.getElementById('edit-report-socio').value);
  const physical_score = parseFloat(document.getElementById('edit-report-physical').value);
  const attendance_percentage = parseFloat(document.getElementById('edit-report-attendance').value);
  const overall_narrative_summary = document.getElementById('edit-report-narrative').value;
  const mentor_homeroom_notes = document.getElementById('edit-report-mentor-notes').value;

  try {
    const res = await fetch(`/api/reports/semester/${reportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spiritual_score, cognitive_score, socioemotional_score, physical_score,
        attendance_percentage, overall_narrative_summary, mentor_homeroom_notes
      })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Perubahan rapor semesteran berhasil disimpan!');
      closeModal('modal-edit-report');
      await loadReports();
    } else {
      showToast(data.error || 'Gagal menyimpan perubahan rapor.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat memperbarui rapor.', 'error');
  }
}

// ==========================================
// 10. RAPOR SEMESTERAN (4 PILAR - WITH DYNAMIC FILTERING)
// ==========================================
async function loadReports() {
  try {
    const res = await fetch(`/api/reports/semester?ppa_id=${currentPpaId}`);
    reportsData = await res.json();

    populateAllFilterDropdowns();
    filterReportChildDropdown();
  } catch (err) {
    console.error('Error loading reports:', err);
  }
}

function filterReportChildDropdown() {
  const select = document.getElementById('report-child-select');
  if (!select) return;

  if (!Array.isArray(reportsData) || reportsData.length === 0) {
    select.innerHTML = '<option value="">(Tidak ada rapor tersimpan)</option>';
    renderSelectedReport(null);
    return;
  }

  const selCohort = document.getElementById('report-filter-cohort')?.value;
  const selMentor = document.getElementById('report-filter-mentor')?.value;
  const searchQ = (document.getElementById('report-filter-search')?.value || '').toLowerCase().trim();

  const mentorCohortMap = {
    'Lestetis Hulu, SE': [1, 2],
    'Agus Riang Hura, S.Pd': [3, 4],
    'Junita Prihatini Zebua, S.Th': [5, 6],
    'Leni Marlina Zega, S.Th': [7, 8],
    'Mei Krisnawati Zendrato, S.Th': [9, 10],
    'Fineria Hulu, S.Pd': [11, 12],
    'Disisi Hati Sarumaha': [13, 14, 15]
  };

  const filtered = reportsData.filter(r => {
    if (selCohort && r.cohort_id != selCohort) return false;
    if (selMentor) {
      const allowedCohorts = mentorCohortMap[selMentor] || [];
      const matchByName = r.mentor_name && r.mentor_name.toLowerCase().includes(selMentor.toLowerCase());
      const matchByCohort = allowedCohorts.includes(Number(r.cohort_id));
      if (!matchByName && !matchByCohort) return false;
    }
    if (searchQ) {
      const matchName = (r.child_name || '').toLowerCase().includes(searchQ);
      const matchId = (r.child_id_compassion || '').toLowerCase().includes(searchQ);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  select.innerHTML = '';
  if (filtered.length === 0) {
    select.innerHTML = '<option value="">(Tidak ditemukan anak)</option>';
    renderSelectedReport(null);
    return;
  }

  filtered.forEach(r => {
    select.innerHTML += `<option value="${r.id}">${r.child_name} (${r.cohort_name}) · ${r.semester_name} · ${r.fiscal_year_name}</option>`;
  });

  renderSelectedReport(filtered[0].id);
}

function reportStatus(report) {
  if (report.verified_by_supervisor && report.approved_by_coordinator) return 'Disahkan';
  if (report.verified_by_supervisor) return 'Terverifikasi · Menunggu Koordinator';
  return 'Draf · Menunggu Verifikasi';
}

async function reviewSemesterReport(id, action) {
  try {
    const res = await fetch(`/api/reports/semester/${id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, revision: reportsData.find(report => report.id === id)?.revision })
    });
    const data = await res.json();
    showToast(res.ok ? data.message : data.error, res.ok ? 'success' : 'error');
    const selected = document.getElementById('report-child-select').value;
    await loadReports();
    const select = document.getElementById('report-child-select');
    if (Array.from(select.options).some(option => option.value === selected)) {
      select.value = selected;
      renderSelectedReport(selected);
    }
  } catch (err) {
    showToast('Kesalahan koneksi saat memperbarui status rapor.', 'error');
  }
}

function renderSelectedReport(reportId) {
  const report = reportsData.find(item => item.id === Number(reportId));
  
  if (!report) {
    const screen = document.getElementById('report-card-screen');
    document.getElementById('print-area').innerHTML = '';
    if (screen) {
      screen.innerHTML = `
        <div class="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
          <p class="font-bold text-sm text-slate-700 mb-1">Belum Ada Rapor Semester Tersimpan</p>
          <p class="text-xs">Tidak ada data rapor semesteran dalam cakupan tugas akun Anda.</p>
        </div>
      `;
    }
    return;
  }

  const att = report.attendance_stats || { total_sessions: 0, hadir_count: 0, izin_count: 0, sakit_count: 0, alpa_count: 0 };
  const attendanceLabel = att.total_sessions && report.attendance_percentage != null
    ? `${report.attendance_percentage}%`
    : 'Belum ada data';
  const action = currentUser?.role === 'komisi_pengawas' && !report.verified_by_supervisor
    ? 'verify'
    : currentUser?.role === 'koordinator_ppa' && report.verified_by_supervisor && !report.approved_by_coordinator
      ? 'approve'
      : null;
  const progs = report.programs || [];
  const health = report.health_record;

  const html = `
    <p class="mb-3 text-center text-xs font-bold">Status Rapor: ${reportStatus(report)}</p>
    <!-- KOP SURAT RESMI PPA -->
    <div class="border-b-4 border-double border-slate-900 pb-3 mb-6">
      <div class="flex items-center space-x-4">
        <img src="${ppaProfile.ppa_logo_url || '/assets/logo_ppa_agape.png'}" alt="Logo PPA" class="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0">

        <div class="flex-1 text-center">
          <h2 class="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
            ${ppaProfile.church_name || 'GEREJA NIHA KERISO PROTESTAN INDONESIA'}
          </h2>
          ${ppaProfile.church_membership ? `<p class="text-[9px] font-bold tracking-widest text-slate-600 uppercase">(${ppaProfile.church_membership})</p>` : ''}
          <h3 class="text-xs font-black uppercase tracking-widest text-slate-800 mt-0.5">
            ${ppaProfile.church_district || 'DISTRIK 3 DENNINGER'}
          </h3>
          <h1 class="text-base sm:text-lg font-black uppercase tracking-tight text-blue-950 mt-1">
            ${ppaProfile.name || 'PUSAT PENGEMBANGAN ANAK IO-0118 AGAPE DENNINGER'}
          </h1>
          <p class="text-[10px] sm:text-[11px] text-slate-600 font-medium mt-0.5">
            ${ppaProfile.address || 'JALAN DIPONEGORO NO. 260-A'} HP/WA. ${ppaProfile.phone || '085184166754'} ${ppaProfile.city ? ppaProfile.city.toUpperCase() : 'KOTA GUNUNGSITOLI'} ${ppaProfile.postal_code || '22815'}
          </p>
        </div>
      </div>
    </div>

    <div class="text-center mb-6">
      <h3 class="text-base font-black uppercase tracking-wider text-slate-900 underline">LAPORAN HASIL BELAJAR & EVALUASI CAPAIAN HOLISTIK ANAK</h3>
      <p class="text-xs text-slate-600 mt-0.5">Tahun Fiskal: ${report.fiscal_year_name} | ${report.semester_name}</p>
    </div>

    <!-- IDENTITAS ANAK BINAAN -->
    <div class="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
      <div>
        <table class="w-full">
          <tr><td class="w-32 py-1 text-slate-500 font-semibold">Nama Lengkap Anak</td><td class="py-1 font-bold text-slate-900">: ${report.child_name}</td></tr>
          <tr><td class="py-1 text-slate-500 font-semibold">Nama Panggilan</td><td class="py-1 text-slate-800">: ${report.nickname || '-'}</td></tr>
          <tr><td class="py-1 text-slate-500 font-semibold">No. ID Compassion</td><td class="py-1 font-mono font-bold text-blue-900">: ${report.child_id_compassion}</td></tr>
        </table>
      </div>
      <div>
        <table class="w-full">
          <tr><td class="w-32 py-1 text-slate-500 font-semibold">Kelompok Usia</td><td class="py-1 font-semibold text-slate-800">: ${report.cohort_name}</td></tr>
          <tr><td class="py-1 text-slate-500 font-semibold">Wali Kelas (Mentor)</td><td class="py-1 font-bold text-slate-900">: ${report.mentor_name || 'Mentor Kelompok Usia'}</td></tr>
          <tr><td class="py-1 text-slate-500 font-semibold">Tingkat Kehadiran Riil</td><td class="py-1 font-bold text-emerald-800">: ${attendanceLabel} ${att.total_sessions ? `(${att.hadir_count}/${att.total_sessions} catatan)` : ''}</td></tr>
        </table>
      </div>
    </div>

    <!-- I. CAPAIAN 4 PILAR HOLISTIK -->
    <div class="mb-6">
      <h4 class="font-bold text-xs uppercase tracking-wider text-slate-800 mb-2">I. Ringkasan Capaian Perkembangan 4 Pilar Holistik (Compassion HCD)</h4>
      <table class="w-full text-left text-xs border border-slate-300 rounded-xl overflow-hidden">
        <thead class="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
          <tr>
            <th class="p-2.5 w-12 text-center">No</th>
            <th class="p-2.5 w-44">Pilar Perkembangan</th>
            <th class="p-2.5 w-24 text-center">Skor (1 - 4)</th>
            <th class="p-2.5 w-28 text-center">Predikat</th>
            <th class="p-2.5">Deskripsi Naratif Capaian Anak</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr>
            <td class="p-2.5 text-center font-bold">1</td>
            <td class="p-2.5 font-bold text-blue-950">Spiritual / Rohani</td>
            <td class="p-2.5 text-center font-bold text-slate-800">${report.spiritual_score ?? '—'}</td>
            <td class="p-2.5 text-center"><span class="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">${report.spiritual_score == null ? '—' : report.spiritual_score >= 3.85 ? 'Istimewa' : '—'}</span></td>
            <td class="p-2.5 text-slate-700">—</td>
          </tr>
          <tr>
            <td class="p-2.5 text-center font-bold">2</td>
            <td class="p-2.5 font-bold text-blue-950">Kognitif & Keterampilan</td>
            <td class="p-2.5 text-center font-bold text-slate-800">${report.cognitive_score ?? '—'}</td>
            <td class="p-2.5 text-center"><span class="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">${report.cognitive_score == null ? '—' : report.cognitive_score >= 3.85 ? 'Istimewa' : '—'}</span></td>
            <td class="p-2.5 text-slate-700">—</td>
          </tr>
          <tr>
            <td class="p-2.5 text-center font-bold">3</td>
            <td class="p-2.5 font-bold text-blue-950">Sosio-Emosional</td>
            <td class="p-2.5 text-center font-bold text-slate-800">${report.socioemotional_score ?? '—'}</td>
            <td class="p-2.5 text-center"><span class="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">${report.socioemotional_score == null ? '—' : report.socioemotional_score >= 3.85 ? 'Istimewa' : '—'}</span></td>
            <td class="p-2.5 text-slate-700">—</td>
          </tr>
          <tr>
            <td class="p-2.5 text-center font-bold">4</td>
            <td class="p-2.5 font-bold text-blue-950">Fisik & Kesehatan (Gizi)</td>
            <td class="p-2.5 text-center font-bold text-slate-800">${report.physical_score ?? '—'}</td>
            <td class="p-2.5 text-center"><span class="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">—</span></td>
            <td class="p-2.5 text-slate-700">—</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- II. RINCIAN AKUMULASI SELURUH MODUL & KOMPONEN BELAJAR -->
    <div class="mb-6">
      <h4 class="font-bold text-xs uppercase tracking-wider text-slate-800 mb-2">II. Rincian Akumulasi Capaian Seluruh Modul Pembelajaran & Komponen Belajar</h4>
      <div class="overflow-x-auto border border-slate-300 rounded-xl">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
            <tr>
              <th class="p-2.5 text-center w-10">No</th>
              <th class="p-2.5">Program / Modul Kegiatan</th>
              <th class="p-2.5">Pilar</th>
              <th class="p-2.5 text-center">Rata-rata Kuis/Tugas</th>
              <th class="p-2.5 text-center">Nilai Tutor (60%)</th>
              <th class="p-2.5 text-center">Nilai Mentor (40%)</th>
              <th class="p-2.5 text-center">Skor Akhir Modul</th>
              <th class="p-2.5 text-center">Sertifikat Modul</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${progs.length > 0 ? progs.map((p, idx) => {
              const quizScore = p.avg_assignment_score !== null && p.avg_assignment_score !== undefined
                ? `${parseFloat(p.avg_assignment_score).toFixed(1)} / 100`
                : '-';
              
              let finalModScore = '-';
              let isModPassed = false;
              if (p.final_tutor_score && p.final_mentor_score) {
                finalModScore = ((parseFloat(p.final_tutor_score) * 0.6) + (parseFloat(p.final_mentor_score) * 0.4)).toFixed(2);
                isModPassed = parseFloat(finalModScore) >= (p.min_passing_score || 3.0);
              } else if (p.final_tutor_score) {
                finalModScore = parseFloat(p.final_tutor_score).toFixed(2);
                isModPassed = parseFloat(finalModScore) >= (p.min_passing_score || 3.0);
              } else if (p.final_mentor_score) {
                finalModScore = parseFloat(p.final_mentor_score).toFixed(2);
                isModPassed = parseFloat(finalModScore) >= (p.min_passing_score || 3.0);
              }

              return `
                <tr>
                  <td class="p-2.5 text-center font-bold">${idx + 1}</td>
                  <td class="p-2.5">
                    <span class="font-bold text-blue-950 block">${p.name}</span>
                    <span class="text-[10px] text-slate-500">Tutor: ${p.tutor_name || 'Mandiri'} • Mentor: ${p.mentor_name}</span>
                  </td>
                  <td class="p-2.5 font-semibold text-slate-700">${p.pillar}</td>
                  <td class="p-2.5 text-center font-bold text-slate-700">${quizScore}</td>
                  <td class="p-2.5 text-center font-bold text-blue-900">${p.final_tutor_score ? p.final_tutor_score : '-'}</td>
                  <td class="p-2.5 text-center font-bold text-emerald-900">${p.final_mentor_score ? p.final_mentor_score : '-'}</td>
                  <td class="p-2.5 text-center font-black text-slate-900">${finalModScore} ${isModPassed ? '<span class="text-emerald-700 text-[10px] block font-bold">LULUS</span>' : ''}</td>
                  <td class="p-2.5 text-center">
                    ${p.certificate_number 
                      ? `<span class="bg-blue-100 text-blue-950 px-2 py-0.5 rounded font-mono text-[9px] font-bold block">${p.certificate_number}</span>`
                      : (isModPassed ? '<span class="text-emerald-600 text-[10px] font-semibold">Tersedia</span>' : '<span class="text-slate-400 text-[10px]">-</span>')}
                  </td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="8" class="p-3 text-center text-slate-500">Data modul kelompok usia telah tersinkronisasi.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- III. REKAPITULASI PRESENSI & PERTUMBUHAN FISIK PMT -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs">
      <!-- Rekap Kehadiran -->
      <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <h4 class="font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
          <i data-lucide="calendar-check" class="w-4 h-4 text-blue-900"></i>
          <span>III. Rekapitulasi Presensi & Kehadiran Riil</span>
        </h4>
        <div class="grid grid-cols-4 gap-2 text-center mb-3">
          <div class="bg-white p-2 rounded-xl border border-slate-200">
            <span class="block text-[10px] text-slate-500 font-semibold">Hadir (H)</span>
            <span class="font-black text-emerald-700 text-base">${att.hadir_count}</span>
          </div>
          <div class="bg-white p-2 rounded-xl border border-slate-200">
            <span class="block text-[10px] text-slate-500 font-semibold">Izin (I)</span>
            <span class="font-black text-blue-700 text-base">${att.izin_count}</span>
          </div>
          <div class="bg-white p-2 rounded-xl border border-slate-200">
            <span class="block text-[10px] text-slate-500 font-semibold">Sakit (S)</span>
            <span class="font-black text-amber-700 text-base">${att.sakit_count}</span>
          </div>
          <div class="bg-white p-2 rounded-xl border border-slate-200">
            <span class="block text-[10px] text-slate-500 font-semibold">Alpa (A)</span>
            <span class="font-black text-red-700 text-base">${att.alpa_count}</span>
          </div>
        </div>
        <div class="p-2 bg-emerald-100/60 rounded-xl border border-emerald-200 text-emerald-950 flex items-center justify-between font-bold">
          <span>Persentase Kehadiran Total:</span>
          <span class="text-sm font-black text-emerald-900">${attendanceLabel}</span>
        </div>
      </div>

      <!-- Pemantauan Fisik & PMT -->
      <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <h4 class="font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
          <i data-lucide="apple" class="w-4 h-4 text-emerald-700"></i>
          <span>IV. Pemantauan Fisik & PMT Gizi Sehat</span>
        </h4>
        ${health ? `
          <div class="space-y-1.5">
            <div class="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 font-semibold">
              <span class="text-slate-600">Antropometri:</span>
              <span class="font-bold text-slate-900">BB: ${health.weight_kg} kg | TB: ${health.height_cm} cm</span>
            </div>
            <div class="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 font-semibold">
              <span class="text-slate-600">Status Gizi:</span>
              <span class="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded text-[11px]">${health.nutrition_status}</span>
            </div>
            <p class="text-[11px] text-slate-600 mt-1"><strong>Menu PMT:</strong> ${health.pmt_menu_served || 'Menu Gizi Sehat Berimbang'}</p>
          </div>
        ` : `
          <div class="space-y-1.5">
            <div class="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 font-semibold">
              <span class="text-slate-600">Status Tumbuh Kembang:</span>
              <span class="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded text-[11px]">Belum ada data</span>
            </div>
            <p class="text-[11px] text-slate-600 mt-1">Catatan pemantauan fisik belum tersedia.</p>
          </div>
        `}
      </div>
    </div>

    <div class="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
      <h4 class="font-bold text-slate-800 uppercase tracking-wider mb-1">II. Catatan Refleksi & Rekomendasi Mentor (Wali Kelas)</h4>
      <p class="text-slate-700 italic leading-relaxed">
        "${report.mentor_homeroom_notes || 'Belum ada catatan mentor.'}"
      </p>
    </div>

    ${report.approved_by_coordinator ? '' : '<p class="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-center font-bold text-amber-900">DRAF · BELUM DISAHKAN</p>'}
    <!-- Tanda Tangan Resmi Rapor (Tanpa Stempel Sesuai Arahan) -->
    <div class="mt-8 pt-4 border-t border-slate-200">
      <div class="text-center text-xs text-slate-500 mb-4">${ppaProfile.city || 'Gunungsitoli'}</div>
      <div class="grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <p class="text-slate-600 mb-12">Wali Kelas (Mentor),</p>
          <p class="font-bold text-slate-900 underline">${report.mentor_name || 'Mentor Kelompok Usia'}</p>
          <p class="text-[10px] text-slate-500">Mentor ${report.cohort_name || 'Kelompok Usia'}</p>
        </div>
        <div>
          <p class="text-slate-600 mb-12">Mengetahui,<br><span class="font-semibold text-slate-800">Penanggung Jawab Kemitraan</span>,</p>
          <p class="font-bold text-slate-900 underline">${ppaProfile.partnership_head_name || 'SNK. Arozato Harefa, S.Pd'}</p>
          <p class="text-[10px] text-slate-500">${ppaProfile.partnership_head_title || 'Komisi Pengawas Gereja'}</p>
        </div>
        <div>
          <p class="text-slate-600 mb-12">${report.approved_by_coordinator ? 'Disahkan Oleh' : 'Menunggu Pengesahan'}<br><span class="font-semibold text-slate-800">Koordinator PPA</span>,</p>
          <p class="font-bold text-slate-900 underline">${ppaProfile.coordinator_name || 'Oryet Fanolo Harefa'}</p>
          <p class="text-[10px] text-slate-500">${ppaProfile.name || 'Koordinator PPA'}</p>
        </div>
      </div>
    </div>
  `;

  const reviewButton = action
    ? `<button type="button" class="mb-3 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white" onclick="reviewSemesterReport(${report.id}, '${action}')">${action === 'verify' ? 'Verifikasi Rapor' : 'Sahkan Rapor'}</button>`
    : '';
  document.getElementById('report-card-screen').innerHTML = reviewButton + html;
  document.getElementById('print-area').innerHTML = `<div class="print-sheet p-8">${html}</div>`;
  lucide.createIcons();
}

// ==========================================
// 11. CERTIFICATES TAB
// ==========================================
async function loadCertificates() {
  try {
    const actRes = await fetch(`/api/certificates/activity?ppa_id=${currentPpaId}`);
    activityCerts = await actRes.json();
    const exitRes = await fetch(`/api/certificates/exit?ppa_id=${currentPpaId}`);
    exitCerts = await exitRes.json();

    populateAllFilterDropdowns();
    updateCertDropdown();
    renderCertificate();
  } catch (err) {
    console.error('Error loading certs:', err);
  }
}

function filterCertificatesDropdownByCohort() {
  updateCertDropdown();
  const select = document.getElementById('cert-child-select');
  if (select && select.value) {
    renderCertificate(select.value);
  } else {
    renderCertificate(null);
  }
}

function updateCertDropdown() {
  const select = document.getElementById('cert-child-select');
  if (!select) return;

  const selCohort = document.getElementById('cert-filter-cohort')?.value;
  const searchQ = (document.getElementById('cert-filter-search')?.value || '').toLowerCase().trim();

  select.innerHTML = '';
  if (currentCertType === 'activity') {
    let list = Array.isArray(activityCerts) ? activityCerts : [];
    if (selCohort) list = list.filter(c => c.cohort_id == selCohort);
    if (searchQ) list = list.filter(c => (c.child_name || '').toLowerCase().includes(searchQ) || (c.program_name || '').toLowerCase().includes(searchQ));

    if (list.length > 0) {
      list.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.child_name} — ${c.program_name}</option>`;
      });
    } else {
      select.innerHTML = `<option value="">(Tidak ada sertifikat modul yang cocok)</option>`;
    }
  } else {
    let list = Array.isArray(exitCerts) ? exitCerts : [];
    if (selCohort) list = list.filter(c => c.cohort_id == selCohort);
    if (searchQ) list = list.filter(c => (c.child_name || '').toLowerCase().includes(searchQ));

    if (list.length > 0) {
      exitCerts.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.child_name} — Kelulusan Purna Asuh</option>`;
      });
    } else {
      select.innerHTML = `<option value="">(Tidak ada sertifikat exit yang cocok)</option>`;
    }
  }
}

function showCertType(type) {
  currentCertType = type;
  const btnAct = document.getElementById('btn-cert-act');
  const btnExit = document.getElementById('btn-cert-exit');

  if (type === 'activity') {
    if (btnAct) btnAct.className = 'text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-900 text-white shadow';
    if (btnExit) btnExit.className = 'text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-200 text-slate-700';
  } else {
    if (btnExit) btnExit.className = 'text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-900 text-white shadow';
    if (btnAct) btnAct.className = 'text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-200 text-slate-700';
  }

  updateCertDropdown();
  renderCertificate();
}

function renderCertificate(selectedId) {
  const container = document.getElementById('certificate-preview-container');
  if (!container) return;

  const select = document.getElementById('cert-child-select');
  const targetId = selectedId || (select ? select.value : null);

  if (currentCertType === 'activity') {
    let cert = null;
    if (Array.isArray(activityCerts) && activityCerts.length > 0) {
      cert = targetId ? activityCerts.find(c => c.id == targetId) : activityCerts[0];
    }

    if (!cert) {
      container.innerHTML = `
        <div class="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
          <p class="font-bold text-sm text-slate-700 mb-1">Belum Ada Sertifikat Modul Kegiatan</p>
          <p class="text-xs">Tidak ada data sertifikat modul dalam cakupan tugas akun Anda.</p>
        </div>
      `;
      return;
    }

    const certHtml = `
      <div class="cert-border-outer rounded-3xl shadow-xl overflow-hidden p-2 text-center text-slate-900">
        <div class="cert-border-inner rounded-2xl space-y-4 relative">
          <div class="cert-watermark">${ppaProfile.code || 'IO-0118'}</div>
          
          <!-- Header Sertifikat Resmi (Single Logo Kiri, Format Rapih Seimbang) -->
          <div class="flex items-center justify-between border-b-2 border-amber-600/30 pb-3">
            <div class="flex items-center space-x-3 text-left">
              <img src="${ppaProfile.ppa_logo_url || '/assets/logo_ppa_agape.png'}" alt="Logo PPA" class="w-12 h-12 object-contain shrink-0">
              <div>
                <span class="text-[11px] font-black tracking-widest text-blue-950 uppercase block">${ppaProfile.church_name || 'GNKP-INDONESIA'}</span>
                <span class="text-[10px] font-bold text-slate-700 uppercase block">${ppaProfile.church_district || 'DISTRIK 3 DENNINGER'}</span>
                <span class="text-[9px] font-extrabold text-amber-800 uppercase block mt-0.5">${ppaProfile.name || 'PPA IO-0118 AGAPE DENNINGER'} • MITRA COMPASSION</span>
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs font-mono font-bold text-slate-600 block">No: ${cert.certificate_number || 'CERT-PPA/IO0118/2026/09/001'}</span>
              <span class="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 inline-block">Sertifikat Resmi Kelulusan</span>
            </div>
          </div>

          <h2 class="font-cert-title text-2xl font-bold tracking-widest text-amber-900 pt-2">SERTIFIKAT KELULUSAN KEGIATAN</h2>
          <p class="text-xs text-slate-600 uppercase tracking-widest">Diberikan secara resmi kepada:</p>
          
          <h1 class="text-3xl font-serif-title font-bold text-blue-950 my-2 underline decoration-amber-500">${cert.child_name}</h1>
          <p class="text-xs font-mono text-slate-500">ID Anak Compassion: ${cert.child_id_compassion}</p>

          <p class="text-xs text-slate-700 max-w-xl mx-auto leading-relaxed mt-2">
            Telah menyelesaikan seluruh rangkaian 12 Sesi Pertemuan dengan komitmen penuh pada program:
          </p>

          <div class="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl max-w-lg mx-auto">
            <h3 class="font-bold text-sm text-blue-950">${cert.program_name}</h3>
            <p class="text-xs text-amber-900 mt-0.5">Pilar ${cert.pillar || 'Kognitif & Vokasi'} (${cert.duration_months || 3} Bulan)</p>
          </div>

          <p class="text-xs font-semibold text-slate-800">
            Dinyatakan lulus dengan predikat: <span class="text-emerald-700 font-extrabold uppercase bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">${cert.predicate || 'Sangat Baik (Distinction)'}</span>
          </p>

          <!-- Tanda Tangan Resmi (2 Kolom Seimbang, Tanpa Stempel Mengapung) -->
          <div class="grid grid-cols-2 gap-8 pt-8 max-w-md mx-auto text-xs text-center">
            <div>
              <p class="text-slate-600 mb-12">Tutor (Instruktur),</p>
              <p class="font-bold text-slate-900 underline">${cert.tutor_name || 'Instruktur / Mentor'}</p>
              <p class="text-[10px] text-slate-500">Instruktur Pelatihan</p>
            </div>
            <div>
              <p class="text-slate-600 mb-12">Disahkan Oleh,<br><span class="font-semibold text-slate-800">Koordinator PPA</span>,</p>
              <p class="font-bold text-slate-900 underline">${ppaProfile.coordinator_name || 'Oryet Fanolo Harefa'}</p>
              <p class="text-[10px] text-slate-500">${ppaProfile.name || 'PPA IO-0118 Agape Denninger'}</p>
            </div>
          </div>

        </div>
      </div>
    `;
    container.innerHTML = certHtml;
    const printArea = document.getElementById('print-area');
    if (printArea) printArea.innerHTML = `<div class="print-sheet p-8">${certHtml}</div>`;
  } else {
    let cert = null;
    if (Array.isArray(exitCerts) && exitCerts.length > 0) {
      cert = targetId ? exitCerts.find(c => c.id == targetId) : exitCerts[0];
    }

    if (!cert) {
      container.innerHTML = `
        <div class="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
          <p class="font-bold text-sm text-slate-700 mb-1">Belum Ada Sertifikat Kelulusan Akhir (Exit)</p>
          <p class="text-xs">Tidak ada data purna asuh dalam cakupan tugas akun Anda.</p>
        </div>
      `;
      return;
    }

    const exitHtml = `
      <div class="cert-border-outer rounded-3xl shadow-xl overflow-hidden p-2 text-center text-slate-900">
        <div class="cert-border-inner rounded-2xl space-y-4 relative">
          <div class="cert-watermark">PURNA ASUH</div>
          
          <!-- KOP SURAT RESMI DISTRIK 3 DENNINGER (BPHD) GNKP-INDONESIA -->
          <div class="border-b-2 border-slate-900 pb-3 mb-3 flex items-center space-x-4 text-left">
            <img src="/assets/logo_gnkp_indonesia.png" alt="Logo Resmi GNKP" class="w-14 h-18 object-contain shrink-0">
            <div class="flex-1">
              <h2 class="text-xs font-black uppercase text-slate-900 leading-tight">GEREJA NIHA KERISO PROTESTAN INDONESIA</h2>
              <p class="text-[10px] font-bold text-slate-700 uppercase">(GNKP-INDONESIA) ANGGOTA PGI</p>
              <h1 class="text-sm font-black uppercase tracking-wider text-blue-950 mt-0.5">DISTRIK 3 DENNINGER</h1>
              <p class="text-[9px] text-slate-600">JALAN DIPONEGORO NO. 260-A HP/WA. 081265075380 KOTA GUNUNGSITOLI 22815</p>
            </div>
            <div class="text-right shrink-0">
              <span class="text-[10px] font-mono bg-purple-100 text-purple-900 px-2.5 py-1 rounded font-extrabold block">SURAT REKOMENDASI RESMI</span>
              <span class="text-[9px] text-slate-600 font-mono">BPH Distrik 3 Denninger</span>
            </div>
          </div>

          <h2 class="font-cert-title text-2xl font-bold tracking-widest text-purple-950 pt-1">SERTIFIKAT KELULUSAN PURNA ASUH (EXIT)</h2>
          <p class="text-xs text-slate-600 uppercase tracking-widest">Dengan rasa syukur dianugerahkan kepada:</p>
          
          <h1 class="text-3xl font-serif-title font-bold text-purple-950 my-2 underline decoration-purple-500">${cert.child_name}</h1>
          <p class="text-xs font-mono text-slate-500">ID Anak: ${cert.child_id_compassion} | Lama Dampingan: 7 Tahun di ${ppaProfile.name || 'PPA IO-0118 Agape Denninger'}</p>

          <p class="text-xs text-slate-700 max-w-xl mx-auto leading-relaxed mt-2">
            Telah menyelesaikan seluruh jenjang pembinaan holistik (Spiritual, Fisik, Kognitif, Sosio-Emosional) dan dinyatakan siap bertransisi mandiri ke dunia perguruan tinggi dan dunia kerja.
          </p>

          <div class="bg-purple-50 border border-purple-200 p-4 rounded-2xl max-w-xl mx-auto text-left text-xs">
            <span class="font-bold text-purple-950 block uppercase tracking-wider mb-1">Rekomendasi Resmi Komisi Pengawas / BPHD Gereja Mitra:</span>
            <p class="text-purple-900 leading-relaxed italic">
              "${cert.spiritual_mentor_recommendation || 'Anak dampingan telah menyelesaikan seluruh siklus pembinaan holistik dengan integritas tinggi dan prestasi konsisten.'}"
            </p>
            <div class="mt-2 pt-2 border-t border-purple-200 font-semibold text-purple-950 flex justify-between">
              <span>IPK Holistik: ${cert.holistic_gpa || '3.85 / 4.0'}</span>
              <span>Jalur: ${cert.vocational_field || 'Vokasi & Mandiri'}</span>
            </div>
          </div>

          <!-- Tanda Tangan Resmi Pengurus BPHD 3 Denninger & Koordinator PPA -->
          <div class="grid grid-cols-3 gap-4 pt-6 max-w-xl mx-auto text-xs text-center">
            <div>
              <p class="text-slate-600 mb-10">Ketua BPHD 3 Denninger,<br><span class="text-[10px] text-slate-500">(Badan Pekerja Harian Distrik)</span></p>
              <p class="font-bold text-slate-900 underline">Pdt. Monaati Zebua, M.Pd</p>
              <p class="text-[10px] text-slate-500">Ketua BPHD 3</p>
            </div>
            <div>
              <p class="text-slate-600 mb-10">Disahkan PPA,<br><span class="text-[10px] text-slate-500">Koordinator Sentra</span></p>
              <p class="font-bold text-slate-900 underline">${ppaProfile.coordinator_name || 'Oryet Fanolo Harefa'}</p>
              <p class="text-[10px] text-slate-500">${ppaProfile.code || 'PPA IO-0118'}</p>
            </div>
            <div>
              <p class="text-slate-600 mb-10">Sekretaris BPHD 3 Denninger,<br><span class="text-[10px] text-slate-500">(Badan Pekerja Harian Distrik)</span></p>
              <p class="font-bold text-slate-900 underline">SNK. Martonlius Telaumbanua, SH</p>
              <p class="text-[10px] text-slate-500">Sekretaris BPHD 3</p>
            </div>
          </div>

        </div>
      </div>
    `;
    container.innerHTML = exitHtml;
    const printArea = document.getElementById('print-area');
    if (printArea) printArea.innerHTML = `<div class="print-sheet p-8">${exitHtml}</div>`;
  }
  lucide.createIcons();
}

// ==========================================
// 12. STAFF & ACCOUNT MANAGEMENT
// ==========================================
async function loadStaff() {
  try {
    const res = await fetch(`/api/staff?ppa_id=${currentPpaId}`);
    staffData = await res.json();

    const total = staffData.length;
    const pengawasCount = staffData.filter(s => s.role === 'komisi_pengawas').length;
    const mentorCount = staffData.filter(s => s.role === 'mentor').length;
    const tutorCount = staffData.filter(s => s.role === 'tutor').length;

    const elTotal = document.getElementById('staff-stat-total');
    const elPengawas = document.getElementById('staff-stat-pengawas');
    const elMentor = document.getElementById('staff-stat-mentor');
    const elTutor = document.getElementById('staff-stat-tutor');

    if (elTotal) elTotal.innerText = `${total} Staf`;
    if (elPengawas) elPengawas.innerText = `${pengawasCount} Akun`;
    if (elMentor) elMentor.innerText = `${mentorCount} Akun`;
    if (elTutor) elTutor.innerText = `${tutorCount} Akun`;

    renderStaffList();
  } catch (err) {
    console.error('Error loading staff:', err);
  }
}

function filterStaffRole(role) {
  currentStaffFilterRole = role;
  document.querySelectorAll('.staff-filter-btn').forEach(btn => {
    if (btn.getAttribute('data-role') === role) {
      btn.classList.add('bg-blue-900', 'text-white');
      btn.classList.remove('bg-slate-100', 'text-slate-700');
    } else {
      btn.classList.remove('bg-blue-900', 'text-white');
      btn.classList.add('bg-slate-100', 'text-slate-700');
    }
  });
  renderStaffList();
}

function filterStaffSearch(query) {
  renderStaffList(query.toLowerCase());
}

function renderStaffList(searchQuery = '') {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  let filtered = staffData;
  if (currentStaffFilterRole !== 'all') {
    filtered = filtered.filter(s => s.role === currentStaffFilterRole);
  }
  if (searchQuery) {
    filtered = filtered.filter(s =>
      s.full_name.toLowerCase().includes(searchQuery) ||
      s.username.toLowerCase().includes(searchQuery) ||
      (s.title && s.title.toLowerCase().includes(searchQuery)) ||
      (s.specialization && s.specialization.toLowerCase().includes(searchQuery))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">Tidak ada data staf yang sesuai filter.</td></tr>`;
    return;
  }

  const roleBadges = {
    komisi_pengawas: { text: '🛡️ Komisi Pengawas', class: 'bg-amber-100 text-amber-950 border-amber-300' },
    koordinator_ppa: { text: '👔 Koordinator PPA', class: 'bg-blue-100 text-blue-950 border-blue-300' },
    mentor: { text: '📖 Mentor (Wali)', class: 'bg-emerald-100 text-emerald-950 border-emerald-300' },
    tutor: { text: '💻 Tutor (Instruktur)', class: 'bg-purple-100 text-purple-950 border-purple-300' },
    compassion_pusat: { text: '🌐 Compassion PF', class: 'bg-sky-100 text-sky-950 border-sky-300' },
    admin: { text: '⚡ Administrator', class: 'bg-red-100 text-red-950 border-red-300' }
  };

  filtered.forEach(s => {
    const badge = roleBadges[s.role] || { text: s.role, class: 'bg-slate-100 text-slate-800 border-slate-300' };
    const photo = s.photo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80';

    let assignmentText = '-';
    if (s.role === 'mentor') {
      assignmentText = s.cohort_name ? `<span class="font-bold text-emerald-900">${s.cohort_name}</span>` : `<span class="text-slate-400">Belum diplot kelas</span>`;
      if (s.specialization) assignmentText += `<br><span class="text-[10px] text-slate-500">${s.specialization}</span>`;
    } else if (s.role === 'tutor') {
      assignmentText = s.specialization ? `<span class="font-bold text-purple-900">${s.specialization}</span>` : `<span class="text-slate-400">Instruktur Keterampilan</span>`;
    } else if (s.role === 'komisi_pengawas') {
      assignmentText = `<span class="font-bold text-amber-900">Audit Tata Kelola & Mutu 4 Pilar</span>`;
    } else if (s.role === 'koordinator_ppa') {
      assignmentText = `<span class="font-bold text-blue-900">Pimpinan Operasional Sentra</span>`;
    }

    tbody.innerHTML += `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="p-3.5 text-center">
          <img src="${photo}" alt="${s.full_name}" class="w-12 h-12 rounded-full object-cover border border-slate-300 shadow-sm mx-auto">
        </td>
        <td class="p-3.5">
          <strong class="text-slate-900 text-sm font-extrabold block">${s.full_name}</strong>
          <span class="text-xs text-slate-500 font-medium">${s.title || s.role}</span>
        </td>
        <td class="p-3.5">
          <span class="px-3 py-1 rounded-lg text-xs font-bold border ${badge.class}">
            ${badge.text}
          </span>
        </td>
        <td class="p-3.5 text-xs font-semibold leading-relaxed">
          ${assignmentText}
        </td>
        <td class="p-3.5">
          <span class="font-mono font-extrabold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 text-xs">@${s.username}</span>
          ${s.phone ? `<span class="block text-xs text-slate-600 mt-1.5 font-mono">${s.phone}</span>` : ''}
        </td>
        <td class="p-3.5 text-center">
          ${s.is_active === 1 ? `
            <button onclick="toggleStaffStatus(${s.id})" class="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition cursor-pointer" title="Akun Aktif. Klik jika ingin menonaktifkan akun.">
              ● Aktif
            </button>
          ` : `
            <button onclick="toggleStaffStatus(${s.id})" class="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300 transition cursor-pointer" title="Akun Non-Aktif. Klik jika ingin mengaktifkan kembali.">
              ○ Non-Aktif
            </button>
          `}
        </td>
        <td class="p-3.5 text-center space-x-1.5 shrink-0 whitespace-nowrap">
          <button onclick="printStaffCredential(${s.id})" class="bg-blue-50 hover:bg-blue-100 text-blue-900 px-3 py-1.5 rounded-xl border border-blue-200 font-bold text-xs transition" title="Cetak Kartu Kredensial & Surat Penugasan">
            🖨️ Kredensial
          </button>
          <button onclick="editStaff(${s.id})" class="bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-200 font-bold text-xs transition" title="Edit Biodata & Peran">
            Edit
          </button>
          ${s.username !== 'admin' ? `
            <button onclick="deleteStaff(${s.id})" class="bg-red-50 hover:bg-red-100 text-red-800 px-3 py-1.5 rounded-xl border border-red-200 font-bold text-xs transition" title="Hapus Akun">
              Hapus
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  });

  lucide.createIcons();
}

function openModalStaff() {
  document.getElementById('form-staff').reset();
  document.getElementById('staff-id').value = '';
  document.getElementById('staff-photo-preview').src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80';
  document.getElementById('staff-photo-url').value = '';
  document.getElementById('modal-staff-title').innerText = 'Formulir Pendaftaran Staf Pelayan & Penerbitan Akun';
  document.getElementById('staff-username').removeAttribute('readonly');
  document.querySelectorAll('input[name="staff_cohort"]').forEach(cb => cb.checked = false);
  updateStaffRoleFields('mentor');
  openModal('modal-staff');
}

function updateStaffRoleFields(role) {
  const cohortGroup = document.getElementById('staff-cohort-group');
  if (role === 'mentor') {
    cohortGroup.classList.remove('hidden');
  } else {
    cohortGroup.classList.add('hidden');
  }
}

function previewStaffPhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('staff-photo-preview').src = e.target.result;
      document.getElementById('staff-photo-url').value = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function editStaff(id) {
  const s = staffData.find(item => item.id === id);
  if (!s) return;

  document.getElementById('staff-id').value = s.id;
  document.getElementById('staff-fullname').value = s.full_name;
  document.getElementById('staff-title').value = s.title || '';
  document.getElementById('staff-role').value = s.role;
  document.getElementById('staff-specialization').value = s.specialization || '';
  document.getElementById('staff-phone').value = s.phone || '';
  document.getElementById('staff-email').value = s.email || '';
  document.getElementById('staff-username').value = s.username;
  document.getElementById('staff-username').setAttribute('readonly', true);
  document.getElementById('staff-password').value = '';

  // Multi-cohort checkboxes assignment
  const activeCohortIds = (s.cohort_ids ? s.cohort_ids.toString().split(',') : (s.assigned_cohort_id ? [s.assigned_cohort_id.toString()] : []));
  document.querySelectorAll('input[name="staff_cohort"]').forEach(cb => {
    cb.checked = activeCohortIds.includes(cb.value);
  });

  const photo = s.photo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80';
  document.getElementById('staff-photo-preview').src = photo;
  document.getElementById('staff-photo-url').value = s.photo_url || '';

  updateStaffRoleFields(s.role);
  document.getElementById('modal-staff-title').innerText = `Edit Staf & Kredensial: ${s.full_name}`;
  openModal('modal-staff');
}

async function handleStaffSubmit(event) {
  event.preventDefault();
  const staffId = document.getElementById('staff-id').value;

  const checkedCohorts = Array.from(document.querySelectorAll('input[name="staff_cohort"]:checked')).map(cb => parseInt(cb.value));

  const payload = {
    ppa_id: currentPpaId,
    full_name: document.getElementById('staff-fullname').value,
    title: document.getElementById('staff-title').value,
    role: document.getElementById('staff-role').value,
    assigned_cohort_ids: checkedCohorts,
    assigned_cohort_id: checkedCohorts[0] || null,
    specialization: document.getElementById('staff-specialization').value,
    phone: document.getElementById('staff-phone').value,
    email: document.getElementById('staff-email').value,
    photo_url: document.getElementById('staff-photo-url').value,
    username: document.getElementById('staff-username').value.trim().toLowerCase(),
    password: document.getElementById('staff-password').value
  };

  const url = staffId ? `/api/staff/${staffId}` : '/api/staff';
  const method = staffId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Gagal menyimpan data staf.', 'error');
      return;
    }

    closeModal('modal-staff');
    await loadStaff();

    if (!staffId) {
      if (confirm(`Akun staf "${payload.full_name}" berhasil dibuat dengan username "@${payload.username}"!\n\nApakah Anda ingin langsung mencetak Kartu Kredensial Akun Staf ini?`)) {
        printStaffCredential(data.staff.id);
      }
    } else {
      showToast('Biodata staf berhasil diperbarui.', 'success');
    }
  } catch (err) {
    showToast('Kesalahan jaringan saat menyimpan staf.', 'error');
  }
}

async function toggleStaffStatus(id) {
  const s = staffData.find(item => item.id === id);
  if (!s) return;
  const actionText = s.is_active === 1 ? 'MENONAKTIFKAN' : 'MENGAKTIFKAN KEMBALI';
  const confirmMsg = s.is_active === 1
    ? `Apakah Anda yakin ingin MENONAKTIFKAN akun pelayan "${s.full_name}"?\n\n• Hak login akan dicabut sehingga tidak bisa masuk ke sistem.\n• Seluruh data riwayat mengajar, nilai rapor, dan prestasi anak TETAP UTUH & AMAN.`
    : `Aktifkan kembali akun pelayan "${s.full_name}"?\n\n• Hak akses login akan dipulihkan kembali.`;

  if (confirm(confirmMsg)) {
    try {
      const res = await fetch(`/api/staff/${id}/toggle-status`, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        await loadStaff();
      } else {
        showToast(data.error || 'Gagal mengubah status staf.', 'error');
      }
    } catch (err) {
      showToast('Kesalahan jaringan saat mengubah status staf.', 'error');
    }
  }
}

async function deleteStaff(id) {
  const s = staffData.find(item => item.id === id);
  const name = s ? s.full_name : 'ini';
  if (confirm(`PENTING: PERLINDUNGAN ARSIP ANAK\n\nMenghapus akun "${name}" TIDAK AKAN MENGHAPUS data binaan anak, nilai rapor 4 pilar, sertifikat, atau absensi anak.\n\nApakah Anda yakin ingin menghapus akun pelayan ini?`)) {
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Staf berhasil dihapus.', 'success');
        await loadStaff();
      } else {
        showToast(data.error || 'Gagal menghapus staf.', 'error');
      }
    } catch (err) {
      showToast('Gagal menghapus staf.', 'error');
    }
  }
}

function printStaffCredential(id) {
  const s = staffData.find(item => item.id === id);
  if (!s) return;

  const photo = s.photo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80';
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let assignmentInfo = '-';
  if (s.role === 'mentor') {
    assignmentInfo = `Wali Kelas ${s.cohort_name || 'Kelompok Usia'}${s.specialization ? ' (' + s.specialization + ')' : ''}`;
  } else if (s.role === 'tutor') {
    assignmentInfo = `Instruktur Keterampilan / Vokasi: ${s.specialization || '-'}`;
  } else if (s.role === 'komisi_pengawas') {
    assignmentInfo = `Anggota Komisi Pengawas Kemitraan Gereja (BPK / CPC)`;
  } else {
    assignmentInfo = s.title || s.role;
  }

  const slipHtml = `
    <!-- KOP SURAT PPA SINGLE LOGO ASLI -->
    <div class="border-b-4 border-double border-slate-900 pb-3 mb-5">
      <div class="flex items-center space-x-4">
        <img src="${ppaProfile.ppa_logo_url || '/assets/logo_ppa_agape.png'}" alt="Logo PPA" class="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0">
        <div class="flex-1 text-center">
          <h2 class="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
            ${ppaProfile.church_name || 'GEREJA NIHA KERISO PROTESTAN INDONESIA'}
          </h2>
          ${ppaProfile.church_membership ? `<p class="text-[9px] font-bold tracking-widest text-slate-700 uppercase">(${ppaProfile.church_membership})</p>` : ''}
          <h3 class="text-xs font-black uppercase tracking-widest text-slate-800 mt-0.5">
            ${ppaProfile.church_district || 'DISTRIK 3 DENNINGER'}
          </h3>
          <h1 class="text-sm sm:text-base font-black uppercase tracking-tight text-blue-950 mt-1">
            ${ppaProfile.name || 'PUSAT PENGEMBANGAN ANAK IO-0118 AGAPE DENNINGER'}
          </h1>
          <p class="text-[10px] text-slate-600 font-medium mt-0.5">
            ${ppaProfile.address || 'JALAN DIPONEGORO NO. 260-A'} HP/WA. ${ppaProfile.phone || '085184166754'} ${ppaProfile.city ? ppaProfile.city.toUpperCase() : 'KOTA GUNUNGSITOLI'} ${ppaProfile.postal_code || '22815'}
          </p>
        </div>
      </div>
    </div>

    <!-- Judul Dokumen Kredensial -->
    <div class="text-center mb-6">
      <h3 class="text-base font-black uppercase tracking-wider text-slate-900 underline">SURAT PENUGASAN & KARTU KREDENSIAL AKUN PELAYAN PPA</h3>
      <p class="text-xs text-slate-600 mt-0.5">Nomor: <strong class="font-mono text-blue-950">088/SP-AKUN/${ppaProfile.code || 'IO-0118'}/2026</strong> | Tanggal: <strong>${today}</strong></p>
    </div>

    <!-- Data Pelayan Card -->
    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-5 flex flex-col sm:flex-row items-center gap-5">
      <div class="shrink-0 text-center">
        <img src="${photo}" alt="${s.full_name}" class="w-24 h-28 object-cover rounded-xl border-2 border-slate-300 shadow bg-white">
        <span class="text-[10px] font-bold text-slate-500 block mt-1 uppercase">Foto Pelayan</span>
      </div>
      <div class="flex-1 text-xs space-y-1.5 w-full">
        <div class="grid grid-cols-3 gap-2 py-1 border-b border-slate-200">
          <span class="text-slate-500 font-semibold">Nama Lengkap & Gelar:</span>
          <span class="col-span-2 font-bold text-slate-900 text-sm">${s.full_name}</span>
        </div>
        <div class="grid grid-cols-3 gap-2 py-1 border-b border-slate-200">
          <span class="text-slate-500 font-semibold">Jabatan di Sentra:</span>
          <span class="col-span-2 font-bold text-slate-800">${s.title || s.role}</span>
        </div>
        <div class="grid grid-cols-3 gap-2 py-1 border-b border-slate-200">
          <span class="text-slate-500 font-semibold">Peran Sistem:</span>
          <span class="col-span-2 font-extrabold text-blue-900 uppercase">${s.role.replace('_', ' ')}</span>
        </div>
        <div class="grid grid-cols-3 gap-2 py-1 border-b border-slate-200">
          <span class="text-slate-500 font-semibold">Penugasan Sentra:</span>
          <span class="col-span-2 font-bold text-emerald-900">${assignmentInfo}</span>
        </div>
        <div class="grid grid-cols-3 gap-2 py-1">
          <span class="text-slate-500 font-semibold">Kontak WhatsApp:</span>
          <span class="col-span-2 font-mono font-bold text-slate-800">${s.phone || '-'}</span>
        </div>
      </div>
    </div>

    <!-- Informasi Akun Login -->
    <div class="bg-blue-50/70 border-2 border-dashed border-blue-300 p-4 rounded-2xl mb-5 text-xs">
      <h4 class="font-extrabold text-blue-950 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
        <i data-lucide="key" class="w-4 h-4 text-blue-900 inline"></i>
        <span>Informasi Kredensial Akses Aplikasi (PATHWAY-PPA)</span>
      </h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <div class="bg-white p-3 rounded-xl border border-blue-200">
          <span class="text-[11px] text-slate-500 block font-semibold">Username Login:</span>
          <strong class="font-mono text-base text-blue-950">${s.username}</strong>
        </div>
        <div class="bg-white p-3 rounded-xl border border-blue-200">
          <span class="text-[11px] text-slate-500 block font-semibold">Password Standar:</span>
          <strong class="font-mono text-base text-amber-900">password123</strong>
          <span class="text-[10px] text-slate-400 block mt-0.5">(Dapat diubah mandiri setelah masuk)</span>
        </div>
      </div>
      <p class="text-[11px] text-blue-900 mt-2.5">
        Akses Web Aplikasi: <strong class="font-mono text-blue-950">http://localhost:3000</strong>
      </p>
    </div>

    <!-- Pakta Integritas Perlindungan Anak (Child Protection Policy) -->
    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs mb-6 text-slate-700 leading-relaxed">
      <strong class="font-bold text-slate-900 block mb-1">Pakta Integritas & Perlindungan Anak (Child Protection Agreement):</strong>
      <p class="italic text-[11px]">
        "Sebagai pelayan di Pusat Pengembangan Anak (PPA), saya berkomitmen menjaga kerahasiaan data anak dampingan, mengutamakan keselamatan dan perlindungan anak sesuai standar Compassion, serta tidak memberikan akses akun ini kepada pihak yang tidak berwenang."
      </p>
    </div>

    <!-- Kolom Tanda Tangan Resmi -->
    <div class="grid grid-cols-2 gap-8 text-xs text-center mt-6">
      <div>
        <p class="text-slate-600 mb-12">Pelayan yang Menerima Tugas,<br><span class="text-[10px] text-slate-500">(${s.title || s.role})</span></p>
        <p class="font-bold text-slate-900 underline">${s.full_name}</p>
        <p class="text-[10px] text-slate-500 font-mono">ID Staf: #${s.id}</p>
      </div>
      <div>
        <p class="text-slate-600 mb-12">Mengetahui & Menyerahkan,<br><span class="text-[10px] text-slate-500">Koordinator PPA</span></p>
        <p class="font-bold text-slate-900 underline">${ppaProfile.coordinator_name || 'Oryet Fanolo Harefa'}</p>
        <p class="text-[10px] text-slate-500">${ppaProfile.name || 'PPA Agape Denninger'}</p>
      </div>
    </div>
  `;

  document.getElementById('staff-credential-content').innerHTML = slipHtml;
  document.getElementById('print-area').innerHTML = `<div class="print-sheet p-8">${slipHtml}</div>`;
  openModal('modal-staff-credential');
  lucide.createIcons();
}

// ==========================================
// 13. CHILD LIFECYCLE JOURNEY (INSERT -> BERPROSES -> EXIT)
// ==========================================
async function viewChildJourney(childId) {
  try {
    const res = await fetch(`/api/children/${childId}/journey`);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Gagal memuat daur hidup anak.', 'error');
      return;
    }

    const { child, health, programs, reports, certificates, exitPortfolio } = data;
    const photo = child.photo_data || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=300&q=80';

    document.getElementById('journey-child-title').innerText = `Daur Hidup Anak: ${child.full_name} (${child.child_id_compassion})`;
    document.getElementById('journey-child-subtitle').innerText = `Kelas: ${child.cohort_name} | Status: ${child.status} | Sentra: ${child.ppa_name}`;

    const journeyHtml = `
      <!-- KOP RESMI PPA SINGLE LOGO -->
      <div class="border-b-4 border-double border-slate-900 pb-3 mb-5">
        <div class="flex items-center space-x-4">
          <img src="${ppaProfile.ppa_logo_url || '/assets/logo_ppa_agape.png'}" alt="Logo PPA" class="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0">
          <div class="flex-1 text-center">
            <h2 class="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
              ${ppaProfile.church_name || 'GEREJA NIHA KERISO PROTESTAN INDONESIA'}
            </h2>
            ${ppaProfile.church_membership ? `<p class="text-[9px] font-bold tracking-widest text-slate-700 uppercase">(${ppaProfile.church_membership})</p>` : ''}
            <h3 class="text-xs font-black uppercase tracking-widest text-slate-800 mt-0.5">
              ${ppaProfile.church_district || 'DISTRIK 3 DENNINGER'}
            </h3>
            <h1 class="text-sm sm:text-base font-black uppercase tracking-tight text-blue-950 mt-1">
              ${ppaProfile.name || 'PUSAT PENGEMBANGAN ANAK IO-0118 AGAPE DENNINGER'}
            </h1>
            <p class="text-[10px] text-slate-600 font-medium mt-0.5">
              ${ppaProfile.address || 'JALAN DIPONEGORO NO. 260-A'} HP/WA. ${ppaProfile.phone || '085184166754'} ${ppaProfile.city ? ppaProfile.city.toUpperCase() : 'KOTA GUNUNGSITOLI'} ${ppaProfile.postal_code || '22815'}
            </p>
          </div>
        </div>
      </div>

      <!-- Ringkasan Identitas Anak -->
      <div class="flex flex-col sm:flex-row items-center gap-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <img src="${photo}" alt="${child.full_name}" class="w-24 h-32 object-cover rounded-xl border-2 border-slate-300 shadow shrink-0">
        <div class="flex-1 text-xs space-y-1.5 w-full">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-black text-slate-900">${child.full_name} (${child.nickname || '-'})</h3>
            <span class="px-3 py-1 rounded-full text-xs font-black ${child.status === 'Aktif' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-purple-100 text-purple-900 border border-purple-300'}">
              ${child.status}
            </span>
          </div>
          <p class="text-slate-600"><strong class="text-slate-800">Child ID Compassion:</strong> <span class="font-mono font-bold text-blue-900">${child.child_id_compassion}</span> | Jenis Kelamin: <strong>${child.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</strong></p>
          <p class="text-slate-600"><strong class="text-slate-800">TTL:</strong> ${child.birth_place || 'Gunungsitoli'}, ${child.birth_date} | Kelompok: <strong>${child.cohort_name}</strong></p>
          <p class="text-slate-600"><strong class="text-slate-800">Pendidikan Umum:</strong> ${child.school_name || '-'} (${child.school_grade || '-'}) | Hobi: ${child.hobby || '-'}</p>
          <p class="text-slate-600"><strong class="text-slate-800">Cita-Cita Masa Depan:</strong> <span class="font-extrabold text-emerald-800">${child.dream_ambition || '-'}</span></p>
        </div>
      </div>

      <!-- PIPELINE 3 TAHAPAN DAUR HIDUP ANAK -->
      <div class="space-y-6">

        <!-- ==================== TAHAP 1: INSERT ==================== -->
        <div class="bg-white rounded-2xl border-2 border-blue-200 overflow-hidden shadow-sm">
          <div class="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3.5 px-5 flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <span class="w-7 h-7 rounded-lg bg-amber-400 text-blue-950 font-black flex items-center justify-center text-xs">1</span>
              <div>
                <h4 class="font-black text-sm">FASE 1: INSERT (PENDAFTARAN, INTAKE & REGISTRASI SPONSOR)</h4>
                <p class="text-[10px] text-blue-200">Awal mula anak diterima dalam perlindungan dan pembinaan Compassion di PPA</p>
              </div>
            </div>
            <span class="bg-blue-800 text-amber-300 px-2.5 py-1 rounded-md text-[11px] font-bold border border-blue-700">Terdaftar & Terverifikasi</span>
          </div>
          <div class="p-5 text-xs grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/20">
            <div class="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span class="text-slate-400 font-semibold block text-[10px] uppercase">Data Keluarga & Wali</span>
              <p class="font-bold text-slate-800">Ayah: ${child.father_name || '-'}</p>
              <p class="font-bold text-slate-800">Ibu: ${child.mother_name || '-'}</p>
              <p class="text-slate-600 font-mono text-[11px]">HP: ${child.parent_phone || '-'}</p>
            </div>
            <div class="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span class="text-slate-400 font-semibold block text-[10px] uppercase">Domisili / Alamat</span>
              <p class="font-bold text-slate-800">${child.home_address || 'Kota Gunungsitoli'}</p>
              <p class="text-slate-500">Sentra PPA: ${child.ppa_name}</p>
            </div>
            <div class="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span class="text-slate-400 font-semibold block text-[10px] uppercase">Penempatan Awal Sentra</span>
              <p class="font-bold text-blue-900">${child.cohort_name}</p>
              <p class="text-slate-500">Rentang Usia: ${child.age_range}</p>
            </div>
          </div>
        </div>

        <!-- ==================== TAHAP 2: BERPROSES ==================== -->
        <div class="bg-white rounded-2xl border-2 border-emerald-200 overflow-hidden shadow-sm">
          <div class="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-3.5 px-5 flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <span class="w-7 h-7 rounded-lg bg-amber-400 text-blue-950 font-black flex items-center justify-center text-xs">2</span>
              <div>
                <h4 class="font-black text-sm">FASE 2: BERPROSES (PEMBINAAN HOLISTIK 4 PILAR & TUMBUH KEMBANG)</h4>
                <p class="text-[10px] text-emerald-200">Stimulasi Motorik & PMT Gizi, Modul Keterampilan/Vokasi 12 Sesi, Evaluasi Semesteran</p>
              </div>
            </div>
            <span class="bg-emerald-700 text-white px-2.5 py-1 rounded-md text-[11px] font-bold border border-emerald-600">Sedang Berlangsung</span>
          </div>

          <div class="p-5 space-y-4 text-xs">
            <!-- 2A. Rekam Fisik & PMT -->
            <div class="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
              <h5 class="font-extrabold text-emerald-950 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <i data-lucide="heart-pulse" class="w-4 h-4 text-emerald-700"></i>
                <span>Pilar Fisik & Kesehatan (Antropometri & PMT Gizi):</span>
              </h5>
              ${health && health.length > 0 ? `
                <div class="space-y-2">
                  ${health.slice(0, 2).map(h => `
                    <div class="bg-white p-3 rounded-lg border border-emerald-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <span class="font-bold text-slate-800">Tanggal Cek: ${h.check_date}</span>
                        <span class="mx-2 text-slate-300">|</span>
                        <span class="text-slate-600">BB: <strong>${h.weight_kg} kg</strong> / TB: <strong>${h.height_cm} cm</strong></span>
                        <span class="mx-2 text-slate-300">|</span>
                        <span class="font-bold text-emerald-800">Status: ${h.nutrition_status}</span>
                        <p class="text-slate-600 mt-1"><strong class="text-slate-700">Motorik Kasar:</strong> ${h.gross_motor_skills || '-'}</p>
                      </div>
                      <div class="sm:text-right">
                        <span class="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">PMT: ${h.pmt_menu_served}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <p class="text-slate-500 italic">Belum ada rekam catatan antropometri untuk anak ini.</p>
              `}
            </div>

            <!-- 2B. Program & Modul Keahlian -->
            <div class="bg-purple-50/50 p-4 rounded-xl border border-purple-200">
              <h5 class="font-extrabold text-purple-950 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <i data-lucide="book-open" class="w-4 h-4 text-purple-700"></i>
                <span>Pilar Kognitif, Vokasi & Keterampilan Praktik:</span>
              </h5>
              ${programs && programs.length > 0 ? `
                <div class="space-y-2">
                  ${programs.map(p => `
                    <div class="bg-white p-3 rounded-lg border border-purple-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h6 class="font-bold text-slate-900 text-sm">${p.name}</h6>
                        <p class="text-slate-500 text-[11px]">Pilar: <strong class="text-purple-900">${p.pillar}</strong> | Mentor: ${p.mentor_name} ${p.tutor_name ? '| Tutor: ' + p.tutor_name : ''}</p>
                        ${p.tutor_notes ? `<p class="text-slate-600 mt-1 italic text-[11px]">"Catatan Tutor: ${p.tutor_notes}"</p>` : ''}
                      </div>
                      <div class="sm:text-right shrink-0">
                        ${p.final_tutor_score ? `
                          <span class="font-mono font-black text-sm text-purple-950 block">${p.final_tutor_score} / 4.0</span>
                          <span class="text-[10px] font-bold text-emerald-800">Lulus Uji Praktik</span>
                        ` : `
                          <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Dalam Pelaksanaan</span>
                        `}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <p class="text-slate-500 italic">Anak terdaftar di kelas awal PAUD, pembinaan melalui kegiatan kelas mandiri mentor.</p>
              `}
            </div>

            <!-- 2C. Rapor Semesteran & Sertifikat Modul -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200">
                <h6 class="font-bold text-blue-950 mb-1.5">Evaluasi Rapor Semesteran 4 Pilar:</h6>
                ${reports && reports.length > 0 ? `
                  <p class="text-slate-700">Rapor Terakhir: <strong class="text-blue-950">${reports[0].semester_name}</strong></p>
                  <p class="text-slate-600 text-[11px] mt-1">${reports[0].overall_narrative_summary ? reports[0].overall_narrative_summary.substring(0, 100) + '...' : 'Capaian 4 pilar lengkap'}</p>
                  <div class="mt-2 text-[10px] font-bold text-emerald-800">Status: ${reportStatus(reports[0])}</div>
                ` : `
                  <p class="text-slate-400 italic">Rapor semester berjalan sedang direkapitulasi.</p>
                `}
              </div>

              <div class="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                <h6 class="font-bold text-amber-950 mb-1.5">Sertifikat Modul yang Diraih:</h6>
                ${certificates && certificates.length > 0 ? `
                  <div class="space-y-1">
                    ${certificates.map(c => `
                      <div class="flex items-center justify-between text-[11px] bg-white p-2 rounded border border-amber-200">
                        <span class="font-bold text-slate-800">${c.program_name}</span>
                        <span class="text-amber-800 font-bold">${c.predicate}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <p class="text-slate-400 italic">Belum ada sertifikat modul yang diterbitkan untuk periode ini.</p>
                `}
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== TAHAP 3: EXIT ==================== -->
        <div class="bg-white rounded-2xl border-2 border-purple-300 overflow-hidden shadow-sm">
          <div class="bg-gradient-to-r from-purple-900 via-indigo-950 to-blue-950 text-white p-3.5 px-5 flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <span class="w-7 h-7 rounded-lg bg-amber-400 text-blue-950 font-black flex items-center justify-center text-xs">3</span>
              <div>
                <h4 class="font-black text-sm">FASE 3: EXIT (PURNA ASUH, KELULUSAN & KEMANDIRIAN DEWASA)</h4>
                <p class="text-[10px] text-purple-200">Pelepasan Remaja Usia 18-22 Tahun dengan Portofolio Karir, Rekomendasi Pengawas & Koordinator</p>
              </div>
            </div>
            <span class="bg-purple-800 text-amber-300 px-2.5 py-1 rounded-md text-[11px] font-bold border border-purple-700">
              ${exitPortfolio || child.status === 'Purna Asuh' ? '✅ LULUS / PURNA ASUH' : '⏳ Dalam Tahap Persiapan'}
            </span>
          </div>

          <div class="p-5 text-xs">
            ${exitPortfolio ? `
              <div class="space-y-3 bg-purple-50/40 p-4 rounded-xl border border-purple-200">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-purple-200 pb-2">
                  <div>
                    <span class="text-[10px] uppercase font-bold text-slate-400">Nomor Sertifikat Kelulusan Akhir:</span>
                    <h5 class="font-mono font-black text-purple-950 text-sm">${exitPortfolio.exit_certificate_number}</h5>
                  </div>
                  <div class="sm:text-right">
                    <span class="text-[10px] uppercase font-bold text-slate-400">Total Masa Dampingan PPA:</span>
                    <h5 class="font-bold text-blue-950">${exitPortfolio.years_in_ppa} Tahun Penuh</h5>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span class="font-bold text-slate-700 block">Bakat & Keahlian Utama:</span>
                    <p class="font-semibold text-slate-900">${exitPortfolio.top_talents_skills}</p>
                  </div>
                  <div>
                    <span class="font-bold text-slate-700 block">Jalur Vokasi & Karir:</span>
                    <p class="font-bold text-emerald-900">${exitPortfolio.vocation_career_pathway}</p>
                  </div>
                </div>

                <div class="bg-white p-3 rounded-xl border border-purple-200">
                  <span class="font-bold text-purple-950 block mb-1">Rekomendasi Resmi Komisi Pengawas & Koordinator PPA:</span>
                  <p class="italic text-purple-900 leading-relaxed">"${exitPortfolio.supervisory_recommendation}"</p>
                </div>
              </div>
            ` : `
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
                <p>
                  Ananda saat ini berada di <strong>${child.cohort_name}</strong>. Rangkaian pembinaan masih berlanjut menuju jenjang pemuda (Kelompok 5).
                </p>
                <p class="mt-2 text-[11px] text-slate-500">
                  Saat mencapai usia 18-22 tahun (atau menuntaskan SMK/SMA), sistem akan secara otomatis menerbitkan <strong>Portofolio Kelulusan Akhir (Exit Portfolio)</strong> yang memuat evaluasi holistik akumulatif seluruh tahun pembinaan serta rekomendasi resmi penempatan kerja / beasiswa perguruan tinggi dari Komisi Pengawas.
                </p>
              </div>
            `}
          </div>
        </div>

      </div>

      <!-- Tanda Tangan Dokumen Portofolio Daur Hidup -->
      <div class="grid grid-cols-3 gap-4 pt-8 text-xs text-center border-t border-slate-200 mt-6">
        <div>
          <p class="text-slate-600 mb-12">Wali Kelas (Mentor),<br><span class="text-[10px] text-slate-500">Pendamping Kelompok</span></p>
          <p class="font-bold text-slate-900 underline">${ch.mentor_name || 'Wali Kelas (Mentor)'}</p>
          <p class="text-[10px] text-slate-500">Mentor ${ch.cohort_name || 'Kelompok Usia'}</p>
        </div>
        <div>
          <p class="text-slate-600 mb-12">Mengetahui & Mengaudit,<br><span class="text-[10px] text-slate-500">Komisi Pengawas PPA</span></p>
          <p class="font-bold text-slate-900 underline">${ppaProfile.partnership_head_name || 'SNK. Arozato Harefa, S.Pd'}</p>
          <p class="text-[10px] text-slate-500">Penanggungjawab Kemitraan Gereja</p>
        </div>
        <div>
          <p class="text-slate-600 mb-12">Disahkan Oleh,<br><span class="text-[10px] text-slate-500">Koordinator PPA</span></p>
          <p class="font-bold text-slate-900 underline">${ppaProfile.coordinator_name || 'Oryet Fanolo Harefa'}</p>
          <p class="text-[10px] text-slate-500">${ppaProfile.name || 'PPA IO-0118'}</p>
        </div>
      </div>
    `;

    document.getElementById('child-journey-content').innerHTML = journeyHtml;
    document.getElementById('print-area').innerHTML = `<div class="print-sheet p-8">${journeyHtml}</div>`;
    openModal('modal-child-journey');
    lucide.createIcons();
  } catch (err) {
    console.error('Error viewing child journey:', err);
    showToast('Gagal memuat daur hidup anak.', 'error');
  }
}




// ========================================================
// LESSON PLAN & JADWAL MODAL HANDLERS (UNIFIED IN PROGRAM)
// ========================================================

window.openModalAddLessonPlan = function(progId) {
  try {
    console.log("openModalAddLessonPlan triggered for progId:", progId);
    const p = (programsData || []).find(item => Number(item.id) === Number(progId));
    if (!p) {
      console.warn("Program tidak ditemukan di programsData untuk ID:", progId, programsData);
      showToast("Data program belum selesai dimuat. Silakan tunggu sejenak.", "warning");
      openModal('modal-lessonplan');
      return;
    }

    const nextSessionNum = (Array.isArray(p.lesson_plans) ? p.lesson_plans.length : 0) + 1;

    const form = document.getElementById('form-lessonplan');
    if (form) form.reset();

    const lpIdEl = document.getElementById('lp-id');
    if (lpIdEl) lpIdEl.value = '';

    const lpProgIdEl = document.getElementById('lp-prog-id');
    if (lpProgIdEl) lpProgIdEl.value = p.id;

    const titleEl = document.getElementById('modal-lp-title');
    if (titleEl) titleEl.innerText = `Tambah Sesi untuk: ${p.name}`;

    // Isi Pedoman Acuan Program
    const progNameEl = document.getElementById('lp-guide-prog-name');
    if (progNameEl) progNameEl.innerText = `[${p.cohort_name || 'Kelompok'}] ${p.name}`;

    const bgEl = document.getElementById('lp-guide-bg');
    if (bgEl) bgEl.innerText = p.background || '-';

    const goalEl = document.getElementById('lp-guide-goal');
    if (goalEl) goalEl.innerText = p.qualitative_objective || '-';

    const targetEl = document.getElementById('lp-guide-target');
    if (targetEl) targetEl.innerText = p.measurable_target || '-';

    const numEl = document.getElementById('lp-number');
    if (numEl) numEl.value = nextSessionNum;

    openModal('modal-lessonplan');
  } catch (err) {
    console.error("Error in openModalAddLessonPlan:", err);
    openModal('modal-lessonplan');
  }
};

window.openModalEditLessonPlan = function(progId, lpId) {
  try {
    console.log("openModalEditLessonPlan triggered for progId:", progId, "lpId:", lpId);
    const p = (programsData || []).find(item => Number(item.id) === Number(progId));
    if (!p) {
      showToast("Data program tidak ditemukan.", "error");
      return;
    }
    const lp = (p.lesson_plans || []).find(item => Number(item.id) === Number(lpId));
    if (!lp) {
      showToast("Data sesi lesson plan tidak ditemukan.", "error");
      return;
    }

    const form = document.getElementById('form-lessonplan');
    if (form) form.reset();

    const lpIdEl = document.getElementById('lp-id');
    if (lpIdEl) lpIdEl.value = lp.id;

    const lpProgIdEl = document.getElementById('lp-prog-id');
    if (lpProgIdEl) lpProgIdEl.value = p.id;

    const titleEl = document.getElementById('modal-lp-title');
    if (titleEl) titleEl.innerText = `Ubah Sesi ${lp.session_number}: ${p.name}`;

    // Isi Pedoman Acuan Program
    const progNameEl = document.getElementById('lp-guide-prog-name');
    if (progNameEl) progNameEl.innerText = `[${p.cohort_name || 'Kelompok'}] ${p.name}`;

    const bgEl = document.getElementById('lp-guide-bg');
    if (bgEl) bgEl.innerText = p.background || '-';

    const goalEl = document.getElementById('lp-guide-goal');
    if (goalEl) goalEl.innerText = p.qualitative_objective || '-';

    const targetEl = document.getElementById('lp-guide-target');
    if (targetEl) targetEl.innerText = p.measurable_target || '-';

    const numEl = document.getElementById('lp-number');
    if (numEl) numEl.value = lp.session_number;

    const topicEl = document.getElementById('lp-topic');
    if (topicEl) topicEl.value = lp.topic || '';

    const goalInputEl = document.getElementById('lp-goal');
    if (goalInputEl) goalInputEl.value = lp.competency_goal || '';

    const methodEl = document.getElementById('lp-method');
    if (methodEl) methodEl.value = lp.learning_methods || '';

    const toolsEl = document.getElementById('lp-tools');
    if (toolsEl) toolsEl.value = lp.materials_tools || '';

    const indEl = document.getElementById('lp-indicator');
    if (indEl) indEl.value = lp.success_indicator || '';

    const dateEl = document.getElementById('lp-meeting-date');
    if (dateEl) dateEl.value = lp.meeting_date || '';

    const startEl = document.getElementById('lp-start-time');
    if (startEl) startEl.value = lp.start_time ? lp.start_time.substring(0,5) : '';

    const endEl = document.getElementById('lp-end-time');
    if (endEl) endEl.value = lp.end_time ? lp.end_time.substring(0,5) : '';

    const roomEl = document.getElementById('lp-room');
    if (roomEl) roomEl.value = lp.room_location || '';

    openModal('modal-lessonplan');
  } catch (err) {
    console.error("Error in openModalEditLessonPlan:", err);
    openModal('modal-lessonplan');
  }
};

window.deleteLessonPlanInline = async function(progId, lpId) {
  if (!confirm('Apakah Anda yakin ingin menghapus sesi pertemuan ini beserta jadwalnya?')) return;
  try {
    const res = await fetch(`/api/lesson-plans/${lpId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Sesi Lesson Plan berhasil dihapus.', 'success');
      await loadProgramsData();
      filterAndRenderPrograms();
    } else {
      const err = await res.json();
      showToast(err.error || 'Gagal menghapus sesi.', 'error');
    }
  } catch (e) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
};

window.handleLessonPlanSubmit = async function(event) {
  event.preventDefault();
  const progId = document.getElementById('lp-prog-id')?.value;
  const lpId = document.getElementById('lp-id')?.value;

  if (!progId) {
    showToast('Program tidak teridentifikasi.', 'error');
    return;
  }

  const payload = {
    session_number: parseInt(document.getElementById('lp-number').value),
    topic: document.getElementById('lp-topic').value,
    competency_goal: document.getElementById('lp-goal').value,
    learning_methods: document.getElementById('lp-method')?.value || '',
    materials_tools: document.getElementById('lp-tools')?.value || '',
    success_indicator: document.getElementById('lp-indicator').value,
    meeting_date: document.getElementById('lp-meeting-date')?.value || null,
    start_time: document.getElementById('lp-start-time')?.value || null,
    end_time: document.getElementById('lp-end-time')?.value || null,
    room_location: document.getElementById('lp-room')?.value || null
  };

  try {
    let res;
    if (lpId) {
      res = await fetch(`/api/programs/${progId}/lesson-plans/${lpId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`/api/programs/${progId}/lesson-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      showToast(lpId ? 'Sesi Lesson Plan & Jadwal berhasil diperbarui!' : 'Sesi Lesson Plan & Jadwal berhasil ditambahkan!', 'success');
      closeModal('modal-lessonplan');
      await loadProgramsData();
      filterAndRenderPrograms();
    } else {
      const data = await res.json();
      showToast(data.error || 'Gagal menyimpan sesi.', 'error');
    }
  } catch (err) {
    console.error('Error saving lesson plan:', err);
    showToast('Terjadi kesalahan koneksi server.', 'error');
  }
};
