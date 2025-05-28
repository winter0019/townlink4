const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // PostgreSQL client
require('dotenv').config({ path: '../.env' }); // Load environment variables from .env in the project root
const path = require('path'); // Node.js module for path manipulation

const app = express();

// --- Configuration from Environment Variables ---
// PORT: Provided by the hosting platform (e.g., Render), defaults to 3000 for local development.
const PORT = process.env.PORT || 3000;

// ADMIN_KEY: Your secret key for admin access, should be set as an environment variable on your hosting platform.
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
    console.error('ERROR: ADMIN_KEY environment variable not found. Please set it for production and in your .env file for local development.');
    // In a production environment, you might want to stop the application from starting without a key.
    // process.exit(1); 
}

// DATABASE_URL: The connection string for your PostgreSQL database.
// This will be provided by your database hosting service (e.g., Render Postgres).
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable not found. Please set it.');
    process.exit(1); // Exit if no database connection string is provided.
}

// ALLOWED_ORIGINS: A comma-separated list of URLs allowed to access your API.
// IMPORTANT: Replace defaults with your actual deployed frontend URL(s) in production.
const allowedOriginsString = process.env.ALLOWED_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000';
const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim());

// --- Database Connection (PostgreSQL) ---
const pool = new Pool({
    connectionString: DATABASE_URL,
    // SSL configuration for production:
    // This is often required when connecting to a cloud-hosted PostgreSQL database (like Render Postgres)
    // from a Node.js app also hosted in the cloud. 'rejectUnauthorized: false' handles self-signed certs.
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection on startup
pool.connect()
    .then(client => {
        console.log('Successfully connected to PostgreSQL database!');
        client.release(); // Release the client immediately after the test
    })
    .catch(err => {
        console.error('ERROR: Failed to connect to PostgreSQL database:', err.message);
        console.error('Please check your DATABASE_URL environment variable.');
        process.exit(1); // Exit the process if database connection fails, as the app won't function
    });

// --- Middleware ---
app.use(express.json()); // Middleware to parse JSON request bodies

// CORS Configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g., from Postman, curl, or same-origin requests)
        // Or if the origin is explicitly in our allowed list.
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true); // Allow the request
        } else {
            const msg = `CORS policy blocked access from origin: ${origin}. Not in allowed list.`;
            console.warn(msg); // Log for debugging blocked requests
            callback(new Error(msg), false); // Reject the request
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow common HTTP methods
    allowedHeaders: ['Content-Type', 'X-Admin-Key'], // Explicitly allow 'Content-Type' and our custom 'X-Admin-Key' header
    credentials: true // Allow cookies/authorization headers if needed (not strictly used for key-based auth here, but good practice)
}));

// --- Static File Serving (Crucial for Deployment Strategy) ---
// If you are deploying your frontend (the 'public' folder)
// as a separate Static Site (e.g., on Render Static Sites, Netlify, Vercel),
// then you should **REMOVE OR COMMENT OUT THE FOLLOWING LINE**.
// Your backend API server should only handle API requests in that scenario.
//
// If your backend is intended to serve the frontend as well:
// Ensure the path is correct. Assuming 'server.js' is in 'your_project_root/server/'
// and 'public' folder is in 'your_project_root/public/'.
// app.use(express.static(path.join(__dirname, '..', 'public')));


// --- Admin Key Authentication Middleware ---
// This middleware protects routes by checking for the 'X-Admin-Key' header.
function requireAdminKey(req, res, next) {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== ADMIN_KEY) {
        // Log unauthorized attempts for security monitoring
        console.warn(`Unauthorized access attempt from origin: ${req.headers.origin || 'unknown'} - Invalid Admin Key`);
        return res.status(403).json({ message: 'Forbidden: Invalid or missing Admin Key.' });
    }
    next(); // Key is valid, proceed to the next middleware/route handler
}

// --- Helper function for PostgreSQL queries ---
async function query(text, params) {
    const client = await pool.connect(); // Acquire a client from the pool
    try {
        const res = await client.query(text, params); // Execute the query
        return res;
    } finally {
        client.release(); // ALWAYS release the client back to the pool
    }
}

// --- API Routes ---

// GET all businesses (Public view: only 'approved'; Admin view: all with 'X-Admin-Key')
app.get('/api/businesses', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    
    let sqlQuery = `
        SELECT
            b.*,
            COALESCE(AVG(r.rating), 0) AS average_rating -- Calculate average rating, default to 0 if no reviews
        FROM businesses b
        LEFT JOIN reviews r ON b.id = r.business_id
        WHERE b.status = $1
        GROUP BY b.id
        ORDER BY b.id DESC`;
    let params = ['approved'];

    // If admin key is provided and valid, return all businesses regardless of status
    if (adminKey === ADMIN_KEY) {
        sqlQuery = `
            SELECT
                b.*,
                COALESCE(AVG(r.rating), 0) AS average_rating
            FROM businesses b
            LEFT JOIN reviews r ON b.id = r.business_id
            GROUP BY b.id
            ORDER BY b.id DESC`;
        params = [];
    }

    try {
        const result = await query(sqlQuery, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error retrieving businesses:', error);
        res.status(500).json({ error: 'Failed to retrieve businesses', details: error.message });
    }
});

// GET a single business by ID
app.get('/api/businesses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query(
            `SELECT 
                b.*, 
                COALESCE(AVG(r.rating), 0) AS average_rating 
            FROM businesses b
            LEFT JOIN reviews r ON b.id = r.business_id
            WHERE b.id = $1
            GROUP BY b.id`, 
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Business not found.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error retrieving business with ID ${id}:`, error);
        res.status(500).json({ error: 'Failed to retrieve business', details: error.message });
    }
});

// POST a new business (initially with 'pending' status)
app.post('/api/businesses', async (req, res) => {
    const { name, category, location, description, phone, email, website, hours, image, latitude, longitude } = req.body;

    // Basic validation for required fields
    if (!name || !category || !location) {
        return res.status(400).json({ message: 'Name, category, and location are required fields.' });
    }

    try {
        const result = await query(
            `INSERT INTO businesses (name, category, location, description, phone, email, website, hours, image, latitude, longitude, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`, // Returns the newly inserted row data
            [name, category, location, 
             description || null, // Use null for optional fields if not provided
             phone || null, 
             email || null, 
             website || null, 
             hours || null, 
             image || null, 
             latitude || null, 
             longitude || null, 
             'pending'] // New businesses are always 'pending'
        );
        res.status(201).json(result.rows[0]); // Respond with the created business data
    } catch (error) {
        console.error('Error adding business:', error);
        res.status(500).json({ error: 'Failed to add business', details: error.message });
    }
});

// PUT (Update) an existing business by ID (Admin only)
app.put('/api/businesses/:id', requireAdminKey, async (req, res) => {
    const { id } = req.params;
    const { name, category, location, description, phone, email, website, hours, image } = req.body;

    // Basic validation for required fields
    if (!name || !category || !location) {
        return res.status(400).json({ message: 'Name, category, and location are required fields for update.' });
    }

    try {
        const result = await query(
            `UPDATE businesses SET
             name = $1, category = $2, location = $3, description = $4,
             phone = $5, email = $6, website = $7, hours = $8, image = $9
             WHERE id = $10
             RETURNING *`, // Returns the updated row data
            [name, category, location, 
             description || null, phone || null, email || null, 
             website || null, hours || null, image || null, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Business not found or no changes made.' });
        }
        res.json({ message: 'Business updated successfully.', business: result.rows[0] });
    } catch (error) {
        console.error(`Error updating business with ID ${id}:`, error);
        res.status(500).json({ error: 'Failed to update business', details: error.message });
    }
});

// PUT (Approve) a business by ID (Admin only)
app.put('/api/businesses/:id/approve', requireAdminKey, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query(
            `UPDATE businesses SET status = 'approved' WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Business not found or already approved.' });
        }
        res.json({ message: 'Business approved successfully.', business: result.rows[0] });
    } catch (error) {
        console.error(`Error approving business with ID ${id}:`, error);
        res.status(500).json({ error: 'Failed to approve business', details: error.message });
    }
});

// PUT (Set to Pending/Reject) a business by ID (Admin only)
app.put('/api/businesses/:id/reject', requireAdminKey, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query(
            `UPDATE businesses SET status = 'pending' WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Business not found or already pending.' });
        }
        res.json({ message: 'Business status set to pending successfully.', business: result.rows[0] });
    } catch (error) {
        console.error(`Error setting business with ID ${id} to pending:`, error);
        res.status(500).json({ error: 'Failed to set business to pending', details: error.message });
    }
});

// DELETE a business by ID (Admin only)
app.delete('/api/businesses/:id', requireAdminKey, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query(`DELETE FROM businesses WHERE id = $1 RETURNING id`);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Business not found.' });
        }
        res.json({ message: 'Business deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting business with ID ${id}:`, error);
        res.status(500).json({ error: 'Failed to delete business', details: error.message });
    }
});

// --- New API Routes for Reviews ---

// POST a new review for a business
app.post('/api/reviews', async (req, res) => {
    const { business_id, reviewer_name, review_text, rating } = req.body;

    if (!business_id || !reviewer_name || !review_text || !rating) {
        return res.status(400).json({ message: 'Business ID, reviewer name, review text, and rating are required.' });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    try {
        // First, check if the business exists
        const businessCheck = await query('SELECT id FROM businesses WHERE id = $1', [business_id]);
        if (businessCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Business not found.' });
        }

        const result = await query(
            `INSERT INTO reviews (business_id, reviewer_name, review_text, rating)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [business_id, reviewer_name, review_text, rating]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ error: 'Failed to submit review', details: error.message });
    }
});

// GET all reviews for a specific business
app.get('/api/businesses/:id/reviews', async (req, res) => {
    const { id } = req.params; // Business ID
    try {
        const result = await query(
            `SELECT * FROM reviews WHERE business_id = $1 ORDER BY review_date DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(`Error fetching reviews for business ID ${id}:`, error);
        res.status(500).json({ error: 'Failed to fetch reviews', details: error.message });
    }
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Node.js environment: ${process.env.NODE_ENV || 'development'}`);
});
