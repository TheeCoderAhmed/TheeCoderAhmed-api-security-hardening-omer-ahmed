const API = '';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let currentNoteId = null;

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showMsg(id, text, isError) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'msg ' + (isError ? 'msg-error' : 'msg-ok');
}

function fmt(dateStr) {
  return new Date(dateStr).toLocaleString();
}

function showTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  try {
    const data = await api('POST', '/auth/login', { username, password });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    enterApp();
  } catch (err) {
    showMsg('login-msg', err.message, true);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  try {
    await api('POST', '/auth/register', { username, email, password });
    showMsg('reg-msg', 'Account created! You can now log in.', false);
    setTimeout(() => showTab('login'), 1200);
  } catch (err) {
    showMsg('reg-msg', err.message, true);
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display = 'none';
}

function enterApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  document.getElementById('topbar-username').textContent = currentUser.username;
  const roleEl = document.getElementById('topbar-role');
  roleEl.textContent = currentUser.role;
  roleEl.className = 'role-badge' + (currentUser.role === 'admin' ? ' admin' : '');
  if (currentUser.role === 'admin') {
    document.getElementById('admin-btn-wrap').classList.remove('hidden');
  }
  loadNotes();
}

if (token && currentUser) { enterApp(); }

async function loadNotes() {
  try {
    const data = await api('GET', '/notes');
    renderNotesList(data.notes);
  } catch (err) {
    if (err.message.includes('expired') || err.message.includes('Invalid')) logout();
  }
}

function renderNotesList(notes) {
  const list = document.getElementById('notes-list');
  if (!notes || notes.length === 0) {
    list.innerHTML = '<div class="empty-state">no notes yet</div>';
    return;
  }
  list.innerHTML = notes.map(n => `
    <div class="note-item ${n.id === currentNoteId ? 'active' : ''}" onclick="openNote(${n.id})">
      <div class="note-item-title">${escapeHtml(n.title)}</div>
      <div class="note-item-date">${fmt(n.updated_at)}</div>
    </div>
  `).join('');
}

async function openNote(id) {
  try {
    const data = await api('GET', `/notes/${id}`);
    currentNoteId = id;
    showNoteView(data.note);
    await loadNotes();
  } catch (err) {
    alert('Could not load note: ' + err.message);
  }
}

function showNoteView(note) {
  hideAllPanels();
  document.getElementById('note-view').classList.add('visible');
  document.getElementById('note-display').style.display = 'block';
  document.getElementById('edit-form').classList.remove('visible');
  document.getElementById('view-title').textContent = note.title;
  document.getElementById('view-content').textContent = note.content;
  document.getElementById('view-meta').textContent =
    `Created: ${fmt(note.created_at)}   ·   Updated: ${fmt(note.updated_at)}`;
  document.getElementById('edit-title').value = note.title;
  document.getElementById('edit-content').value = note.content;
}

function enterEditMode() {
  document.getElementById('note-display').style.display = 'none';
  document.getElementById('edit-form').classList.add('visible');
}

function exitEditMode() {
  document.getElementById('note-display').style.display = 'block';
  document.getElementById('edit-form').classList.remove('visible');
}

async function handleUpdateNote(e) {
  e.preventDefault();
  const title = document.getElementById('edit-title').value;
  const content = document.getElementById('edit-content').value;
  try {
    const data = await api('PUT', `/notes/${currentNoteId}`, { title, content });
    showNoteView(data.note);
    await loadNotes();
  } catch (err) {
    showMsg('edit-msg', err.message, true);
  }
}

async function handleDeleteNote() {
  if (!confirm('Delete this note?')) return;
  try {
    await api('DELETE', `/notes/${currentNoteId}`);
    currentNoteId = null;
    showWelcome();
    await loadNotes();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

function showNewNote() {
  hideAllPanels();
  document.getElementById('new-note-panel').classList.add('visible');
  document.getElementById('new-title').value = '';
  document.getElementById('new-content').value = '';
  document.getElementById('new-note-msg').textContent = '';
}

async function handleCreateNote(e) {
  e.preventDefault();
  const title = document.getElementById('new-title').value;
  const content = document.getElementById('new-content').value;
  try {
    const data = await api('POST', '/notes', { title, content });
    currentNoteId = data.note.id;
    await loadNotes();
    showNoteView(data.note);
  } catch (err) {
    showMsg('new-note-msg', err.message, true);
  }
}

async function showAdminPanel() {
  hideAllPanels();
  document.getElementById('admin-panel').classList.add('visible');
  try {
    const data = await api('GET', '/admin/users');
    const container = document.getElementById('admin-users-list');
    if (!data.users || data.users.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">No users found.</p>';
      return;
    }
    container.innerHTML = data.users.map(u => `
      <div class="admin-user-card">
        <div class="admin-user-header">
          <div>
            <div class="admin-user-name">${escapeHtml(u.username)} <span class="role-badge ${u.role === 'admin' ? 'admin' : ''}">${u.role}</span></div>
            <div class="admin-user-email">${escapeHtml(u.email)}</div>
          </div>
          ${u.id !== currentUser.id ? `<button class="btn btn-danger" onclick="adminDeleteUser(${u.id})">Delete</button>` : '<span style="font-size:0.75rem;color:var(--text-muted)">(you)</span>'}
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:0.72rem;color:var(--text-muted);margin-bottom:0.4rem">
          ${u.notes.length} note(s) · joined ${fmt(u.created_at)}
        </div>
        <div class="admin-note-list">
          ${u.notes.map(n => `<div class="admin-note-entry">📝 ${escapeHtml(n.title)}</div>`).join('') || '<div class="admin-note-entry">no notes</div>'}
        </div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('admin-users-list').innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
  }
}

async function adminDeleteUser(userId) {
  if (!confirm('Delete this user and all their notes?')) return;
  try {
    await api('DELETE', `/admin/users/${userId}`);
    showAdminPanel();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

function showWelcome() {
  hideAllPanels();
  document.getElementById('welcome-msg').style.display = 'block';
}

function hideAllPanels() {
  document.getElementById('welcome-msg').style.display = 'none';
  document.getElementById('new-note-panel').classList.remove('visible');
  document.getElementById('note-view').classList.remove('visible');
  document.getElementById('admin-panel').classList.remove('visible');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}
