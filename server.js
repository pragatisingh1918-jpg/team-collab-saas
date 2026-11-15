const db = require('./db');
const express = require('express');
const { router: authRouter, requireAuth } = require('./auth');
const projectsRouter = require('./projects');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server chal raha hai' });
});

app.use('/', authRouter);

app.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

app.use('/api', requireAuth, projectsRouter);

const server = app.listen(3000, () => {
  console.log('Server http://localhost:3000 pe chal raha hai');
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
});

process.on('exit', (code) => {
  console.log('Node process band ho raha hai, code:', code);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught error:', err);
});