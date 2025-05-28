// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Import Pool for PostgreSQL
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000;

// --- Database Connection (PostgreSQL) ---
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL not found in environment variables. Please set it.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Render Postgres public URL. Adjust for production if using private network.
    }
});

pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL database!');
        client.release(); // Release the client immediately after connection test
    })
    .catch(err => {
        console.error('Error connecting to PostgreSQL database:', err.message);
        process.exit(1);
    });

// --- CORS Configuration ---
const allowedOriginsString = process.env.ALLOWED_ORIGINS || 'http://localhost:5173'; // Default for development
const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim());

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.warn(msg); // Log blocked origins for debugging
            return callback(new Error(msg), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow OPTIONS for preflight
    allowedHeaders: ['Content-Type', 'x-admin-key'], // Explicitly allow custom headers
    credentials: true // If you handle cookies or session IDs
}));

app.use(express.json());
app.use(express.static('public'));

// --- Admin Key (use environment variable) ---
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
    console.error('ADMIN_KEY not found in environment variables. Please set it.');
    process.exit(1);
}

// --- Routes ---

// Helper function for database queries
async function query(text, params) {
    const client = await pool.connect();
    try {
        const res = await client.query(text, params);
        return res;
    } finally {
        client.release();
    }
}

// Add a business
app.post('/api/businesses', async (req, res) => {
    const { name, description, location, phone, email, website, hours, image, latitude, longitude, category } = req.body;
    if (!name || !description || !location || !category) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        const result = await query(
            `INSERT INTO businesses (name, description, location, phone, email, website, hours, image, latitude, longitude, category, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`, // Return the inserted row
            [name, description, location, phone || '', email || '', website || '', hours || '', image || '', latitude, longitude, category, 'pending']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding business:', error);
        res.status(500).json({ error: 'Failed to add business', details: error.message });
    }
});

// Get approved businesses
app.get('/api/businesses', async (req, res) => {
    try {
        const result = await query(`SELECT * FROM businesses WHERE status = 'approved'`);
        res.json(result.rows);
    } catch (error) {
        console.error('Error retrieving approved businesses:', error);
        res.status(500).json({ error: 'Failed to retrieve businesses', details: error.message });
    }
});

// Admin: Get pending businesses
app.get('/admin/pending-businesses', async (req, res) => {
    const key = req.header('x-admin-key');
    if (key !== ADMIN_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const result = await query(`SELECT * FROM businesses WHERE status = 'pending'`);
        res.json(result.rows);
    } catch (error) {
        console.error('Error retrieving pending businesses:', error);
        res.status(500).json({ error: 'Failed to retrieve pending businesses', details: error.message });
    }
});

// Admin: Approve a business
app.post('/admin/approve/:id', async (req, res) => {
    const key = req.header('x-admin-key');
    if (key !== ADMIN_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params; // ID from URL parameter
    try {
        const result = await query(
            `UPDATE businesses SET status = 'approved' WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length > 0) {
            res.json({ message: 'Business approved.', business: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Business not found.' });
        }
    } catch (error) {
        console.error('Error approving business:', error);
        res.status(500).json({ error: 'Failed to approve business', details: error.message });
    }
});

// Admin: Delete a business
app.delete('/admin/delete/:id', async (req, res) => {
    const key = req.header('x-admin-key');
    if (key !== ADMIN_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params; // ID from URL parameter
    try {
        const result = await query(
            `DELETE FROM businesses WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length > 0) {
            res.json({ message: 'Business deleted.' });
        } else {
            res.status(404).json({ error: 'Business not found.' });
        }
    } catch (error) {
        console.error('Error deleting business:', error);
        res.status(500).json({ error: 'Failed to delete business', details: error.message });
    }
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
