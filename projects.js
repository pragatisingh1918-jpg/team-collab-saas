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

module.exports = router;