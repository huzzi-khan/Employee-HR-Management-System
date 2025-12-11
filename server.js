// ============================================
// HR Management System - Main Server File
// Team: 23i-2000, 23i-6123, 21i-2772
// ============================================

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Import database connection
const db = require('./config/db');

// Import routes
const jobPositionRoutes = require('./routes/jobPosition');
const departmentRoutes = require('./routes/department');
const employeeRoutes = require('./routes/employee');
const attendanceRoutes = require('./routes/attendance');
const leaveRequestRoutes = require('./routes/leaveRequest');
const payrollRoutes = require('./routes/payroll');
const trainingRoutes = require('./routes/training');
const evaluationRoutes = require('./routes/evaluation');
const employeeTrainingRoutes = require('./routes/employeeTraining');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'HR Management System' });
});

app.use('/job-position', jobPositionRoutes);
app.use('/department', departmentRoutes);
app.use('/employee', employeeRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/leave-request', leaveRequestRoutes);
app.use('/payroll', payrollRoutes);
app.use('/training', trainingRoutes);
app.use('/evaluation', evaluationRoutes);
app.use('/employee-training', employeeTrainingRoutes);

// 404 Error Handler
app.use((req, res) => {
    res.status(404).render('error', { 
        title: '404 - Not Found',
        message: 'Page not found',
        error: { status: 404 }
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).render('error', {
        title: 'Error',
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 HR Management System - Data Insertion Module`);
    console.log(`👥 Team: 23i-2000, 23i-6123, 21i-2772`);
});