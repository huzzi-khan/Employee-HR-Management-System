// ============================================
// Employee Routes - Full CRUD
// ============================================
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// READ - View All Employees
router.get('/view', async (req, res) => {
    try {
        const sql = `
            SELECT e.EmployeeID, e.FirstName, e.LastName, e.CNIC, e.Email, e.PhoneNumber,
                   e.Status, j.JobTitle, d.DeptName
            FROM Employee e
            LEFT JOIN Job_Position j ON e.JobID = j.JobID
            LEFT JOIN Department d ON e.DeptID = d.DeptID
            ORDER BY e.LastName, e.FirstName
        `;
        const [employees] = await db.execute(sql);
        res.render('view/employees', {
            title: 'Employees',
            employees,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('view/employees', {
            title: 'Employees',
            employees: [],
            success: null,
            error: 'Failed to load employees'
        });
    }
});

// READ - Details
router.get('/details/:id', async (req, res) => {
    try {
        const sql = `
            SELECT e.*, j.JobTitle, d.DeptName
            FROM Employee e
            LEFT JOIN Job_Position j ON e.JobID = j.JobID
            LEFT JOIN Department d ON e.DeptID = d.DeptID
            WHERE e.EmployeeID = ?
        `;
        const [employees] = await db.execute(sql, [req.params.id]);
        if (employees.length === 0) return res.redirect('/employee/view?error=Employee not found');
        res.render('view/employeeDetails', { title: 'Employee Details', employee: employees[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/employee/view?error=Failed to load employee');
    }
});

// CREATE - Show Add Form
router.get('/add', async (req, res) => {
    try {
        const [jobs] = await db.execute('SELECT JobID, JobTitle FROM Job_Position ORDER BY JobTitle');
        const [depts] = await db.execute('SELECT DeptID, DeptName FROM Department ORDER BY DeptName');
        res.render('forms/employee', {
            title: 'Add Employee',
            errors: null,
            success: null,
            formData: {},
            jobs,
            departments: depts
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/employee', {
            title: 'Add Employee',
            errors: [{ msg: 'Failed to load form data' }],
            success: null,
            formData: {},
            jobs: [],
            departments: []
        });
    }
});

// validation helpers for CNIC and email per schema
const cnicRegex = /^[0-9]{5}-[0-9]{7}-[0-9]$/;

// CREATE - Insert Employee
router.post('/add', [
    body('firstName').notEmpty().withMessage('First name required').isLength({ max: 50 }),
    body('lastName').notEmpty().withMessage('Last name required').isLength({ max: 50 }),
    body('cnic').notEmpty().withMessage('CNIC required').matches(cnicRegex).withMessage('CNIC format invalid: 12345-1234567-1'),
    body('dateOfBirth').notEmpty().isDate().withMessage('Invalid date of birth'),
    body('email').notEmpty().isEmail().withMessage('Invalid email').isLength({ max: 100 }),
    body('phoneNumber').notEmpty().isLength({ max: 15 }),
    body('address').notEmpty(),
    body('joinDate').optional({ checkFalsy: true }).isDate(),
    body('status').optional({ checkFalsy: true }).isIn(['Active', 'Inactive', 'On Leave', 'Terminated']),
    body('jobId').notEmpty().isInt().withMessage('Job position is required'),
    body('deptId').notEmpty().isInt().withMessage('Department is required')
], async (req, res) => {
    const errors = validationResult(req);
    const [jobs] = await db.execute('SELECT JobID, JobTitle FROM Job_Position ORDER BY JobTitle');
    const [depts] = await db.execute('SELECT DeptID, DeptName FROM Department ORDER BY DeptName');
    if (!errors.isEmpty()) {
        return res.render('forms/employee', {
            title: 'Add Employee',
            errors: errors.array(),
            success: null,
            formData: req.body,
            jobs,
            departments: depts
        });
    }
    const {
        firstName, lastName, cnic, dateOfBirth, email,
        phoneNumber, address, joinDate, status, jobId, deptId
    } = req.body;
    try {
        const sql = `
            INSERT INTO Employee
            (FirstName, LastName, CNIC, DateOfBirth, Email, PhoneNumber, Address, JoinDate, Status, JobID, DeptID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await db.execute(sql, [
            firstName, lastName, cnic, dateOfBirth, email,
            phoneNumber, address, joinDate || null, status || 'Active', jobId, deptId
        ]);
        res.redirect('/employee/view?success=Employee added successfully');
    } catch (error) {
        console.error('Error:', error);
        let msg = 'Failed to add employee. ';
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('CNIC')) msg += 'CNIC must be unique.';
            else if (error.message.includes('Email')) msg += 'Email must be unique.';
            else msg += 'Duplicate entry.';
        }
        res.render('forms/employee', {
            title: 'Add Employee',
            errors: [{ msg }],
            success: null,
            formData: req.body,
            jobs,
            departments: depts
        });
    }
});

// UPDATE - Show Edit Form
router.get('/edit/:id', async (req, res) => {
    try {
        const [employees] = await db.execute('SELECT * FROM Employee WHERE EmployeeID = ?', [req.params.id]);
        if (employees.length === 0) return res.redirect('/employee/view?error=Employee not found');
        const [jobs] = await db.execute('SELECT JobID, JobTitle FROM Job_Position ORDER BY JobTitle');
        const [depts] = await db.execute('SELECT DeptID, DeptName FROM Department ORDER BY DeptName');
        res.render('forms/employeeEdit', {
            title: 'Edit Employee',
            errors: null,
            formData: employees[0],
            jobs,
            departments: depts
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/employee/view?error=Failed to load employee');
    }
});

// UPDATE - Process Edit
router.post('/edit/:id', [
    body('firstName').notEmpty().withMessage('First name required').isLength({ max: 50 }),
    body('lastName').notEmpty().withMessage('Last name required').isLength({ max: 50 }),
    body('cnic').notEmpty().withMessage('CNIC required').matches(cnicRegex).withMessage('CNIC format invalid'),
    body('dateOfBirth').notEmpty().isDate().withMessage('Invalid date of birth'),
    body('email').notEmpty().isEmail().withMessage('Invalid email').isLength({ max: 100 }),
    body('phoneNumber').notEmpty().isLength({ max: 15 }),
    body('address').notEmpty(),
    body('joinDate').optional({ checkFalsy: true }).isDate(),
    body('status').optional({ checkFalsy: true }).isIn(['Active', 'Inactive', 'On Leave', 'Terminated']),
    body('jobId').notEmpty().isInt().withMessage('Job position is required'),
    body('deptId').notEmpty().isInt().withMessage('Department is required')
], async (req, res) => {
    const errors = validationResult(req);
    const [jobs] = await db.execute('SELECT JobID, JobTitle FROM Job_Position ORDER BY JobTitle');
    const [depts] = await db.execute('SELECT DeptID, DeptName FROM Department ORDER BY DeptName');
    if (!errors.isEmpty()) {
        return res.render('forms/employeeEdit', {
            title: 'Edit Employee',
            errors: errors.array(),
            formData: { ...req.body, EmployeeID: req.params.id },
            jobs,
            departments: depts
        });
    }
    const {
        firstName, lastName, cnic, dateOfBirth, email,
        phoneNumber, address, joinDate, status, jobId, deptId
    } = req.body;
    try {
        const sql = `
            UPDATE Employee
            SET FirstName = ?, LastName = ?, CNIC = ?, DateOfBirth = ?, Email = ?, PhoneNumber = ?, Address = ?, JoinDate = ?, Status = ?, JobID = ?, DeptID = ?
            WHERE EmployeeID = ?
        `;
        const [result] = await db.execute(sql, [
            firstName, lastName, cnic, dateOfBirth, email,
            phoneNumber, address, joinDate || null, status || 'Active', jobId, deptId, req.params.id
        ]);
        if (result.affectedRows === 0) return res.redirect('/employee/view?error=Employee not found');
        res.redirect('/employee/view?success=Employee updated successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/employeeEdit', {
            title: 'Edit Employee',
            errors: [{ msg: 'Failed to update employee' }],
            formData: { ...req.body, EmployeeID: req.params.id },
            jobs,
            departments: depts
        });
    }
});

// DELETE - Confirm Delete
router.get('/delete/:id', async (req, res) => {
    try {
        const sql = `
            SELECT e.EmployeeID, e.FirstName, e.LastName, e.Email, e.Status, j.JobTitle, d.DeptName
            FROM Employee e
            LEFT JOIN Job_Position j ON e.JobID = j.JobID
            LEFT JOIN Department d ON e.DeptID = d.DeptID
            WHERE e.EmployeeID = ?
        `;
        const [employees] = await db.execute(sql, [req.params.id]);
        if (employees.length === 0) return res.redirect('/employee/view?error=Employee not found');
        res.render('view/employeeDelete', {
            title: 'Delete Employee',
            employee: employees[0]
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/employee/view?error=Failed to load employee');
    }
});

// DELETE - Process Delete
router.post('/delete/:id', async (req, res) => {
    try {
        const sql = 'DELETE FROM Employee WHERE EmployeeID = ?';
        const [result] = await db.execute(sql, [req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/employee/view?error=Employee not found');
        res.redirect('/employee/view?success=Employee deleted successfully');
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/employee/view?error=Failed to delete employee. It may be referenced by other records.');
    }
});

module.exports = router;
