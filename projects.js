const express = require('express');
const db = require('./db');

const router = express.Router();

router.post('/projects', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Project ka naam chahiye' });

  const result = db
    .prepare('INSERT INTO projects (org_id, name, created_by) VALUES (?, ?, ?)')
    .run(req.user.org_id, name, req.user.id);

  res.status(201).json({ id: Number(result.lastInsertRowid), name });
});

router.get('/projects', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects WHERE org_id = ?').all(req.user.org_id);
  res.json(rows);
});
// Project ke andar naya task banata hai
router.post('/projects/:projectId/tasks', (req, res) => {
  // pehle check: ye project meri hi company ka hai?
  const project = db
    .prepare('SELECT id FROM projects WHERE id = ? AND org_id = ?')
    .get(req.params.projectId, req.user.org_id);
  if (!project) return res.status(404).json({ error: 'Project nahi mila' });

  const { title, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'Task ka title chahiye' });

  const result = db
    .prepare('INSERT INTO tasks (org_id, project_id, title, priority, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.org_id, project.id, title, priority || 'medium', req.user.id);

  res.status(201).json({ id: Number(result.lastInsertRowid), title });
});

// Project ke saare tasks dikhata hai
router.get('/projects/:projectId/tasks', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM tasks WHERE project_id = ? AND org_id = ?')
    .all(req.params.projectId, req.user.org_id);
  res.json(rows);
});

// Task ka status badalta hai (todo / in_progress / done)
router.patch('/tasks/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['todo', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Status todo, in_progress ya done hona chahiye' });
  }

  // task meri hi company ka hona chahiye
  const task = db
    .prepare('SELECT id FROM tasks WHERE id = ? AND org_id = ?')
    .get(req.params.id, req.user.org_id);
  if (!task) return res.status(404).json({ error: 'Task nahi mila' });

  const completedAt = status === 'done' ? new Date().toISOString() : null;
  db.prepare('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?')
    .run(status, completedAt, task.id);

  res.json({ id: task.id, status });
});

// Dashboard ke numbers
router.get('/stats', (req, res) => {
  const orgId = req.user.org_id;
  const count = (sql, ...args) => db.prepare(sql).get(...args).n;

  const total = count('SELECT COUNT(*) AS n FROM tasks WHERE org_id = ?', orgId);
  const done = count("SELECT COUNT(*) AS n FROM tasks WHERE org_id = ? AND status = 'done'", orgId);
  const overdue = count(
    "SELECT COUNT(*) AS n FROM tasks WHERE org_id = ? AND status != 'done' AND due_date IS NOT NULL AND due_date < ?",
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