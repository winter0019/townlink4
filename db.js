// server/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path to your SQLite database file
const DB_PATH = path.resolve(__dirname, 'townlink.sqlite');

// Connect to the SQLite database
// If the file does not exist, it will be created.
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', DB_PATH);
        // Initialize tables after successful connection
        initializeDb();
    }
});

// Function to initialize tables
function initializeDb() {
    // Users table (even if not used for auth, if your previous server had it, you might keep it for now)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Businesses table
    db.run(`CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Reviews table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL,
        reviewer_name TEXT NOT NULL,
        text TEXT NOT NULL,
        rating INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )`);

    console.log('SQLite tables checked/created.');
}

module.exports = db;