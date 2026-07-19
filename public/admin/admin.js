/* ═══════════════════════════════════════════════════════════════════════════
   Summer Shine 3.0 — Admin Dashboard JavaScript
   Handles: login/logout, session, registrations table, zone tabs,
            search/filter, stats, export, EDIT modal, DELETE confirm, toast
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── State ────────────────────────────────────────────────────────────────────
let currentAdmin     = null;
let currentZone      = 'All';
let searchDebounce   = null;
let allRegistrations = [];   // full list for quick id-lookup in modals
let pendingDeleteId  = null; // id awaiting delete confirm

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const loginScreen    = document.getElementById('login-screen');
const dashboardScreen= document.getElementById('dashboard-screen');
const loginForm      = document.getElementById('login-form');
const loginBtn       = document.getElementById('login-btn');
const loginError     = document.getElementById('login-error');
const logoutBtn      = document.getElementById('logout-btn');
const adminUsername  = document.getElementById('admin-username-display');
const adminRole      = document.getElementById('admin-role-display');
const statTotal      = document.getElementById('stat-total');
const statMuharraq   = document.getElementById('stat-muharraq');
const statManama     = document.getElementById('stat-manama');
const statRiffa      = document.getElementById('stat-riffa');
const zoneTabs       = document.getElementById('zone-tabs');
const regTbody       = document.getElementById('reg-tbody');
const searchInput    = document.getElementById('search-input');
const classFilter    = document.getElementById('class-filter');
const exportBtn      = document.getElementById('export-btn');
const hamburgerBtn   = document.getElementById('hamburger-btn');
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const muharraqCard   = document.getElementById('stat-muharraq-card');
const manamaCard     = document.getElementById('stat-manama-card');
const riffaCard      = document.getElementById('stat-riffa-card');
// Edit modal
const editModal      = document.getElementById('edit-modal');
const modalCloseBtn  = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSaveBtn   = document.getElementById('modal-save-btn');
const modalError     = document.getElementById('modal-error');
// Delete confirm
const confirmModal   = document.getElementById('confirm-modal');
const confirmDesc    = document.getElementById('confirm-desc');
const confirmCancel  = document.getElementById('confirm-cancel-btn');
const confirmDelete  = document.getElementById('confirm-delete-btn');
// Toast
const toast          = document.getElementById('toast');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const showLogin     = () => { loginScreen.style.display = 'flex'; dashboardScreen.style.display = 'none'; };
const showDashboard = () => { loginScreen.style.display = 'none'; dashboardScreen.style.display = 'block'; };

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function sanitize(str) {
  const d = document.createElement('div');
  d.textContent = String(str ?? '');
  return d.innerHTML;
}

function escapeAttr(str) {
  return String(str ?? '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

let toastTimer;
function showToast(msg, type = 'success') {
  toast.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 3200);
}

// ─── Session Check on Load ────────────────────────────────────────────────────
async function checkSession() {
  try {
    const res = await fetch('/api/admin/me');
    if (res.ok) {
      const data = await res.json();
      currentAdmin = data.admin;
      initDashboard();
    } else {
      showLogin();
    }
  } catch { showLogin(); }
}

// ─── Login ────────────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('show');
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    loginError.textContent = 'Please enter both username and password.';
    loginError.classList.add('show');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';

  try {
    const res  = await fetch('/api/admin/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      currentAdmin = data.admin;
      loginForm.reset();
      initDashboard();
    } else {
      loginError.textContent = data.error || 'Login failed.';
      loginError.classList.add('show');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In →';
    }
  } catch {
    loginError.textContent = 'Network error. Please try again.';
    loginError.classList.add('show');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In →';
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
logoutBtn.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method:'POST' });
  currentAdmin = null; allRegistrations = []; currentZone = 'All';
  loginBtn.disabled = false; loginBtn.textContent = 'Sign In →';
  showLogin();
});

// ─── Init Dashboard ───────────────────────────────────────────────────────────
function initDashboard() {
  showDashboard();
  adminUsername.textContent = currentAdmin.username;
  adminRole.textContent = currentAdmin.role === 'supreme'
    ? '⭐ Supreme Admin'
    : `📍 ${currentAdmin.zone} Zone Admin`;

  if (currentAdmin.role === 'supreme') {
    zoneTabs.style.display = 'flex';
    [muharraqCard, manamaCard, riffaCard].forEach(c => c.style.display = '');
  } else {
    zoneTabs.style.display = 'none';
    muharraqCard.style.display = currentAdmin.zone === 'Muharraq' ? '' : 'none';
    manamaCard.style.display   = currentAdmin.zone === 'Manama'   ? '' : 'none';
    riffaCard.style.display    = currentAdmin.zone === 'Riffa'    ? '' : 'none';
  }
  loadRegistrations();
}

// ─── Zone Tab Clicks ──────────────────────────────────────────────────────────
document.querySelectorAll('.zone-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.zone-tab').forEach(t => {
      t.classList.remove('active'); t.setAttribute('aria-selected','false');
    });
    tab.classList.add('active'); tab.setAttribute('aria-selected','true');
    currentZone = tab.dataset.zone;
    loadRegistrations();
  });
});

// ─── Search + Class Filter ────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadRegistrations, 350);
});
classFilter.addEventListener('change', loadRegistrations);

// ─── Load Registrations ───────────────────────────────────────────────────────
async function loadRegistrations() {
  regTbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:3rem;"><span class="spinner"></span></td></tr>`;

  const params = new URLSearchParams();
  if (currentAdmin.role === 'supreme' && currentZone !== 'All') params.set('zone', currentZone);
  const search = searchInput.value.trim();
  if (search) params.set('search', search);
  const cls = classFilter.value;
  if (cls !== 'All') params.set('classFilter', cls);

  try {
    const res = await fetch(`/api/admin/registrations?${params}`);
    if (!res.ok) { if (res.status === 401) { showLogin(); return; } throw new Error(); }
    const data = await res.json();
    allRegistrations = data.registrations;
    renderTable(allRegistrations, data.total);
    updateStats(allRegistrations);
  } catch {
    regTbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--coral);">Failed to load registrations. Please refresh.</td></tr>`;
  }
}

// ─── Render Table ─────────────────────────────────────────────────────────────
function renderTable(registrations, total) {
  statTotal.textContent = total ?? registrations.length;

  if (!registrations.length) {
    regTbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><span class="empty-icon">🔍</span><p>No registrations found for this filter.</p></div></td></tr>`;
    return;
  }

  regTbody.innerHTML = registrations.map((r, i) => {
    const activities = Array.isArray(r.activities) ? r.activities : [];
    const actHtml = activities.length
      ? `<div class="activities-pills">${activities.map(a => `<span class="act-pill">${sanitize(a)}</span>`).join('')}</div>`
      : `<span style="color:var(--text-light);font-size:.78rem;">None</span>`;

    return `
      <tr data-id="${r.id}">
        <td style="color:var(--text-light);font-size:.78rem;">${i + 1}</td>
        <td><strong>${sanitize(r.student_name)}</strong></td>
        <td>${sanitize(r.guardian_name)}</td>
        <td>${sanitize(r.contact_number)}</td>
        <td>${sanitize(r.class)}</td>
        <td>${r.age}</td>
        <td style="white-space:nowrap;">${sanitize(r.residing_area)}</td>
        <td><span class="zone-badge ${sanitize(r.zone)}">${sanitize(r.zone)}</span></td>
        <td>${actHtml}</td>
        <td style="white-space:nowrap;font-size:.78rem;color:var(--text-light);">${formatDate(r.submitted_at)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-edit"   onclick="openEditModal(${r.id})"   title="Edit registration">✏️ Edit</button>
            <button class="btn-delete" onclick="openDeleteConfirm(${r.id}, '${escapeAttr(r.student_name)}')" title="Delete registration">🗑 Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ─── Stats Update ─────────────────────────────────────────────────────────────
function updateStats(registrations) {
  if (currentAdmin.role === 'supreme') {
    statMuharraq.textContent = registrations.filter(r => r.zone === 'Muharraq').length;
    statManama.textContent   = registrations.filter(r => r.zone === 'Manama').length;
    statRiffa.textContent    = registrations.filter(r => r.zone === 'Riffa').length;
  } else {
    const zoneEl = { Muharraq: statMuharraq, Manama: statManama, Riffa: statRiffa }[currentAdmin.zone];
    if (zoneEl) zoneEl.textContent = registrations.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const ACTIVITY_VALUES = [
  'Outdoor Exploration & Nature Walks',
  'Physical Activities & Sports',
  'Creative & Artistic Expression',
  'STEM/STEAM Activities',
  'Problem Solving & Brain Games',
  'Social & Emotional Learning',
  'DIY Craft Workshops',
  'Technology & Media',
];

function openEditModal(id) {
  const reg = allRegistrations.find(r => r.id === id);
  if (!reg) return;

  // Populate fields
  document.getElementById('edit-id').value           = reg.id;
  document.getElementById('edit-student-name').value = reg.student_name;
  document.getElementById('edit-guardian-name').value= reg.guardian_name;
  document.getElementById('edit-contact').value      = reg.contact_number;
  document.getElementById('edit-age').value          = reg.age;
  document.getElementById('edit-class').value        = reg.class;
  document.getElementById('edit-area').value         = reg.residing_area;

  // Activities — decode HTML entities from checkbox values to compare
  const checkedActivities = Array.isArray(reg.activities) ? reg.activities : [];
  for (let i = 1; i <= 8; i++) {
    const cb = document.getElementById(`ma${i}`);
    if (cb) {
      // decode HTML entities in the checkbox value for comparison
      const decodedVal = cb.value.replace(/&amp;/g, '&');
      cb.checked = checkedActivities.includes(decodedVal);
    }
  }

  // Clear error
  modalError.textContent = '';
  modalError.classList.remove('show');
  modalSaveBtn.disabled = false;
  modalSaveBtn.textContent = 'Save Changes ✓';

  editModal.classList.add('open');
  document.getElementById('edit-student-name').focus();
}

function closeEditModal() {
  editModal.classList.remove('open');
}

modalCloseBtn.addEventListener('click',  closeEditModal);
modalCancelBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });

// Keyboard: Escape closes modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeEditModal();
    closeConfirm();
  }
});

// Save edited registration
modalSaveBtn.addEventListener('click', async () => {
  const id             = parseInt(document.getElementById('edit-id').value, 10);
  const student_name   = document.getElementById('edit-student-name').value.trim();
  const guardian_name  = document.getElementById('edit-guardian-name').value.trim();
  const contact_number = document.getElementById('edit-contact').value.trim();
  const age            = document.getElementById('edit-age').value;
  const studentClass   = document.getElementById('edit-class').value;
  const residing_area  = document.getElementById('edit-area').value;

  // Collect activities (decode HTML entities)
  const activities = [];
  for (let i = 1; i <= 8; i++) {
    const cb = document.getElementById(`ma${i}`);
    if (cb && cb.checked) {
      activities.push(cb.value.replace(/&amp;/g, '&'));
    }
  }

  // Basic client-side check
  if (!student_name || !guardian_name || !contact_number || !studentClass || !age || !residing_area) {
    modalError.textContent = 'Please fill in all required fields.';
    modalError.classList.add('show');
    return;
  }

  modalSaveBtn.disabled = true;
  modalSaveBtn.textContent = 'Saving…';
  modalError.classList.remove('show');

  try {
    const res = await fetch(`/api/admin/registrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_name, guardian_name, contact_number, class: studentClass, age: parseInt(age), residing_area, activities }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      // Update local array
      const idx = allRegistrations.findIndex(r => r.id === id);
      if (idx !== -1) allRegistrations[idx] = data.registration;

      // Update the table row in-place
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) {
        renderTable(allRegistrations, allRegistrations.length);
        updateStats(allRegistrations);
      }

      closeEditModal();
      showToast(`${student_name}'s registration updated!`, 'success');
    } else {
      const msg = data.errors
        ? Object.values(data.errors).join(' • ')
        : (data.error || 'Update failed.');
      modalError.textContent = msg;
      modalError.classList.add('show');
      modalSaveBtn.disabled = false;
      modalSaveBtn.textContent = 'Save Changes ✓';
    }
  } catch {
    modalError.textContent = 'Network error. Please try again.';
    modalError.classList.add('show');
    modalSaveBtn.disabled = false;
    modalSaveBtn.textContent = 'Save Changes ✓';
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE CONFIRM
// ═══════════════════════════════════════════════════════════════════════════════
function openDeleteConfirm(id, name) {
  pendingDeleteId = id;
  confirmDesc.textContent = `You're about to permanently delete ${name}'s registration. This cannot be undone.`;
  confirmDelete.disabled = false;
  confirmDelete.textContent = 'Yes, Delete';
  confirmModal.classList.add('open');
}

function closeConfirm() {
  confirmModal.classList.remove('open');
  pendingDeleteId = null;
}

confirmCancel.addEventListener('click',  closeConfirm);
confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) closeConfirm(); });

confirmDelete.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;

  confirmDelete.disabled = true;
  confirmDelete.textContent = 'Deleting…';

  try {
    const res = await fetch(`/api/admin/registrations/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok && data.success) {
      // Remove from local array and re-render
      allRegistrations = allRegistrations.filter(r => r.id !== id);
      renderTable(allRegistrations, allRegistrations.length);
      updateStats(allRegistrations);
      closeConfirm();
      showToast('Registration deleted.', 'success');
    } else {
      closeConfirm();
      showToast(data.error || 'Delete failed.', 'error');
    }
  } catch {
    closeConfirm();
    showToast('Network error. Please try again.', 'error');
  }
});

// ─── Export to Excel ──────────────────────────────────────────────────────────
exportBtn.addEventListener('click', () => {
  const params = new URLSearchParams();
  if (currentAdmin.role === 'supreme' && currentZone !== 'All') params.set('zone', currentZone);
  window.location.href = `/api/admin/export?${params}`;
});

// ─── Mobile Sidebar Toggle ────────────────────────────────────────────────────
hamburgerBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('show');
});
sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
checkSession();
