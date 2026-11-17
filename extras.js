// Extra features: assignees, due dates, Team page, role-based UI
let team = [];

function me() {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
  catch { return {}; }
}

const st = document.createElement('style');
st.textContent = `
  .is-employee #newProject,.is-employee #firstProject,.is-employee #taskForm{display:none!important}
  .addbar{grid-template-columns:1fr 150px 170px 160px auto}
  @media(max-width:1000px){.addbar{grid-template-columns:1fr}}
  .stack{display:flex;flex-direction:column;gap:10px}
`;
document.head.appendChild(st);

async function loadTeam() { team = await api('/api/team'); }

function setupUI() {
  document.body.classList.toggle('is-employee', me().role === 'employee');

  // assignee + due date fields (sirf ek baar banenge)
  if (!$('taskAssignee')) {
    const sel = document.createElement('select'); sel.id = 'taskAssignee';
    const due = document.createElement('input'); due.id = 'taskDue'; due.type = 'date'; due.title = 'Due date';
    $('taskPriority').after(sel, due);
  }
  const sel = $('taskAssignee');
  sel.innerHTML = '<option value="">Unassigned</option>';
  team.forEach(m => {
    const o = document.createElement('option');
    o.value = m.id; o.textContent = m.name; sel.appendChild(o);
  });
}

// task banate time assignee + due date bhi bhejo
$('taskForm').onsubmit = async e => {
  e.preventDefault();
  if (!projectId) return;
  try {
    const body = { title: $('taskTitle').value.trim(), priority: $('taskPriority').value };
    if ($('taskAssignee').value) body.assignee_id = Number($('taskAssignee').value);
    if ($('taskDue').value) body.due_date = new Date($('taskDue').value + 'T23:59:59').toISOString();
    await api('/api/projects/' + projectId + '/tasks', 'POST', body);
    $('taskTitle').value = ''; $('taskDue').value = '';
    toast('Task added');
    await refresh();
  } catch (err) { toast(err.message, 'error'); }
};

// card pe assignee aur due date dikhao
const _card = card;
card = function (t) {
  const el = _card(t);
  const bits = [];
  const who = team.find(m => m.id === t.assignee_id);
  if (who) bits.push('👤 ' + who.name);
  if (t.due_date) bits.push('📅 ' + new Date(t.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }));
  if (bits.length) {
    const d = document.createElement('div');
    d.className = 'date';
    d.textContent = bits.join('  ·  ');
    if (t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()) {
      d.style.color = 'var(--red)'; d.textContent += '  ·  overdue';
    }
    el.appendChild(d);
  }
  return el;
};

// ---------- Team page ----------
const navT = document.createElement('button');
navT.id = 'navTeam';
navT.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7M17 4a4 4 0 0 1 0 8M22 21c0-3-2-5.5-5-6.5"/></svg> Team';
$('navInsights').after(navT);

const tv = document.createElement('div');
tv.id = 'viewTeam'; tv.className = 'insights hidden';
$('viewInsights').after(tv);

const _setView = setView;
setView = function (v) {
  $('viewTeam').classList.toggle('hidden', v !== 'team');
  $('navTeam').classList.toggle('active', v === 'team');
  if (v === 'team') {
    view = 'team';
    $('viewBoard').classList.add('hidden');
    $('viewInsights').classList.add('hidden');
    $('searchBox').classList.add('hidden');
    $('navBoard').classList.remove('active');
    $('navInsights').classList.remove('active');
    $('pTitle').textContent = 'Team';
    $('pSub').textContent = 'People in your organization and their roles.';
    renderTeam();
  } else { _setView(v); }
};
navT.onclick = () => setView('team');

function renderTeam() {
  const box = $('viewTeam');
  box.innerHTML = '';

  const list = document.createElement('div');
  list.className = 'ins glass';
  list.innerHTML = '<h3>Members</h3><div class="sub">' + team.length + ' people in your organization</div>';
  team.forEach(m => {
    const r = document.createElement('div');
    r.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--line)';
    const a = document.createElement('div'); a.className = 'avatar'; a.textContent = m.name.charAt(0).toUpperCase();
    const n = document.createElement('div'); n.style.flex = '1';
    const nm = document.createElement('b'); nm.textContent = m.name;
    const em = document.createElement('div'); em.className = 'muted'; em.style.fontSize = '12.5px'; em.textContent = m.email;
    n.append(nm, em);
    const b = document.createElement('span');
    b.className = 'badge ' + (m.role === 'owner' ? 'high' : m.role === 'manager' ? 'medium' : 'low');
    b.textContent = m.role;
    r.append(a, n, b);
    list.appendChild(r);
  });
  box.appendChild(list);

  if (me().role !== 'owner') return;   // add-member form sirf owner ko dikhta hai

  const f = document.createElement('div');
  f.className = 'ins glass stack';
  f.innerHTML = '<h3>Add a member</h3><div class="sub" style="margin-bottom:6px">Owners can invite managers and employees.</div>' +
    '<input id="tmName" placeholder="Full name"><input id="tmEmail" type="email" placeholder="Email">' +
    '<input id="tmPass" type="password" placeholder="Temporary password (min 6)">' +
    '<select id="tmRole"><option value="employee">Employee</option><option value="manager">Manager</option></select>' +
    '<button class="btn" id="tmAdd">Add member</button>';
  box.appendChild(f);

  $('tmAdd').onclick = async () => {
    try {
      await api('/api/team', 'POST', {
        name: $('tmName').value.trim(), email: $('tmEmail').value.trim(),
        password: $('tmPass').value, role: $('tmRole').value
      });
      toast('Member added');
      await loadTeam(); setupUI(); renderTeam();
    } catch (e) { toast(e.message, 'error'); }
  };
}

// login ke baad team load ho aur UI set ho
const _start = start;
start = async function () {
  try { await loadTeam(); setupUI(); } catch {}
  return _start();
};

// page reload par (token pehle se ho)
if (token) loadTeam().then(() => { setupUI(); renderBoard(); }).catch(() => {});