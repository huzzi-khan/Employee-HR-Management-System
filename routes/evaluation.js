// ============================================
// Performance Evaluation Routes - Full CRUD
// ============================================
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// READ - View All Evaluations
router.get('/view', async (req, res) => {
    try {
        const sql = `
            SELECT p.EvaluationID, p.EmployeeID, CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
                   p.ReviewerID, CONCAT(r.FirstName, ' ', r.LastName) AS ReviewerName,
                   p.EvaluationDate, p.Rating
            FROM Performance_Evaluation p
            LEFT JOIN Employee e ON p.EmployeeID = e.EmployeeID
            LEFT JOIN Employee r ON p.ReviewerID = r.EmployeeID
            ORDER BY p.EvaluationDate DESC
        `;
        const [evals] = await db.execute(sql);
        res.render('view/evaluations', { title: 'Performance Evaluations', evals, success: req.query.success || null, error: req.query.error || null });
    } catch (error) {
        console.error('Error:', error);
        res.render('view/evaluations', { title: 'Performance Evaluations', evals: [], success: null, error: 'Failed to load evaluations' });
    }
});

// READ - Details
router.get('/details/:id', async (req, res) => {
    try {
        const sql = `
            SELECT p.*, CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName, CONCAT(r.FirstName, ' ', r.LastName) AS ReviewerName
            FROM Performance_Evaluation p
            LEFT JOIN Employee e ON p.EmployeeID = e.EmployeeID
            LEFT JOIN Employee r ON p.ReviewerID = r.EmployeeID
            WHERE p.EvaluationID = ?
        `;
        const [evals] = await db.execute(sql, [req.params.id]);
        if (evals.length === 0) return res.redirect('/evaluation/view?error=Evaluation not found');
        res.render('view/evaluationDetails', { title: 'Evaluation Details', evaluation: evals[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/evaluation/view?error=Failed to load evaluation');
    }
});

// CREATE - Show Add Form
router.get('/add', async (req, res) => {
    try {
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
        res.render('forms/evaluation', { title: 'Add Evaluation', errors: null, success: null, formData: {}, employees });
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/evaluation', { title: 'Add Evaluation', errors: [{ msg: 'Failed to load form data' }], success: null, formData: {}, employees: [] });
    }
});

// CREATE - Insert Evaluation
router.post('/add', [
    body('employeeId').notEmpty().isInt(),
    body('reviewerId').notEmpty().isInt(),
    body('evaluationDate').optional({ checkFalsy: true }).isDate(),
    body('rating').notEmpty().isFloat({ min: 1.0, max: 5.0 }).withMessage('Rating must be between 1.0 and 5.0'),
    body('comments').optional({ checkFalsy: true }).isLength({ max: 2000 })
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
    if (!errors.isEmpty()) {
        return res.render('forms/evaluation', { title: 'Add Evaluation', errors: errors.array(), success: null, formData: req.body, employees });
    }
    const { employeeId, reviewerId, evaluationDate, rating, comments } = req.body;
    try {
        const sql = 'INSERT INTO Performance_Evaluation (EmployeeID, ReviewerID, EvaluationDate, Rating, Comments) VALUES (?, ?, ?, ?, ?)';
        await db.execute(sql, [employeeId, reviewerId, evaluationDate || null, rating, comments || null]);
        res.redirect('/evaluation/view?success=Evaluation added successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/evaluation', { title: 'Add Evaluation', errors: [{ msg: 'Failed to add evaluation' }], success: null, formData: req.body, employees });
    }
});

// UPDATE - Show Edit Form
router.get('/edit/:id', async (req, res) => {
    try {
        const [evals] = await db.execute('SELECT * FROM Performance_Evaluation WHERE EvaluationID = ?', [req.params.id]);
        if (evals.length === 0) return res.redirect('/evaluation/view?error=Evaluation not found');
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
        res.render('forms/evaluationEdit', { title: 'Edit Evaluation', errors: null, formData: evals[0], employees });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/evaluation/view?error=Failed to load evaluation');
    }
});

// UPDATE - Process Edit
router.post('/edit/:id', [
    body('employeeId').notEmpty().isInt(),
    body('reviewerId').notEmpty().isInt(),
    body('evaluationDate').optional({ checkFalsy: true }).isDate(),
    body('rating').notEmpty().isFloat({ min: 1.0, max: 5.0 }),
    body('comments').optional({ checkFalsy: true }).isLength({ max: 2000 })
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
    if (!errors.isEmpty()) {
        return res.render('forms/evaluationEdit', { title: 'Edit Evaluation', errors: errors.array(), formData: { ...req.body, EvaluationID: req.params.id }, employees });
    }
    const { employeeId, reviewerId, evaluationDate, rating, comments } = req.body;
    try {
        const sql = 'UPDATE Performance_Evaluation SET EmployeeID = ?, ReviewerID = ?, EvaluationDate = ?, Rating = ?, Comments = ? WHERE EvaluationID = ?';
        const [result] = await db.execute(sql, [employeeId, reviewerId, evaluationDate || null, rating, comments || null, req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/evaluation/view?error=Evaluation not found');
        res.redirect('/evaluation/view?success=Evaluation updated successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/evaluationEdit', { title: 'Edit Evaluation', errors: [{ msg: 'Failed to update evaluation' }], formData: { ...req.body, EvaluationID: req.params.id }, employees });
    }
});

// DELETE - Confirm Delete
router.get('/delete/:id', async (req, res) => {
    try {
        const sql = `
            SELECT p.*, CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName
            FROM Performance_Evaluation p
            LEFT JOIN Employee e ON p.EmployeeID = e.EmployeeID
            WHERE p.EvaluationID = ?
        `;
        const [evals] = await db.execute(sql, [req.params.id]);
        if (evals.length === 0) return res.redirect('/evaluation/view?error=Evaluation not found');
        res.render('view/evaluationDelete', { title: 'Delete Evaluation', evaluation: evals[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/evaluation/view?error=Failed to load evaluation');
    }
});

// DELETE - Process Delete
router.post('/delete/:id', async (req, res) => {
    try {
        const sql = 'DELETE FROM Performance_Evaluation WHERE EvaluationID = ?';
        const [result] = await db.execute(sql, [req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/evaluation/view?error=Evaluation not found');
        res.redirect('/evaluation/view?success=Evaluation deleted successfully');
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/evaluation/view?error=Failed to delete evaluation');
    }
});

module.exports = router;
