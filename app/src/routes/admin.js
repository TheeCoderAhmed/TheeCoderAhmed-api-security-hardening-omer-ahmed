const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /admin/users — list all users with their notes (admin only)
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC').all();

  const usersWithNotes = users.map(user => {
    const notes = db.prepare('SELECT id, title, created_at, updated_at FROM notes WHERE user_id = ?').all(user.id);
    return { ...user, notes };
  });

  res.json({ users: usersWithNotes });
});

// GET /admin/users/:id — get a specific user's full profile and notes (admin only)
router.get('/users/:id', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const notes = db.prepare('SELECT * FROM notes WHERE user_id = ?').all(user.id);
  res.json({ user: { ...user, notes } });
});

// DELETE /admin/users/:id — delete a user (admin only)
router.delete('/users/:id', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;
