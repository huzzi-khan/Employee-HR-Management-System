// ============================================
// Job Position Routes - Full CRUD
// ============================================
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// READ - View All Job Positions
router.get('/view', async (req, res) => {
    try {
        const sql = 'SELECT JobID, JobTitle, JobDescription, MinSalary, MaxSalary FROM Job_Position ORDER BY JobTitle';
        const [jobs] = await db.execute(sql);
        res.render('view/jobPositions', {
            title: 'Job Positions',
            jobs,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('view/jobPositions', {
            title: 'Job Positions',
            jobs: [],
            success: null,
            error: 'Failed to load job positions'
        });
    }
});

// READ - View Single Job Position
router.get('/details/:id', async (req, res) => {
    try {
        const sql = 'SELECT * FROM Job_Position WHERE JobID = ?';
        const [jobs] = await db.execute(sql, [req.params.id]);
        if (jobs.length === 0) {
            return res.redirect('/jobPosition/view?error=Job position not found');
        }
        res.render('view/jobPositionDetails', {
            title: 'Job Position Details',
            job: jobs[0]
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/jobPosition/view?error=Failed to load job position');
    }
});

// CREATE - Show Add Form
router.get('/add', (req, res) => {
    res.render('forms/jobPosition', {
        title: 'Add Job Position',
        errors: null,
        success: null,
        formData: {}
    });
});

// CREATE - Insert Job Position
router.post('/add', [
    body('jobTitle').notEmpty().withMessage('Job title is required').trim().isLength({ max: 100 }),
    body('jobDescription').optional({ checkFalsy: true }).isLength({ max: 2000 }),
    body('minSalary').notEmpty().withMessage('Min salary is required').isDecimal({ decimal_digits: '0,2' }).custom(value => parseFloat(value) >= 0),
    body('maxSalary').notEmpty().withMessage('Max salary is required').isDecimal({ decimal_digits: '0,2' }).custom(value => parseFloat(value) >= 0)
        .custom((maxSalary, { req }) => parseFloat(maxSalary) >= parseFloat(req.body.minSalary)).withMessage('MaxSalary must be >= MinSalary')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('forms/jobPosition', {
            title: 'Add Job Position',
            errors: errors.array(),
            success: null,
            formData: req.body
        });
    }
    const { jobTitle, jobDescription, minSalary, maxSalary } = req.body;
    try {
        const sql = 'INSERT INTO Job_Position (JobTitle, JobDescription, MinSalary, MaxSalary) VALUES (?, ?, ?, ?)';
        await db.execute(sql, [jobTitle, jobDescription || null, minSalary, maxSalary]);
        res.redirect('/jobPosition/view?success=Job position added successfully');
    } catch (error) {
        console.error('Error:', error);
        let msg = 'Failed to add job position. ';
        if (error.code === 'ER_DUP_ENTRY') msg += 'Job title must be unique.';
        res.render('forms/jobPosition', {
            title: 'Add Job Position',
            errors: [{ msg }],
            success: null,
            formData: req.body
        });
    }
});

// UPDATE - Show Edit Form
router.get('/edit/:id', async (req, res) => {
    try {
        const [jobs] = await db.execute('SELECT * FROM Job_Position WHERE JobID = ?', [req.params.id]);
        if (jobs.length === 0) return res.redirect('/jobPosition/view?error=Job position not found');
        res.render('forms/jobPositionEdit', {
            title: 'Edit Job Position',
            errors: null,
            formData: jobs[0]
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/jobPosition/view?error=Failed to load job position');
    }
});

// UPDATE - Process Edit
router.post('/edit/:id', [
    body('jobTitle').notEmpty().withMessage('Job title is required').trim().isLength({ max: 100 }),
    body('jobDescription').optional({ checkFalsy: true }).isLength({ max: 2000 }),
    body('minSalary').notEmpty().withMessage('Min salary is required').isDecimal({ decimal_digits: '0,2' }).custom(value => parseFloat(value) >= 0),
    body('maxSalary').notEmpty().withMessage('Max salary is required').isDecimal({ decimal_digits: '0,2' }).custom(value => parseFloat(value) >= 0)
        .custom((maxSalary, { req }) => parseFloat(maxSalary) >= parseFloat(req.body.minSalary)).withMessage('MaxSalary must be >= MinSalary')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('forms/jobPositionEdit', {
            title: 'Edit Job Position',
            errors: errors.array(),
            formData: { ...req.body, JobID: req.params.id }
        });
    }
    const { jobTitle, jobDescription, minSalary, maxSalary } = req.body;
    try {
        const sql = 'UPDATE Job_Position SET JobTitle = ?, JobDescription = ?, MinSalary = ?, MaxSalary = ? WHERE JobID = ?';
        const [result] = await db.execute(sql, [jobTitle, jobDescription || null, minSalary, maxSalary, req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/jobPosition/view?error=Job position not found');
        res.redirect('/jobPosition/view?success=Job position updated successfully');
    } catch (error) {
        console.error('Error:', error);
        res.render('forms/jobPositionEdit', {
            title: 'Edit Job Position',
            errors: [{ msg: 'Failed to update job position' }],
            formData: { ...req.body, JobID: req.params.id }
        });
    }
});

// DELETE - Confirm Delete
router.get('/delete/:id', async (req, res) => {
    try {
        const [jobs] = await db.execute('SELECT * FROM Job_Position WHERE JobID = ?', [req.params.id]);
        if (jobs.length === 0) return res.redirect('/jobPosition/view?error=Job position not found');
        res.render('view/jobPositionDelete', {
            title: 'Delete Job Position',
            job: jobs[0]
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/jobPosition/view?error=Failed to load job position');
    }
});

// DELETE - Process Delete
router.post('/delete/:id', async (req, res) => {
    try {
        const sql = 'DELETE FROM Job_Position WHERE JobID = ?';
        const [result] = await db.execute(sql, [req.params.id]);
        if (result.affectedRows === 0) return res.redirect('/jobPosition/view?error=Job position not found');
        res.redirect('/jobPosition/view?success=Job position deleted successfully');
    } catch (error) {
        console.error('Error:', error);
        // likely FK constraint if employees reference it
        res.redirect('/jobPosition/view?error=Failed to delete job position. It may be assigned to employees.');
    }
});

module.exports = router;
