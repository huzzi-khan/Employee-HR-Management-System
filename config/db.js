// ============================================
// Database Connection Configuration
// Team: 23i-2000, 23i-6123, 21i-2772
// ============================================

const mysql = require('mysql2');
require('dotenv').config();

// CHANGE: Make sure your .env file has correct database credentials
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',  // CHANGE: Add your MySQL password
    database: process.env.DB_NAME || 'HR_Management_DB',  // CHANGE: Add your database name
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('CHANGE: Please update your .env file with correct database credentials');
        process.exit(1);
    }
    console.log('✅ Database connected successfully!');
    connection.release();
});

// Export promise-based pool for async/await usage
module.exports = pool.promise();