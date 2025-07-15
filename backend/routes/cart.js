const express = require('express');
const redisClient = require('../utils/redis');
const router = express.Router();

// Add to cart
router.post('/add', async (req, res) => {
  const { userId, product } = req.body;
  await redisClient.set(`cart:${userId}`, JSON.stringify(product));
  res.json({ message: 'Added to cart' });
});

module.exports = router;
