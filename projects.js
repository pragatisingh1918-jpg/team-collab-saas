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

module.exports = router;