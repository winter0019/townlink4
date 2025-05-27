// server/db.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// Create a connection pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g. postgres://user:pass@host:port/db
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize tables (run once at server startup)
async function initializeDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        website TEXT,
        hours TEXT,
        image TEXT,
        latitude REAL,
        longitude REAL,
        rating REAL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        reviewer_name TEXT NOT NULL,
        text TEXT NOT NULL,
        rating INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ PostgreSQL tables checked/created.");
  } catch (err) {
    console.error("❌ Error initializing database:", err.message);
  }
}

// Immediately initialize tables when this module is loaded
initializeDb();

module.exports = pool;
