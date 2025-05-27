// server/migrate.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path to your SQLite database file
const DB_PATH = path.resolve(__dirname, 'townlink.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to database for migration:', err.message);
        return;
    }
    console.log('Connected to SQLite database for migration.');
    runMigration();
});

function runMigration() {
    // SQL to add the 'approved' column IF IT DOES NOT ALREADY EXIST
    // The IF NOT EXISTS clause is crucial to prevent errors if you run this multiple times
    const alterTableSql = `
        ALTER TABLE businesses
        ADD COLUMN approved BOOLEAN DEFAULT 0;
    `;

    db.run(alterTableSql, function(err) {
        if (err) {
            // Check if the error is specifically because the column already exists
            if (err.message.includes('duplicate column name')) {
                console.log('Column "approved" already exists in "businesses" table. No migration needed.');
            } else {
                console.error('Error running migration (adding approved column):', err.message);
            }
        } else {
            console.log('Migration successful: Added "approved" column to "businesses" table.');
        }

        // Now, we need to ensure all existing businesses have 'approved' set to 0 (pending)
        // if they were added before this column existed.
        const updateExistingSql = `
            UPDATE businesses
            SET approved = 0
            WHERE approved IS NULL;
        `;
        db.run(updateExistingSql, function(updateErr) {
            if (updateErr) {
                console.error('Error updating existing businesses after migration:', updateErr.message);
            } else {
                console.log(`Updated ${this.changes} existing businesses to 'pending' (approved = 0).`);
            }
            db.close((closeErr) => {
                if (closeErr) {
                    console.error('Error closing database after migration:', closeErr.message);
                } else {
                    console.log('Database connection closed.');
                }
            });
        });
    });
}