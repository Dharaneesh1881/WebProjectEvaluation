import { Router } from 'express';
import StudentProgress from '../models/StudentProgress.js';
import Submission from '../models/Submission.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/progress — current student's progress across all assignments
router.get('/progress', requireAuth, async (req, res) => {
    const records = await StudentProgress.find({ studentId: req.user.id });
    const progressMap = Object.fromEntries(
        records.map(r => [r.assignmentId, {
            bestScore: r.bestScore,
            completed: r.completed,
            completedAt: r.completedAt,
            attempts: r.attempts
        }])
    );
    return res.json(progressMap);
});

// GET /api/progress/:assignmentId — one assignment's progress for current student
router.get('/progress/:assignmentId', requireAuth, async (req, res) => {
    const record = await StudentProgress.findOne({
        studentId: req.user.id,
        assignmentId: req.params.assignmentId
    });
    if (!record) return res.json({ bestScore: 0, completed: false, attempts: 0, completedAt: null });
    return res.json({
        bestScore: record.bestScore,
        completed: record.completed,
        completedAt: record.completedAt,
        attempts: record.attempts
    });
});

// GET /api/progress/:assignmentId/code — return the student's best submission code
router.get('/progress/:assignmentId/code', requireAuth, async (req, res) => {
    const record = await StudentProgress.findOne({
        studentId: req.user.id,
        assignmentId: req.params.assignmentId
    });
    if (!record?.bestSubmissionId) {
        return res.json({ html: '', css: '', js: '' });
    }
    const submission = await Submission.findOne({ submissionId: record.bestSubmissionId });
    if (!submission) return res.json({ html: '', css: '', js: '' });
    return res.json({
        html: submission.files.html || '',
        css: submission.files.css || '',
        js: submission.files.js || ''
    });
});

export default router;

