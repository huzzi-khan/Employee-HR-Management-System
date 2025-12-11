// ============================================
// Employee Training Routes - Full CRUD
// ============================================
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// READ - View All Employee Trainings
router.get('/view', async (req, res) => {
    try {
        const sql = `
            SELECT et.EmployeeID, et.TrainingID, et.CompletionDate, et.Grade,
                   CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
                   t.SessionTitle
            FROM Employee_Training et
            JOIN Employee e ON et.EmployeeID = e.EmployeeID
            JOIN Training_Session t ON et.TrainingID = t.TrainingID
            ORDER BY et.CompletionDate DESC
        `;
        const [rows] = await db.execute(sql);
        res.render('view/employeeTrainings', { title: 'Employee Trainings', trainings: rows, success: req.query.success || null, error: req.query.error || null });
    } catch (error) {
        console.error('Error:', error);
        res.render('view/employeeTrainings', { title: 'Employee Trainings', trainings: [], success: null, error: 'Failed to load employee trainings' });
    }
});

// READ - Details (composite key)
router.get('/details/:empId/:trainingId', async (req, res) => {
    try {
        const { empId, trainingId } = req.params;
        const sql = `
            SELECT et.*, CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName, t.SessionTitle
            FROM Employee_Training et
            JOIN Employee e ON et.EmployeeID = e.EmployeeID
            JOIN Training_Session t ON et.TrainingID = t.TrainingID
            WHERE et.EmployeeID = ? AND et.TrainingID = ?
        `;
        const [rows] = await db.execute(sql, [empId, trainingId]);
        if (rows.length === 0) return res.redirect('/employeeTraining/view?error=Record not found');
        res.render('view/employeeTrainingDetails', { title: 'Employee Training Details', record: rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/employeeTraining/view?error=Failed to load record');
    }
});

// CREATE - Show Add Form
router.get('/add', async (req, res) => {
    try {
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
        const [trainings] = await db.execute('SELECT TrainingID, SessionTitle FROM Training_Session ORDER BY SessionDate DESC');
        res.render('forms/employeeTraining', { title: 'Add Employee Training', errors: null, success: null, formData: {}, employees, trainings });
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/employeeTraining', { title: 'Add Employee Training', errors: [{ msg: 'Failed to load form data' }], success: null, formData: {}, employees: [], trainings: [] });
    }
});

// CREATE - Insert Employee Training
router.post('/add', [
    body('employeeId').notEmpty().isInt(),
    body('trainingId').notEmpty().isInt(),
    body('completionDate').optional({ checkFalsy: true }).isDate(),
    body('grade').optional({ checkFalsy: true }).isIn(['A+', 'A', 'B+', 'B', 'C+', 'C', 'F'])
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
    const [trainings] = await db.execute('SELECT TrainingID, SessionTitle FROM Training_Session ORDER BY SessionDate DESC');
    if (!errors.isEmpty()) {
        return res.render('forms/employeeTraining', { title: 'Add Employee Training', errors: errors.array(), success: null, formData: req.body, employees, trainings });
    }
    const { employeeId, trainingId, completionDate, grade } = req.body;
    try {
        const sql = 'INSERT INTO Employee_Training (EmployeeID, TrainingID, CompletionDate, Grade) VALUES (?, ?, ?, ?)';
        await db.execute(sql, [employeeId, trainingId, completionDate || null, grade || null]);
        res.redirect('/employeeTraining/view?success=Record added successfully');
    } catch (error) {
        console.error('Error:', error);
        let msg = 'Failed to add record.';
        if (error.code === 'ER_DUP_ENTRY') msg = 'This employee-training record already exists.';
        res.render('forms/employeeTraining', { title: 'Add Employee Training', errors: [{ msg }], success: null, formData: req.body, employees, trainings });
    }
});

// UPDATE - Show Edit Form
router.get('/edit/:empId/:trainingId', async (req, res) => {
    try {
        const { empId, trainingId } = req.params;
        const [rows] = await db.execute('SELECT * FROM Employee_Training WHERE EmployeeID = ? AND TrainingID = ?', [empId, trainingId]);
        if (rows.length === 0) return res.redirect('/employeeTraining/view?error=Record not found');
        const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
        const [trainings] = await db.execute('SELECT TrainingID, SessionTitle FROM Training_Session ORDER BY SessionDate DESC');
        res.render('forms/employeeTrainingEdit', { title: 'Edit Employee Training', errors: null, formData: rows[0], employees, trainings });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/employeeTraining/view?error=Failed to load record');
    }
});

// UPDATE - Process Edit
router.post('/edit/:empId/:trainingId', [
    body('employeeId').notEmpty().isInt(),
    body('trainingId').notEmpty().isInt(),
    body('completionDate').optional({ checkFalsy: true }).isDate(),
    body('grade').optional({ checkFalsy: true }).isIn(['A+', 'A', 'B+', 'B', 'C+', 'C', 'F'])
], async (req, res) => {
    const errors = validationResult(req);
    const [employees] = await db.execute('SELECT EmployeeID, FirstName, LastName FROM Employee ORDER BY FirstName');
    const [trainings] = await db.execute('SELECT TrainingID, SessionTitle FROM Training_Session ORDER BY SessionDate DESC');
    if (!errors.isEmpty()) {
        return res.render('forms/employeeTrainingEdit', { title: 'Edit Employee Training', errors: errors.array(), formData: { ...req.body, EmployeeID: req.params.empId, TrainingID: req.params.trainingId }, employees, trainings });
    }
    const { employeeId, trainingId, completionDate, grade } = req.body;
    try {
        // If PK changed (employeeId or trainingId), we should handle by deleting old row and inserting new.
        const empOld = parseInt(req.params.empId, 10);
        const trOld = parseInt(req.params.trainingId, 10);
        if (empOld !== parseInt(employeeId, 10) || trOld !== parseInt(trainingId, 10)) {
            // try insert new then delete old (to preserve PK uniqueness)
            await db.execute('INSERT INTO Employee_Training (EmployeeID, TrainingID, CompletionDate, Grade) VALUES (?, ?, ?, ?)', [employeeId, trainingId, completionDate || null, grade || null]);
            await db.execute('DELETE FROM Employee_Training WHERE EmployeeID = ? AND TrainingID = ?', [empOld, trOld]);
        } else {
            await db.execute('UPDATE Employee_Training SET CompletionDate = ?, Grade = ? WHERE EmployeeID = ? AND TrainingID = ?', [completionDate || null, grade || null, employeeId, trainingId]);
        }
        res.redirect('/employeeTraining/view?success=Record updated successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/employeeTrainingEdit', { title: 'Edit Employee Training', errors: [{ msg: 'Failed to update record' }], formData: { ...req.body, EmployeeID: req.params.empId, TrainingID: req.params.trainingId }, employees, trainings });
    }
});

// DELETE - Confirm Delete
router.get('/delete/:empId/:trainingId', async (req, res) => {
    try {
        const { empId, trainingId } = req.params;
        const sql = `
            SELECT et.*, CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName, t.SessionTitle
            FROM Employee_Training et
            JOIN Employee e ON et.EmployeeID = e.EmployeeID
            JOIN Training_Session t ON et.TrainingID = t.TrainingID
            WHERE et.EmployeeID = ? AND et.TrainingID = ?
        `;
        const [rows] = await db.execute(sql, [empId, trainingId]);
        if (rows.length === 0) return res.redirect('/employeeTraining/view?error=Record not found');
        res.render('view/employeeTrainingDelete', { title: 'Delete Employee Training', record: rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/employeeTraining/view?error=Failed to load record');
    }
});

// DELETE - Process Delete
router.post('/delete/:empId/:trainingId', async (req, res) => {
    try {
        const { empId, trainingId } = req.params;
        const sql = 'DELETE FROM Employee_Training WHERE EmployeeID = ? AND TrainingID = ?';
        const [result] = await db.execute(sql, [empId, trainingId]);
        if (result.affectedRows === 0) return res.redirect('/employeeTraining/view?error=Record not found');
        res.redirect('/employeeTraining/view?success=Record deleted successfully');
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/employeeTraining/view?error=Failed to delete record');
    }
});

module.exports = router;
