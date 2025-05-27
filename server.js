// server.js

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL || !ADMIN_KEY) {
  console.error('❌ Missing DATABASE_URL or ADMIN_KEY in environment variables.');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static('public'));

// PostgreSQL connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Compatible with Render, Railway, etc.
});

// Utility: Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const key = req.header('x-admin-key');
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized: Invalid admin key' });
  }
  next();
};

// Suggestion: Add schema validation using Joi or Zod for production-grade reliability

// POST: Add a business (public)
app.post('/api/businesses', async (req, res) => {
  const {
    name, description, location, phone, email,
    website, hours, image, latitude, longitude, category,
  } = req.body;

  if (!name || !description || !location || !category) {
    return res.status(400).json({ error: 'Missing required fields: name, description, location, or category.' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO businesses (
        name, description, location, phone, email, website,
        hours, image, latitude, longitude, category, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
      RETURNING *`,
      [name, description, location, phone || '', email || '', website || '', hours || '', image || '', latitude || null, longitude || null, category]
    );
    res.status(201).json({ message: '✅ Business submitted for approval.', business: rows[0] });
  } catch (err) {
    console.error('❌ Failed to add business:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET: All approved businesses (public)
app.get('/api/businesses', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM businesses WHERE status = 'approved'");
    res.json(rows);
  } catch (err) {
    console.error('❌ Failed to fetch approved businesses:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Admin routes
const adminPrefix = '/admin';

// GET: Pending businesses
app.get(`${adminPrefix}/pending-businesses`, authenticateAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM businesses WHERE status = 'pending'");
    res.json(rows);
  } catch (err) {
    console.error('❌ Failed to fetch pending businesses:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST: Approve business by ID
app.post(`${adminPrefix}/approve/:id`, authenticateAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { rowCount, rows } = await pool.query(
      'UPDATE businesses SET status = $1 WHERE id = $2 RETURNING *',
      ['approved', id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Business not found.' });
    res.json({ message: '✅ Business approved.', business: rows[0] });
  } catch (err) {
    console.error('❌ Failed to approve business:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE: Delete business by ID
app.delete(`${adminPrefix}/delete/:id`, authenticateAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { rowCount, rows } = await pool.query('DELETE FROM businesses WHERE id = $1 RETURNING *', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Business not found.' });
    res.json({ message: '🗑️ Business deleted.', business: rows[0] });
  } catch (err) {
    console.error('❌ Failed to delete business:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Fallback route
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Uncaught error:', err.stack);
  res.status(500).json({ error: 'Unexpected server error.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
