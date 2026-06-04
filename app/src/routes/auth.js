const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Login: 10 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Register: 5 attempts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' }
});

// POST /auth/register
router.post('/register', registerLimiter, (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password are required' });
  }

  // Strengthened password policy: min 8 chars, at least 1 letter + 1 digit
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one letter and one digit' });
  }

  // Check if user already exists
  // Use generic message to prevent user enumeration
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    // Normalize timing: hash a dummy value so response time does not reveal existence
    bcrypt.hashSync('__dummy_timing_normalization__', 10);
    return res.status(409).json({ error: 'Registration failed. Please try different credentials.' });
  }

  // Hash password with bcrypt
  const hashedPassword = bcrypt.hashSync(password, 10);

  // Insert new user (role defaults to 'user')
  const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
  const result = stmt.run(username, email, hashedPassword);

  res.status(201).json({
    message: 'User registered successfully',
    userId: result.lastInsertRowid
  });
});

// POST /auth/login
router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  // Fetch user by username
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Compare password
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Issue JWT
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

module.exports = router;
