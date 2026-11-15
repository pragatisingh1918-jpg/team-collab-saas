const express = require('express');
const db = require('./db');

const router = express.Router();
const VALID_STATUS = ['todo', 'in_progress', 'done'];
const VALID_PRIORITY = ['low', 'medium', 'high'];

// Sirf allowed roles aage jaayenge, baaki ko 403
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' });
    }
    next();
  };
}

function findProject(projectId, orgId) {
  return db.prepare('SELECT * FROM projects WHERE id = ? AND org_id = ?').get(projectId, orgId);
}

function logActivity(orgId, taskId, userId, action) {
  db.prepare('INSERT INTO activity_events (org_id, task_id, user_id, action) VALUES (?, ?, ?, ?)')
    .run(orgId, taskId, userId, action);
}

// ---------- PROJECTS ----------
router.post('/projects', requireRole('owner', 'manager'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const r = db
    .prepare('INSERT INTO projects (org_id, name, created_by) VALUES (?, ?, ?)')
    .run(req.user.org_id, name, req.user.id);

  res.status(201).json({ id: Number(r.lastInsertRowid), name });
});

router.get('/projects', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects WHERE org_id = ?').all(req.user.org_id);
  res.json(rows);
});

// ---------- TASKS ----------
router.post('/projects/:projectId/tasks', requireRole('owner', 'manager'), (req, res) => {
  const project = findProject(req.params.projectId, req.user.org_id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { title, priority, assignee_id, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required' });
  if (priority && !VALID_PRIORITY.includes(priority)) {
    return res.status(400).json({ error: 'Priority must be low, medium or high' });
  }

  // jise assign kar rahe ho wo isi organization ka hona chahiye
  if (assignee_id) {
    const member = db
      .prepare('SELECT id FROM users WHERE id = ? AND org_id = ?')
      .get(assignee_id, req.user.org_id);
    if (!member) return res.status(400).json({ error: 'Assignee is not in your organization' });
  }

  const r = db
    .prepare(
      `INSERT INTO tasks (org_id, project_id, title, priority, assignee_id, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.org_id, project.id, title, priority || 'medium',
      assignee_id || null, due_date || null, req.user.id
    );

  const taskId = Number(r.lastInsertRowid);
  logActivity(req.user.org_id, taskId, req.user.id, 'task created');

  if (assignee_id) {
    db.prepare('INSERT INTO notifications (org_id, user_id, task_id, message) VALUES (?, ?, ?, ?)')
      .run(req.user.org_id, assignee_id, taskId, 'You were assigned a new task: ' + title);
  }

  res.status(201).json({ id: taskId, title });
});

router.get('/projects/:projectId/tasks', (req, res) => {
  const project = findProject(req.params.projectId, req.user.org_id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // employee ko sirf apne tasks dikhenge
  const rows =
    req.user.role === 'employee'
      ? db.prepare('SELECT * FROM tasks WHERE project_id = ? AND org_id = ? AND assignee_id = ?')
          .all(project.id, req.user.org_id, req.user.id)
      : db.prepare('SELECT * FROM tasks WHERE project_id = ? AND org_id = ?')
          .all(project.id, req.user.org_id);

  res.json(rows);
});

router.patch('/tasks/:id/status', (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: 'Status must be todo, in_progress or done' });
  }

  const task = db
    .prepare('SELECT * FROM tasks WHERE id = ? AND org_id = ?')
    .get(req.params.id, req.user.org_id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // employee sirf apna task badal sakta hai
  if (req.user.role === 'employee' && task.assignee_id !== req.user.id) {
    return res.status(403).json({ error: 'This task is not assigned to you' });
  }

  const completedAt = status === 'done' ? new Date().toISOString() : null;
  db.prepare('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?')
    .run(status, completedAt, task.id);

  logActivity(req.user.org_id, task.id, req.user.id, 'status changed to ' + status);
  res.json({ id: task.id, status });
});

// ---------- STATS ----------
router.get('/stats', (req, res) => {
  const orgId = req.user.org_id;
  // employee ko sirf apne tasks ke numbers dikhenge
  const scope = req.user.role === 'employee' ? ' AND assignee_id = ' + Number(req.user.id) : '';
  const count = (sql, ...args) => db.prepare(sql).get(...args).n;

  const total = count('SELECT COUNT(*) AS n FROM tasks WHERE org_id = ?' + scope, orgId);
  const done = count("SELECT COUNT(*) AS n FROM tasks WHERE org_id = ? AND status = 'done'" + scope, orgId);
  const overdue = count(
    "SELECT COUNT(*) AS n FROM tasks WHERE org_id = ? AND status != 'done' AND due_date IS NOT NULL AND due_date < ?" + scope,
    orgId,
    new Date().toISOString()
  );

  res.json({
    total,
    done,
    overdue,
    completion_percent: total === 0 ? 0 : Math.round((done / total) * 100),
  });
});

module.exports = router;