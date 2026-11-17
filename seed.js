const bcrypt = require('bcryptjs');
const db = require('./db');

// Dobara chalane pe duplicate na bane
if (db.prepare('SELECT id FROM users WHERE email = ?').get('owner@acme.com')) {
  console.log('Demo data already exists. Nothing to do.');
  process.exit(0);
}

const hash = bcrypt.hashSync('demo123', 10);
const DAY = 86400000;
const when = days => new Date(Date.now() + days * DAY).toISOString(); // negative = past

const seed = db.transaction(() => {
  const addOrg = name =>
    Number(db.prepare('INSERT INTO organizations (name) VALUES (?)').run(name).lastInsertRowid);

  const addUser = (org, name, email, role) =>
    Number(db.prepare('INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run(org, name, email, hash, role).lastInsertRowid);

  const addProject = (org, name, by) =>
    Number(db.prepare('INSERT INTO projects (org_id, name, created_by) VALUES (?, ?, ?)')
      .run(org, name, by).lastInsertRowid);

  const addTask = (org, project, title, status, priority, assignee, due, by) =>
    db.prepare(`INSERT INTO tasks
      (org_id, project_id, title, status, priority, assignee_id, due_date, completed_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(org, project, title, status, priority, assignee, due,
           status === 'done' ? when(-1) : null, by);

  // ---------- Acme Corp ----------
  const acme = addOrg('Acme Corp');
  const aOwner = addUser(acme, 'Alice Owner', 'owner@acme.com', 'owner');
  const aMgr = addUser(acme, 'Mark Manager', 'manager@acme.com', 'manager');
  const aEmp = addUser(acme, 'Emma Employee', 'employee@acme.com', 'employee');

  const web = addProject(acme, 'Website Redesign', aOwner);
  addTask(acme, web, 'Design the landing page', 'done', 'high', aEmp, when(-3), aMgr);
  addTask(acme, web, 'Build the pricing section', 'in_progress', 'medium', aEmp, when(2), aMgr);
  addTask(acme, web, 'Fix the mobile navigation bug', 'todo', 'high', aEmp, when(-2), aMgr);   // overdue
  addTask(acme, web, 'Write launch announcement', 'todo', 'low', aMgr, when(5), aOwner);
  addTask(acme, web, 'Set up analytics', 'done', 'medium', aMgr, when(-5), aOwner);

  const app = addProject(acme, 'Mobile App Launch', aOwner);
  addTask(acme, app, 'Prepare App Store listing', 'in_progress', 'high', aMgr, when(3), aOwner);
  addTask(acme, app, 'Run beta testing', 'todo', 'medium', aEmp, when(7), aMgr);
  addTask(acme, app, 'Collect crash reports', 'todo', 'low', null, null, aMgr);

  // ---------- Beta Industries ----------
  const beta = addOrg('Beta Industries');
  const bOwner = addUser(beta, 'Bob Owner', 'owner@beta.com', 'owner');
  const bEmp = addUser(beta, 'Bella Employee', 'employee@beta.com', 'employee');

  const mk = addProject(beta, 'Q4 Marketing Campaign', bOwner);
  addTask(beta, mk, 'Plan the social media calendar', 'in_progress', 'high', bEmp, when(1), bOwner);
  addTask(beta, mk, 'Design ad creatives', 'todo', 'medium', bEmp, when(4), bOwner);
  addTask(beta, mk, 'Finalize the campaign budget', 'done', 'high', bOwner, when(-2), bOwner);
});

seed();
console.log('Demo data created. Password for every demo user: demo123');