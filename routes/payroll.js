// ============================================
// Payroll Routes - Full CRUD
// ============================================
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// READ - View All Payroll Records
router.get('/view', async (req, res) => {
    try {
        const sql = `
            SELECT p.PayrollID, p.EmployeeID, CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
                   p.PayPeriodStartDate, p.PayPeriodEndDate, p.GrossPay, p.Deductions, p.NetPay, p.DatePaid
            FROM Payroll_Record p
            JOIN Employee e ON p.EmployeeID = e.EmployeeID
            ORDER BY p.DatePaid DESC
        `;
        const [payrolls] = await db.execute(sql);
        res.render('view/payrolls', {
            title: 'Payroll Records',
            payrolls,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('view/payrolls', {
            title: 'Payroll Records',
            payrolls: [],
            success: null,
            error: 'Failed to load payroll records'
        });
    }
});

// READ - Details
router.get('/details/:id', async (req, res) => {
    try {
        const sql = `
            SELECT p.*, CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName
            FROM Payroll_Record p
            JOIN Employee e ON p.EmployeeID = e.EmployeeID
            WHERE p.PayrollID = ?
        `;
        const [payrolls] = await db.execute(sql, [req.params.id]);
        if (payrolls.length === 0) return res.redirect('/payroll/view?error=Payroll record not found');
        res.render('view/payrollDetails', { title: 'Payroll Details', payroll: payrolls[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/payroll/view?error=Failed to load payroll record');
    }
});

// CREATE - Show Add Form
router.get('/add', async (req, res) => {
    try {
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
        res.render('forms/payroll', {
            title: 'Add Payroll Record',
            errors: null,
            success: null,
            formData: {},
            employees
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/payroll', {
            title: 'Add Payroll Record',
            errors: [{ msg: 'Failed to load form data' }],
            success: null,
            formData: {},
            employees: []
        });
    }
});

// CREATE - Insert Payroll
router.post('/add', [
    body('employeeId').notEmpty().isInt(),
    body('payPeriodStart').notEmpty().isDate(),
    body('payPeriodEnd').notEmpty().isDate().custom((end, { req }) => new Date(end) >= new Date(req.body.payPeriodStart)).withMessage('End date must be on/after start date'),
    body('grossPay').notEmpty().isDecimal({ decimal_digits: '0,2' }).custom(val => parseFloat(val) >= 0),
    body('deductions').optional({ checkFalsy: true }).isDecimal({ decimal_digits: '0,2' }).custom(val => parseFloat(val) >= 0),
    body('netPay').notEmpty().isDecimal({ decimal_digits: '0,2' }).custom(val => parseFloat(val) >= 0),
    body('datePaid').notEmpty().isDate()
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
    if (!errors.isEmpty()) {
        return res.render('forms/payroll', {
            title: 'Add Payroll Record',
            errors: errors.array(),
            success: null,
            formData: req.body,
            employees
        });
    }
    const { employeeId, payPeriodStart, payPeriodEnd, grossPay, deductions, netPay, datePaid } = req.body;
    try {
        const sql = `INSERT INTO Payroll_Record (EmployeeID, PayPeriodStartDate, PayPeriodEndDate, GrossPay, Deductions, NetPay, DatePaid)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await db.execute(sql, [employeeId, payPeriodStart, payPeriodEnd, grossPay, deductions || 0, netPay, datePaid]);
        res.redirect('/payroll/view?success=Payroll record added successfully');
    } catch (error) {
        console.error('Error:', error);
        let msg = 'Failed to add payroll record. ';
        if (error.code === 'ER_DUP_ENTRY') msg += 'Payroll for this employee and period already exists.';
        res.render('forms/payroll', {
            title: 'Add Payroll Record',
            errors: [{ msg }],
            success: null,
            formData: req.body,
            employees
        });
    }
});

// UPDATE - Show Edit Form
router.get('/edit/:id', async (req, res) => {
    try {
        const [payrolls] = await db.execute('SELECT * FROM Payroll_Record WHERE PayrollID = ?', [req.params.id]);
        if (payrolls.length === 0) return res.redirect('/payroll/view?error=Payroll record not found');
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
        res.render('forms/payrollEdit', { title: 'Edit Payroll Record', errors: null, formData: payrolls[0], employees });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/payroll/view?error=Failed to load payroll record');
    }
});

// UPDATE - Process Edit
router.post('/edit/:id', [
    body('employeeId').notEmpty().isInt(),
    body('payPeriodStart').notEmpty().isDate(),
    body('payPeriodEnd').notEmpty().isDate().custom((end, { req }) => new Date(end) >= new Date(req.body.payPeriodStart)).withMessage('End date must be on/after start date'),
    body('grossPay').notEmpty().isDecimal({ decimal_digits: '0,2' }).custom(val => parseFloat(val) >= 0),
    body('deductions').optional({ checkFalsy: true }).isDecimal({ decimal_digits: '0,2' }).custom(val => parseFloat(val) >= 0),
    body('netPay').notEmpty().isDecimal({ decimal_digits: '0,2' }).custom(val => parseFloat(val) >= 0),
    body('datePaid').notEmpty().isDate()
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
    if (!errors.isEmpty()) {
        return res.render('forms/payrollEdit', {
            title: 'Edit Payroll Record',
            errors: errors.array(),
            formData: { ...req.body, PayrollID: req.params.id },
            employees
        });
    }
    const { employeeId, payPeriodStart, payPeriodEnd, grossPay, deductions, netPay, datePaid } = req.body;
    try {
        const sql = `UPDATE Payroll_Record SET EmployeeID = ?, PayPeriodStartDate = ?, PayPeriodEndDate = ?, GrossPay = ?, Deductions = ?, NetPay = ?, DatePaid = ? WHERE PayrollID = ?`;
        const [result] = await db.execute(sql, [employeeId, payPeriodStart, payPeriodEnd, grossPay, deductions || 0, netPay, datePaid, req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/payroll/view?error=Payroll record not found');
        res.redirect('/payroll/view?success=Payroll record updated successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/payrollEdit', {
            title: 'Edit Payroll Record',
            errors: [{ msg: 'Failed to update payroll record' }],
            formData: { ...req.body, PayrollID: req.params.id },
            employees
        });
    }
});

// DELETE - Confirm Delete
router.get('/delete/:id', async (req, res) => {
    try {
        const sql = `
            SELECT p.*, CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName
            FROM Payroll_Record p
            JOIN Employee e ON p.EmployeeID = e.EmployeeID
            WHERE p.PayrollID = ?
        `;
        const [payrolls] = await db.execute(sql, [req.params.id]);
        if (payrolls.length === 0) return res.redirect('/payroll/view?error=Payroll record not found');
        res.render('view/payrollDelete', { title: 'Delete Payroll Record', payroll: payrolls[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/payroll/view?error=Failed to load payroll record');
    }
});

// DELETE - Process Delete
router.post('/delete/:id', async (req, res) => {
    try {
        const sql = 'DELETE FROM Payroll_Record WHERE PayrollID = ?';
        const [result] = await db.execute(sql, [req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/payroll/view?error=Payroll record not found');
        res.redirect('/payroll/view?success=Payroll record deleted successfully');
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/payroll/view?error=Failed to delete payroll record');
    }
});

module.exports = router;
