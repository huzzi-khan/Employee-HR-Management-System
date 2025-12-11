// ============================================
// Department Routes - Full CRUD
// ============================================
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// READ - View All Departments
router.get('/view', async (req, res) => {
    try {
        const sql = `
            SELECT d.DeptID, d.DeptName, d.Location, d.ManagerID,
                   CONCAT(e.FirstName, ' ', e.LastName) AS ManagerName
            FROM Department d
            LEFT JOIN Employee e ON d.ManagerID = e.EmployeeID
            ORDER BY d.DeptName
        `;
        const [departments] = await db.execute(sql);
        res.render('view/departments', {
            title: 'Departments',
            departments,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('view/departments', {
            title: 'Departments',
            departments: [],
            success: null,
            error: 'Failed to load departments'
        });
    }
});

// READ - Details
router.get('/details/:id', async (req, res) => {
    try {
        const sql = `
            SELECT d.*, CONCAT(e.FirstName, ' ', e.LastName) AS ManagerName, e.EmployeeID AS ManagerEmpID
            FROM Department d
            LEFT JOIN Employee e ON d.ManagerID = e.EmployeeID
            WHERE d.DeptID = ?
        `;
        const [departments] = await db.execute(sql, [req.params.id]);
        if (departments.length === 0) return res.redirect('/department/view?error=Department not found');
        res.render('view/departmentDetails', {
            title: 'Department Details',
            department: departments[0]
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/department/view?error=Failed to load department');
    }
});

// CREATE - Show Add Form
router.get('/add', async (req, res) => {
    try {
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
        res.render('forms/department', {
            title: 'Add Department',
            errors: null,
            success: null,
            formData: {},
            managers: employees
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/department', {
            title: 'Add Department',
            errors: [{ msg: 'Failed to load form data' }],
            success: null,
            formData: {},
            managers: []
        });
    }
});

// CREATE - Insert Department
router.post('/add', [
    body('deptName').notEmpty().withMessage('Department name is required').trim().isLength({ max: 100 }),
    body('location').optional({ checkFalsy: true }).isLength({ max: 200 }),
    body('managerId').optional({ checkFalsy: true }).isInt().withMessage('Invalid manager selection')
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
    if (!errors.isEmpty()) {
        return res.render('forms/department', {
            title: 'Add Department',
            errors: errors.array(),
            success: null,
            formData: req.body,
            managers: employees
        });
    }
    const { deptName, location, managerId } = req.body;
    try {
        const sql = 'INSERT INTO Department (DeptName, Location, ManagerID) VALUES (?, ?, ?)';
        await db.execute(sql, [deptName, location || null, managerId || null]);
        res.redirect('/department/view?success=Department added successfully');
    } catch (error) {
        console.error('Error:', error);
        let msg = 'Failed to add department. ';
        if (error.code === 'ER_DUP_ENTRY') msg += 'Department name must be unique.';
        res.render('forms/department', {
            title: 'Add Department',
            errors: [{ msg }],
            success: null,
            formData: req.body,
            managers: employees
        });
    }
});

// UPDATE - Show Edit Form
router.get('/edit/:id', async (req, res) => {
    try {
        const [departments] = await db.execute('SELECT * FROM Department WHERE DeptID = ?', [req.params.id]);
        if (departments.length === 0) return res.redirect('/department/view?error=Department not found');
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
        res.render('forms/departmentEdit', {
            title: 'Edit Department',
            errors: null,
            formData: departments[0],
            managers: employees
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/department/view?error=Failed to load department');
    }
});

// UPDATE - Process Edit
router.post('/edit/:id', [
    body('deptName').notEmpty().withMessage('Department name is required').trim().isLength({ max: 100 }),
    body('location').optional({ checkFalsy: true }).isLength({ max: 200 }),
    body('managerId').optional({ checkFalsy: true }).isInt().withMessage('Invalid manager selection')
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
    if (!errors.isEmpty()) {
        return res.render('forms/departmentEdit', {
            title: 'Edit Department',
            errors: errors.array(),
            formData: { ...req.body, DeptID: req.params.id },
            managers: employees
        });
    }
    const { deptName, location, managerId } = req.body;
    try {
        const sql = 'UPDATE Department SET DeptName = ?, Location = ?, ManagerID = ? WHERE DeptID = ?';
        const [result] = await db.execute(sql, [deptName, location || null, managerId || null, req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/department/view?error=Department not found');
        res.redirect('/department/view?success=Department updated successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/departmentEdit', {
            title: 'Edit Department',
            errors: [{ msg: 'Failed to update department' }],
            formData: { ...req.body, DeptID: req.params.id },
            managers: employees
        });
    }
});

// DELETE - Confirm Delete
router.get('/delete/:id', async (req, res) => {
    try {
        const sql = `
            SELECT d.*, CONCAT(e.FirstName, ' ', e.LastName) AS ManagerName
            FROM Department d
            LEFT JOIN Employee e ON d.ManagerID = e.EmployeeID
            WHERE d.DeptID = ?
        `;
        const [departments] = await db.execute(sql, [req.params.id]);
        if (departments.length === 0) return res.redirect('/department/view?error=Department not found');
        res.render('view/departmentDelete', {
            title: 'Delete Department',
            department: departments[0]
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/department/view?error=Failed to load department');
    }
});

// DELETE - Process Delete
router.post('/delete/:id', async (req, res) => {
    try {
        const sql = 'DELETE FROM Department WHERE DeptID = ?';
        const [result] = await db.execute(sql, [req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/department/view?error=Department not found');
        res.redirect('/department/view?success=Department deleted successfully');
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/department/view?error=Failed to delete department. It may have employees assigned.');
    }
});

module.exports = router;
