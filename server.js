const path = require('path');
const express = require('express');
const db = require('./db');
const { router: authRouter, requireAuth } = require('./auth');
const projectsRouter = require('./projects');
const teamRouter = require('./team');            // <- nayi line (team)

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', authRouter);

app.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

app.use('/api', requireAuth, projectsRouter);
app.use('/api', requireAuth, teamRouter);        // <- nayi line (team)

const server = app.listen(3000, () => {
  console.log('Server http://localhost:3000 pe chal raha hai');
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
});