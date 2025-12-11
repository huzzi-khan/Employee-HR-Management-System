// ============================================
// Attendance Routes - Full CRUD (FIXED)
// ============================================
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// READ - View All Attendances
router.get('/view', async (req, res) => {
    try {
        const sql = `
            SELECT a.AttendanceID, a.WorkDate, a.TimeIn, a.TimeOut,
                   e.FirstName, e.LastName, e.EmployeeID
            FROM Attendance a
            JOIN Employee e ON a.EmployeeID = e.EmployeeID
            ORDER BY a.WorkDate DESC, a.AttendanceID DESC
        `;
        const [attendances] = await db.execute(sql);
        res.render('view/attendances', {
            title: 'View Attendances',
            attendances,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('view/attendances', {
            title: 'View Attendances',
            attendances: [],
            success: null,
            error: 'Failed to load attendances'
        });
    }
});

// READ - View Single Attendance
router.get('/details/:id', async (req, res) => {
    try {
        const sql = `
            SELECT a.*, 
                   CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
                   e.FirstName, e.LastName, e.CNIC
            FROM Attendance a
            JOIN Employee e ON a.EmployeeID = e.EmployeeID
            WHERE a.AttendanceID = ?
        `;
        const [attendances] = await db.execute(sql, [req.params.id]);
        if (attendances.length === 0) {
            return res.redirect('/attendance/view?error=Attendance record not found');
        }
        res.render('view/attendanceDetails', {
            title: 'Attendance Details',
            attendance: attendances[0]
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/attendance/view?error=Failed to load attendance');
    }
});

// CREATE - Show Add Form
router.get('/add', async (req, res) => {
    try {
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee WHERE Status = "Active" ORDER BY FirstName');
        res.render('forms/attendance', { 
            title: 'Add Attendance',
            errors: null,
            success: null,
            formData: {},
            employees
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/attendance', {
            title: 'Add Attendance',
            errors: [{ msg: 'Failed to load form data' }],
            success: null,
            formData: {},
            employees: []
        });
    }
});

// CREATE - Insert Attendance
router.post('/add', [
    body('employeeId').notEmpty().withMessage('Employee is required').isInt(),
    body('workDate').notEmpty().withMessage('Work date is required').isDate(),
    body('timeIn').notEmpty().withMessage('Time in is required').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('TimeIn format HH:MM'),
    body('timeOut').optional({ checkFalsy: true }).matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('TimeOut format HH:MM')
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee WHERE Status = "Active"');
    if (!errors.isEmpty()) {
        return res.render('forms/attendance', {
            title: 'Add Attendance',
            errors: errors.array(),
            success: null,
            formData: req.body,
            employees
        });
    }

    const { employeeId, workDate, timeIn, timeOut } = req.body;

    try {
        const sql = 'INSERT INTO Attendance (EmployeeID, WorkDate, TimeIn, TimeOut) VALUES (?, ?, ?, ?)';
        await db.execute(sql, [employeeId, workDate, timeIn, timeOut || null]);
        res.redirect('/attendance/view?success=Attendance added successfully');
    } catch (error) {
        console.error('Error:', error);
        let errorMessage = 'Failed to add attendance. ';
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage += 'Attendance for this employee on this date already exists.';
        }
        res.render('forms/attendance', {
            title: 'Add Attendance',
            errors: [{ msg: errorMessage }],
            success: null,
            formData: req.body,
            employees
        });
    }
});

// UPDATE - Show Edit Form
router.get('/edit/:id', async (req, res) => {
    try {
        const [attendances] = await db.execute('SELECT * FROM Attendance WHERE AttendanceID = ?', [req.params.id]);
        if (attendances.length === 0) {
            return res.redirect('/attendance/view?error=Attendance not found');
        }
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee WHERE Status = "Active"');
        res.render('forms/attendanceEdit', {
            title: 'Edit Attendance',
            errors: null,
            formData: attendances[0],
            employees
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/attendance/view?error=Failed to load attendance');
    }
});

// UPDATE - Process Edit
router.post('/edit/:id', [
    body('employeeId').notEmpty().isInt(),
    body('workDate').notEmpty().isDate(),
    body('timeIn').notEmpty().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('timeOut').optional({ checkFalsy: true }).matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee');
    if (!errors.isEmpty()) {
        return res.render('forms/attendanceEdit', {
            title: 'Edit Attendance',
            errors: errors.array(),
            formData: { ...req.body, AttendanceID: req.params.id },
            employees
        });
    }

    const { employeeId, workDate, timeIn, timeOut } = req.body;

    try {
        const sql = 'UPDATE Attendance SET EmployeeID = ?, WorkDate = ?, TimeIn = ?, TimeOut = ? WHERE AttendanceID = ?';
        const [result] = await db.execute(sql, [employeeId, workDate, timeIn, timeOut || null, req.params.id]);

        if (result.affectedRows === 0) {
            return res.redirect('/attendance/view?error=Attendance not found');
        }

        res.redirect('/attendance/view?success=Attendance updated successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/attendanceEdit', {
            title: 'Edit Attendance',
            errors: [{ msg: 'Failed to update attendance' }],
            formData: { ...req.body, AttendanceID: req.params.id },
            employees
        });
    }
});

// DELETE - Confirm Delete
router.get('/delete/:id', async (req, res) => {
    try {
        const sql = `
            SELECT a.*, 
                   CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
                   e.FirstName, e.LastName
            FROM Attendance a
            JOIN Employee e ON a.EmployeeID = e.EmployeeID
            WHERE a.AttendanceID = ?
        `;
        const [attendances] = await db.execute(sql, [req.params.id]);
        if (attendances.length === 0) return res.redirect('/attendance/view?error=Attendance not found');
        res.render('view/attendanceDelete', {
            title: 'Delete Attendance',
            attendance: attendances[0]
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/attendance/view?error=Failed to load attendance');
    }
});

// DELETE - Process Delete
router.post('/delete/:id', async (req, res) => {
    try {
        const sql = 'DELETE FROM Attendance WHERE AttendanceID = ?';
        const [result] = await db.execute(sql, [req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/attendance/view?error=Attendance not found');
        res.redirect('/attendance/view?success=Attendance deleted successfully');
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/attendance/view?error=Failed to delete attendance');
    }
});

module.exports = router;