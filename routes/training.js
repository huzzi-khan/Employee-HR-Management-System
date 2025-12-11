// ============================================
// Training Session Routes - Full CRUD
// ============================================
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// READ - View All Trainings
router.get('/view', async (req, res) => {
    try {
        const sql = 'SELECT TrainingID, SessionTitle, Description, Instructor, SessionDate FROM Training_Session ORDER BY SessionDate DESC';
        const [trainings] = await db.execute(sql);
        res.render('view/trainings', {
            title: 'Training Sessions',
            trainings,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('view/trainings', {
            title: 'Training Sessions',
            trainings: [],
            success: null,
            error: 'Failed to load training sessions'
        });
    }
});

// READ - Details
router.get('/details/:id', async (req, res) => {
    try {
        const sql = 'SELECT * FROM Training_Session WHERE TrainingID = ?';
        const [trainings] = await db.execute(sql, [req.params.id]);
        if (trainings.length === 0) return res.redirect('/training/view?error=Training session not found');
        res.render('view/trainingDetails', { title: 'Training Details', training: trainings[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/training/view?error=Failed to load training session');
    }
});

// CREATE - Show Add Form
router.get('/add', (req, res) => {
    res.render('forms/training', { title: 'Add Training', errors: null, success: null, formData: {} });
});

// CREATE - Insert Training
router.post('/add', [
    body('sessionTitle').notEmpty().withMessage('Title required').isLength({ max: 200 }),
    body('description').optional({ checkFalsy: true }).isLength({ max: 2000 }),
    body('instructor').notEmpty().withMessage('Instructor required').isLength({ max: 100 }),
    body('sessionDate').notEmpty().isDate().withMessage('Invalid session date')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('forms/training', { title: 'Add Training', errors: errors.array(), success: null, formData: req.body });
    }
    const { sessionTitle, description, instructor, sessionDate } = req.body;
    try {
        const sql = 'INSERT INTO Training_Session (SessionTitle, Description, Instructor, SessionDate) VALUES (?, ?, ?, ?)';
        await db.execute(sql, [sessionTitle, description || null, instructor, sessionDate]);
        res.redirect('/training/view?success=Training session added successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/training', { title: 'Add Training', errors: [{ msg: 'Failed to add training session' }], success: null, formData: req.body });
    }
});

// UPDATE - Show Edit Form
router.get('/edit/:id', async (req, res) => {
    try {
        const [trainings] = await db.execute('SELECT * FROM Training_Session WHERE TrainingID = ?', [req.params.id]);
        if (trainings.length === 0) return res.redirect('/training/view?error=Training session not found');
        res.render('forms/trainingEdit', { title: 'Edit Training', errors: null, formData: trainings[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/training/view?error=Failed to load training session');
    }
});

// UPDATE - Process Edit
router.post('/edit/:id', [
    body('sessionTitle').notEmpty().withMessage('Title required').isLength({ max: 200 }),
    body('description').optional({ checkFalsy: true }).isLength({ max: 2000 }),
    body('instructor').notEmpty().withMessage('Instructor required').isLength({ max: 100 }),
    body('sessionDate').notEmpty().isDate().withMessage('Invalid session date')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('forms/trainingEdit', { title: 'Edit Training', errors: errors.array(), formData: { ...req.body, TrainingID: req.params.id } });
    }
    const { sessionTitle, description, instructor, sessionDate } = req.body;
    try {
        const sql = 'UPDATE Training_Session SET SessionTitle = ?, Description = ?, Instructor = ?, SessionDate = ? WHERE TrainingID = ?';
        const [result] = await db.execute(sql, [sessionTitle, description || null, instructor, sessionDate, req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/training/view?error=Training session not found');
        res.redirect('/training/view?success=Training session updated successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/trainingEdit', { title: 'Edit Training', errors: [{ msg: 'Failed to update training session' }], formData: { ...req.body, TrainingID: req.params.id } });
    }
});

// DELETE - Confirm Delete
router.get('/delete/:id', async (req, res) => {
    try {
        const [trainings] = await db.execute('SELECT * FROM Training_Session WHERE TrainingID = ?', [req.params.id]);
        if (trainings.length === 0) return res.redirect('/training/view?error=Training session not found');
        res.render('view/trainingDelete', { title: 'Delete Training', training: trainings[0] });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/training/view?error=Failed to load training session');
    }
});

// DELETE - Process Delete
router.post('/delete/:id', async (req, res) => {
    try {
        const sql = 'DELETE FROM Training_Session WHERE TrainingID = ?';
        const [result] = await db.execute(sql, [req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/training/view?error=Training session not found');
        res.redirect('/training/view?success=Training session deleted successfully');
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/training/view?error=Failed to delete training session');
    }
});

module.exports = router;
