require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const path        = require('path');
const rateLimit   = require('express-rate-limit');

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded WebP images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many requests, try again later.' });
app.use('/api/auth', authLimiter);

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth',         require('./src/routes/auth'));
app.use('/api/universities', require('./src/routes/universities'));
app.use('/api/properties',   require('./src/routes/properties'));
app.use('/api/agents',       require('./src/routes/agents'));
app.use('/api/bookings',     require('./src/routes/bookings'));
app.use('/api/viewings',     require('./src/routes/viewings'));
app.use('/api/admin',        require('./src/routes/admin'));

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Geto Student API', time: new Date() }));

// ─── Serve React build in production ──────────────────────────
if (process.env.NODE_ENV === 'production') {
  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// ─── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Geto Student API running on port ${PORT}`));
