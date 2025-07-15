require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./utils/mongo');
const redisClient = require('./utils/redis');
const userRoutes = require('./routes/user');
const productRoutes = require('./routes/product');
const cartRoutes = require('./routes/cart');

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
connectDB();

// Redis connection
redisClient.connect().catch(console.error);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);

module.exports = app;
