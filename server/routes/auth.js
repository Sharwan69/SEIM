const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../config/logger');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

router.post('/register', async (req, res) => {
  const { username, email, password, role = 'analyst' } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, role });

    await user.save();

    logger.info(`User registered: ${username}`);
    return res.status(201).json({
      success: true,
      data: { id: user._id, username, email, role }
    });
  } catch (error) {
    logger.error(`Registration failed: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      logger.warn(`Failed login attempt: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      data: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    logger.error(`Login failed: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

router.get('/verify', verifyToken, (req, res) => {
  return res.json({ success: true, data: req.user });
});

module.exports = { router, verifyToken, requireAdmin };
