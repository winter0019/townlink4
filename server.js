const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Load PORT from environment or use 3000
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = 'supersecretadminkey';

app.use(cors());
app.use(express.json());

// ✅ Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Set Content Security Policy to allow self-hosted resources
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self'; script-src 'self'; style-src 'self';");
  next();
});

// ✅ Favicon route (optional but avoids browser warning)
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// In-memory data store
let businesses = [];
let nextId = 1;

// ✅ API: Add a business
app.post('/api/businesses', (req, res) => {
  const { name, description, location, phone, email, website, hours, image, latitude, longitude, category } = req.body;

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

// ✅ API: Get only approved businesses
app.get('/api/businesses', (req, res) => {
  const approvedBusinesses = businesses.filter(b => b.status === 'approved');
  res.json(approvedBusinesses);
});

// ✅ Admin: View pending businesses
app.get('/admin/pending-businesses', (req, res) => {
  const key = req.header('x-admin-key');
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const pending = businesses.filter(b => b.status === 'pending');
  res.json(pending);
});

// ✅ Admin: Approve a business
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

// ✅ Admin: Delete a business
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

// ✅ Fallback route for '/'
app.get('/', (req, res) => {
  res.send('Welcome to the TownLink API Server!');
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
