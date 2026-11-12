const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server chal raha hai' });
});

app.listen(3000, () => {
  console.log('Server http://localhost:3000 pe chal raha hai');
});