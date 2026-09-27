const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const user = new User({
      username,
      email,
      password,
      role: role || 'analyst'
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'change_this_to_a_long_secure_secret',
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Register failed: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValid = await user.comparePassword(password);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'change_this_to_a_long_secure_secret',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Login failed: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

module.exports = router;
