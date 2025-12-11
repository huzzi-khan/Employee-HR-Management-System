// ============================================
// Leave Request Routes - Full CRUD
// ============================================
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// READ - View All Leave Requests
router.get('/view', async (req, res) => {
    try {
        const sql = `
            SELECT l.LeaveID, l.EmployeeID, CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
                   l.LeaveType, l.StartDate, l.EndDate, l.Status
            FROM Leave_Request l
            JOIN Employee e ON l.EmployeeID = e.EmployeeID
            ORDER BY l.SubmittedDate DESC
        `;
        const [leaves] = await db.execute(sql);
        res.render('view/leaveRequests', {
            title: 'Leave Requests',
            leaves,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('view/leaveRequests', {
            title: 'Leave Requests',
            leaves: [],
            success: null,
            error: 'Failed to load leave requests'
        });
    }
});

// READ - Details
router.get('/details/:id', async (req, res) => {
    try {
        const sql = `
            SELECT l.*, CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName, r.FirstName AS ReviewerFirst, r.LastName AS ReviewerLast
            FROM Leave_Request l
            JOIN Employee e ON l.EmployeeID = e.EmployeeID
            LEFT JOIN Employee r ON l.ReviewedBy = r.EmployeeID
            WHERE l.LeaveID = ?
        `;
        const [leaves] = await db.execute(sql, [req.params.id]);
        if (leaves.length === 0) return res.redirect('/leaveRequest/view?error=Leave request not found');
        res.render('view/leaveRequestDetails', { title: 'Leave Request Details', leave: leaves[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/leaveRequest/view?error=Failed to load leave request');
    }
});

// CREATE - Show Add Form
router.get('/add', async (req, res) => {
    try {
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee WHERE Status = "Active" ORDER BY FirstName');
        res.render('forms/leaveRequest', {
            title: 'Add Leave Request',
            errors: null,
            success: null,
            formData: {},
            employees
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/leaveRequest', {
            title: 'Add Leave Request',
            errors: [{ msg: 'Failed to load form data' }],
            success: null,
            formData: {},
            employees: []
        });
    }
});

// CREATE - Insert Leave Request
router.post('/add', [
    body('employeeId').notEmpty().isInt(),
    body('leaveType').notEmpty().isIn(['Sick', 'Annual', 'Casual', 'Unpaid', 'Emergency']),
    body('startDate').notEmpty().isDate(),
    body('endDate').notEmpty().isDate().custom((endDate, { req }) => new Date(endDate) >= new Date(req.body.startDate)).withMessage('End date must be on/after start date'),
    body('reason').notEmpty().isLength({ max: 2000 })
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee WHERE Status = "Active" ORDER BY FirstName');
    if (!errors.isEmpty()) {
        return res.render('forms/leaveRequest', {
            title: 'Add Leave Request',
            errors: errors.array(),
            success: null,
            formData: req.body,
            employees
        });
    }
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;
    try {
        const sql = 'INSERT INTO Leave_Request (EmployeeID, LeaveType, StartDate, EndDate, Reason, Status, SubmittedDate) VALUES (?, ?, ?, ?, ?, "Pending", CURDATE())';
        await db.execute(sql, [employeeId, leaveType, startDate, endDate, reason]);
        res.redirect('/leaveRequest/view?success=Leave request submitted successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/leaveRequest', {
            title: 'Add Leave Request',
            errors: [{ msg: 'Failed to submit leave request' }],
            success: null,
            formData: req.body,
            employees
        });
    }
});

// UPDATE - Show Edit Form
router.get('/edit/:id', async (req, res) => {
    try {
        const [leaves] = await db.execute('SELECT * FROM Leave_Request WHERE LeaveID = ?', [req.params.id]);
        if (leaves.length === 0) return res.redirect('/leaveRequest/view?error=Leave request not found');
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
        res.render('forms/leaveRequestEdit', {
            title: 'Edit Leave Request',
            errors: null,
            formData: leaves[0],
            employees
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/leaveRequest/view?error=Failed to load leave request');
    }
});

// UPDATE - Process Edit
router.post('/edit/:id', [
    body('employeeId').notEmpty().isInt(),
    body('leaveType').notEmpty().isIn(['Sick', 'Annual', 'Casual', 'Unpaid', 'Emergency']),
    body('startDate').notEmpty().isDate(),
    body('endDate').notEmpty().isDate().custom((endDate, { req }) => new Date(endDate) >= new Date(req.body.startDate)).withMessage('End date must be on/after start date'),
    body('reason').notEmpty().isLength({ max: 2000 }),
    body('status').optional({ checkFalsy: true }).isIn(['Pending', 'Approved', 'Rejected'])
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
    if (!errors.isEmpty()) {
        return res.render('forms/leaveRequestEdit', {
            title: 'Edit Leave Request',
            errors: errors.array(),
            formData: { ...req.body, LeaveID: req.params.id },
            employees
        });
    }
    const { employeeId, leaveType, startDate, endDate, reason, status, reviewedBy } = req.body;
    try {
        const sql = 'UPDATE Leave_Request SET EmployeeID = ?, LeaveType = ?, StartDate = ?, EndDate = ?, Reason = ?, Status = ?, ReviewedBy = ?, ReviewDate = CASE WHEN ? IS NOT NULL THEN CURDATE() ELSE ReviewDate END WHERE LeaveID = ?';
        const rb = reviewedBy || null;
        const [result] = await db.execute(sql, [employeeId, leaveType, startDate, endDate, reason, status || 'Pending', rb, rb, req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/leaveRequest/view?error=Leave request not found');
        res.redirect('/leaveRequest/view?success=Leave request updated successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/leaveRequestEdit', {
            title: 'Edit Leave Request',
            errors: [{ msg: 'Failed to update leave request' }],
            formData: { ...req.body, LeaveID: req.params.id },
            employees
        });
    }
});

// DELETE - Confirm Delete
router.get('/delete/:id', async (req, res) => {
    try {
        const sql = `
            SELECT l.*, CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName
            FROM Leave_Request l
            JOIN Employee e ON l.EmployeeID = e.EmployeeID
            WHERE l.LeaveID = ?
        `;
        const [leaves] = await db.execute(sql, [req.params.id]);
        if (leaves.length === 0) return res.redirect('/leaveRequest/view?error=Leave request not found');
        res.render('view/leaveRequestDelete', { title: 'Delete Leave Request', leave: leaves[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/leaveRequest/view?error=Failed to load leave request');
    }
});

// DELETE - Process Delete
router.post('/delete/:id', async (req, res) => {
    try {
        const sql = 'DELETE FROM Leave_Request WHERE LeaveID = ?';
        const [result] = await db.execute(sql, [req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/leaveRequest/view?error=Leave request not found');
        res.redirect('/leaveRequest/view?success=Leave request deleted successfully');
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/leaveRequest/view?error=Failed to delete leave request');
    }
});

module.exports = router;
