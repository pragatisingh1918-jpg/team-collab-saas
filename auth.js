const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Naya organization + uska owner banata hai
router.post('/signup', (req, res) => {
  const { orgName, name, email, password } = req.body;

  if (!orgName || !name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Saari fields chahiye, password kam se kam 6 character ka' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Ye email pehle se registered hai' });
  }

  const hash = bcrypt.hashSync(password, 10);

  // transaction: dono insert saath me hon, ya dono na hon
  const create = db.transaction(() => {
    const org = db.prepare('INSERT INTO organizations (name) VALUES (?)').run(orgName);
    const user = db
      .prepare('INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run(org.lastInsertRowid, name, email, hash, 'owner');
    return { orgId: Number(org.lastInsertRowid), userId: Number(user.lastInsertRowid) };
  });

  const result = create();
  res.status(201).json({ message: 'Signup ho gaya', ...result });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Email ya password galat hai' });
  }

  const token = jwt.sign(
    { id: user.id, org_id: user.org_id, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token });
});

// Middleware: har protected route se pehle chalta hai
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Login karo' });
  }
}

module.exports = { router, requireAuth };