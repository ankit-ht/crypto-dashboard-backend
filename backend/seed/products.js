// backend/seed/products.js
const mongoose = require("mongoose");
const Product = require("../models/product");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce";

const products = [
  { id: 1, name: "Shoes", price: 100 },
  { id: 2, name: "T-Shirt", price: 50 },
  { id: 3, name: "Watch", price: 150 },
];

mongoose.connect(MONGO_URI)
  .then(async () => {
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log("Sample products seeded.");
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Seed error:", err);
    process.exit(1);
  });
