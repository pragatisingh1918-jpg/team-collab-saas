const db = require('./db');
const express = require('express');
const { router: authRouter, requireAuth } = require('./auth');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server chal raha hai' });
});

app.use('/', authRouter);

app.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

app.listen(3000, (err) => {
  if (err) {
    console.error('Server start nahi hua:', err.message);
    return;
  }
  console.log('Server http://localhost:3000 pe chal raha hai');
});