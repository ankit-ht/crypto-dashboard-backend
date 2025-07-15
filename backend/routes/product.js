const express = require('express');
const router = express.Router();

const products = [
  { id: 1, name: 'Shoes', price: 100 },
  { id: 2, name: 'T-Shirt', price: 50 },
];

router.get('/', (req, res) => {
  res.json(products);
});

module.exports = router;
