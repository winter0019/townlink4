const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const ADMIN_KEY = process.env.ADMIN_KEY || 'supersecretadminkey';

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/your_database_name',
});

// Add a business
app.post('/api/businesses', async (req, res) => {
  const {
    name,
    description,
    location,
    phone,
    email,
    website,
    hours,
    image,
    latitude,
    longitude,
    category
  } = req.body;

  if (!name || !description || !location || !category) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO businesses (
         name, description, location, phone, email, website,
         hours, image, latitude, longitude, category, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
       RETURNING *`,
      [
        name,
        description,
        location,
        phone || '',
        email || '',
        website || '',
        hours || '',
        image || '',
        latitude || null,
        longitude || null,
        category,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting business:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get approved businesses
app.get('/api/businesses', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM businesses WHERE status = 'approved'");
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching approved businesses:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Admin: Get pending businesses
app.get('/admin/pending-businesses', async (req, res) => {
  const key = req.header('x-admin-key');
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const result = await pool.query("SELECT * FROM businesses WHERE status = 'pending'");
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pending businesses:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Admin: Approve a business
app.post('/admin/approve/:id', async (req, res) => {
  const key = req.header('x-admin-key');
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const id = parseInt(req.params.id);
  try {
    const result = await pool.query(
      'UPDATE businesses SET status = $1 WHERE id = $2 RETURNING *',
      ['approved', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    res.json({ message: 'Business approved.' });
  } catch (err) {
    console.error('Error approving business:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Admin: Delete a business
app.delete('/admin/delete/:id', async (req, res) => {
  const key = req.header('x-admin-key');
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('DELETE FROM businesses WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    res.json({ message: 'Business deleted.' });
  } catch (err) {
    console.error('Error deleting business:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
