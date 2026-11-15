const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');

const router = express.Router();

// Apni organization ke saare members
router.get('/team', (req, res) => {
  const rows = db
    .prepare('SELECT id, name, email, role FROM users WHERE org_id = ?')
    .all(req.user.org_id);
  res.json(rows);
});

// Sirf owner naya member add kar sakta hai
router.post('/team', (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only owners can add team members' });
  }

  const { name, email, password, role } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, email and a password of 6+ characters are required' });
  }
  if (!['manager', 'employee'].includes(role)) {
    return res.status(400).json({ error: 'Role must be manager or employee' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'This email is already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const r = db
    .prepare('INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.org_id, name, email, hash, role);

  res.status(201).json({ id: Number(r.lastInsertRowid), name, email, role });
});

module.exports = router;