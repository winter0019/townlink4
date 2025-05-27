const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_KEY = 'supersecretadminkey'; // replace with env var in production

let businesses = [];
let nextId = 1;

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());

// Serve static assets (JS, CSS, images, HTML files)
app.use(express.static(__dirname));

// Serve all HTML pages by their route (without .html in URL)
const htmlPages = [
  'index',
  'admin',
  'add-business',
  'business-detail',
  'login',
  'register'
];

htmlPages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `${page}.html`));
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== API ROUTES ==========

// POST /api/businesses
app.post('/api/businesses', (req, res) => {
  const {
    name, description, location, phone, email,
    website, hours, image, latitude, longitude, category
  } = req.body;

  if (!name || !description || !location || !category) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const newBusiness = {
    id: nextId++,
    name,
    description,
    location,
    phone: phone || '',
    email: email || '',
    website: website || '',
    hours: hours || '',
    image: image || '',
    latitude: latitude || null,
    longitude: longitude || null,
    category,
    status: 'pending'
  };

  businesses.push(newBusiness);
  res.status(201).json(newBusiness);
});

// GET /api/businesses (approved only)
app.get('/api/businesses', (req, res) => {
  const approved = businesses.filter(b => b.status === 'approved');
  res.json(approved);
});

// GET /admin/pending-businesses
app.get('/admin/pending-businesses', (req, res) => {
  const key = req.header('x-admin-key');
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const pending = businesses.filter(b => b.status === 'pending');
  res.json(pending);
});

// POST /admin/approve/:id
app.post('/admin/approve/:id', (req, res) => {
  const key = req.header('x-admin-key');
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const id = parseInt(req.params.id);
  const business = businesses.find(b => b.id === id);
  if (business) {
    business.status = 'approved';
    res.json({ message: 'Business approved.' });
  } else {
    res.status(404).json({ error: 'Business not found.' });
  }
});

// DELETE /admin/delete/:id
app.delete('/admin/delete/:id', (req, res) => {
  const key = req.header('x-admin-key');
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const id = parseInt(req.params.id);
  const index = businesses.findIndex(b => b.id === id);
  if (index !== -1) {
    businesses.splice(index, 1);
    res.json({ message: 'Business deleted.' });
  } else {
    res.status(404).json({ error: 'Business not found.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
