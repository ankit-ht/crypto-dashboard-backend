const express = require("express");
const router = express.Router();
const User = require("../models/user");

// GET /api/users - return all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
