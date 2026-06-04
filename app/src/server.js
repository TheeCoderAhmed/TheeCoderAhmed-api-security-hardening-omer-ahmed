const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers — explicit CSP with no wildcards (fixes F8)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'"],
      fontSrc:    ["'self'"],
      imgSrc:     ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"],
      baseUri:    ["'self'"],
      formAction: ["'self'"]
    }
  }
}));

// Restrict CORS to explicit allowed origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Global rate limit — 100 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/auth', require('./routes/auth'));
app.use('/notes', require('./routes/notes'));
app.use('/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback: serve frontend for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Notes API server running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  POST   /auth/register`);
  console.log(`  POST   /auth/login`);
  console.log(`  GET    /notes`);
  console.log(`  POST   /notes`);
  console.log(`  GET    /notes/:id`);
  console.log(`  PUT    /notes/:id`);
  console.log(`  DELETE /notes/:id`);
  console.log(`  GET    /notes/user/:userId`);
  console.log(`  GET    /admin/users`);
  console.log(`  GET    /admin/users/:id`);
  console.log(`  DELETE /admin/users/:id`);
});

module.exports = app;
