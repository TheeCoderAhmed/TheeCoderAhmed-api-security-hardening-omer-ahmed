const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All notes routes require authentication
router.use(authenticateToken);

// GET /notes — get all notes belonging to the logged-in user
router.get('/', (req, res) => {
  const notes = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ notes });
});

// POST /notes — create a new note
router.post('/', (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  const stmt = db.prepare('INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)');
  const result = stmt.run(title, content, req.user.id);

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Note created', note });
});

// GET /notes/user/:userId — get all notes for a specific user
// NOTE: this route must be defined BEFORE /notes/:id to avoid route conflict
// Fix F1 (IDOR): regular users may only access their own notes; admins can access any
router.get('/user/:userId', (req, res) => {
  const targetUserId = parseInt(req.params.userId, 10);

  if (isNaN(targetUserId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Authorization check: own resource OR admin
  if (req.user.id !== targetUserId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: you may only access your own notes' });
  }

  const notes = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC').all(targetUserId);
  res.json({ notes });
});

// GET /notes/:id — get a specific note (must belong to logged-in user)
router.get('/:id', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  res.json({ note });
});

// PUT /notes/:id — update a note (must belong to logged-in user)
router.put('/:id', (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  db.prepare('UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
    .run(title, content, req.params.id, req.user.id);

  const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  res.json({ message: 'Note updated', note: updated });
});

// DELETE /notes/:id — delete a note (must belong to logged-in user)
router.delete('/:id', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Note deleted' });
});

module.exports = router;
