import { Router } from 'express';
import StudentProgress from '../models/StudentProgress.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

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

// ── Leaderboard (teacher-only) ───────────────────────────────────────────────

// GET /api/leaderboard — all assignments with full ranked student list
router.get('/leaderboard', requireAuth, requireRole('teacher'), async (req, res) => {
    // Get all active assignments
    const assignments = await Assignment.find({ isActive: true })
        .select('_id title description referenceScreenshotUrl')
        .sort({ createdAt: -1 });

    // Get all student progress records in one query
    const allProgress = await StudentProgress.find({});

    // Get unique student IDs across all progress
    const studentIds = [...new Set(allProgress.map(p => p.studentId))];

    // Fetch student names/emails
    const users = await User.find({ _id: { $in: studentIds } }).select('_id name email');
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), { name: u.name, email: u.email }]));

    // Group progress by assignmentId
    const progressByAssignment = {};
    for (const p of allProgress) {
        if (!progressByAssignment[p.assignmentId]) progressByAssignment[p.assignmentId] = [];
        progressByAssignment[p.assignmentId].push(p);
    }

    // Build leaderboard per assignment
    const leaderboard = assignments.map(a => {
        const records = progressByAssignment[a._id.toString()] || [];

        // Sort: completed first (desc), then by bestScore desc
        const ranked = records
            .map((p, idx) => ({
                studentId: p.studentId,
                name: userMap[p.studentId]?.name || 'Unknown',
                email: userMap[p.studentId]?.email || '',
                bestScore: p.bestScore,
                completed: p.completed,
                completedAt: p.completedAt,
                attempts: p.attempts
            }))
            .sort((a, b) => {
                // completed first, then higher score
                if (b.completed !== a.completed) return b.completed ? 1 : -1;
                return b.bestScore - a.bestScore;
            })
            .map((s, idx) => ({ ...s, rank: idx + 1 }));

        return {
            assignmentId: a._id,
            title: a.title,
            description: a.description,
            referenceScreenshotUrl: a.referenceScreenshotUrl,
            totalStudents: ranked.length,
            completedCount: ranked.filter(s => s.completed).length,
            avgScore: ranked.length
                ? Math.round(ranked.reduce((sum, s) => sum + s.bestScore, 0) / ranked.length)
                : 0,
            students: ranked
        };
    });

    return res.json(leaderboard);
});

// GET /api/leaderboard/:assignmentId — single assignment ranking
router.get('/leaderboard/:assignmentId', requireAuth, requireRole('teacher'), async (req, res) => {
    const assignment = await Assignment.findById(req.params.assignmentId).select('_id title description');
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const records = await StudentProgress.find({ assignmentId: req.params.assignmentId });
    const studentIds = records.map(p => p.studentId);
    const users = await User.find({ _id: { $in: studentIds } }).select('_id name email');
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), { name: u.name, email: u.email }]));

    const ranked = records
        .map(p => ({
            studentId: p.studentId,
            name: userMap[p.studentId]?.name || 'Unknown',
            email: userMap[p.studentId]?.email || '',
            bestScore: p.bestScore,
            completed: p.completed,
            completedAt: p.completedAt,
            attempts: p.attempts
        }))
        .sort((a, b) => {
            if (b.completed !== a.completed) return b.completed ? 1 : -1;
            return b.bestScore - a.bestScore;
        })
        .map((s, idx) => ({ ...s, rank: idx + 1 }));

    return res.json({ assignment, students: ranked });
});

export default router;
