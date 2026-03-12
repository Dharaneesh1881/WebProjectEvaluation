import { Router } from 'express';
import { adminLogin, requireAdmin } from '../middleware/adminAuth.js';
import Assignment from '../models/Assignment.js';
import StudentProgress from '../models/StudentProgress.js';
import Submission from '../models/Submission.js';
import EvaluationRun from '../models/EvaluationRun.js';
import User from '../models/User.js';

const router = Router();

// ── Auth ─────────────────────────────────────────────────────────────────────
// POST /api/admin/login
router.post('/admin/login', adminLogin);

// ── Dashboard Stats ──────────────────────────────────────────────────────────
// GET /api/admin/stats
router.get('/admin/stats', requireAdmin, async (req, res) => {
    const [assignments, users, submissions, evalRuns, progress] = await Promise.all([
        Assignment.countDocuments(),
        User.countDocuments(),
        Submission.countDocuments(),
        EvaluationRun.countDocuments(),
        StudentProgress.find({})
    ]);

    const completedCount = progress.filter(p => p.completed).length;
    const avgScore = progress.length
        ? Math.round(progress.reduce((s, p) => s + p.bestScore, 0) / progress.length)
        : 0;

    // Score distribution buckets
    const dist = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    for (const p of progress) {
        if (p.bestScore <= 20) dist['0-20']++;
        else if (p.bestScore <= 40) dist['21-40']++;
        else if (p.bestScore <= 60) dist['41-60']++;
        else if (p.bestScore <= 80) dist['61-80']++;
        else dist['81-100']++;
    }

    return res.json({
        assignments,
        users,
        submissions,
        evalRuns,
        completedCount,
        totalProgress: progress.length,
        avgScore,
        scoreDistribution: dist
    });
});

// ── Users ─────────────────────────────────────────────────────────────────────
// GET /api/admin/users
router.get('/admin/users', requireAdmin, async (req, res) => {
    const users = await User.find({}).select('-passwordHash').sort({ createdAt: -1 });
    return res.json(users);
});

// DELETE /api/admin/users/:id
router.delete('/admin/users/:id', requireAdmin, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    await StudentProgress.deleteMany({ studentId: req.params.id });
    return res.json({ success: true, message: 'User and progress deleted.' });
});

// ── Assignments ───────────────────────────────────────────────────────────────
// GET /api/admin/assignments
router.get('/admin/assignments', requireAdmin, async (req, res) => {
    const assignments = await Assignment.find({}).sort({ createdAt: -1 });
    const progressByAssignment = await StudentProgress.aggregate([
        { $group: { _id: '$assignmentId', count: { $sum: 1 }, avgScore: { $avg: '$bestScore' }, completed: { $sum: { $cond: ['$completed', 1, 0] } } } }
    ]);
    const statsMap = Object.fromEntries(progressByAssignment.map(p => [p._id, p]));
    const result = assignments.map(a => ({
        ...a.toObject(),
        stats: statsMap[a._id.toString()] || { count: 0, avgScore: 0, completed: 0 }
    }));
    return res.json(result);
});

// PATCH /api/admin/assignments/:id/toggle — toggle isActive
router.patch('/admin/assignments/:id/toggle', requireAdmin, async (req, res) => {
    const a = await Assignment.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    a.isActive = !a.isActive;
    await a.save();
    return res.json({ _id: a._id, isActive: a.isActive });
});

// DELETE /api/admin/assignments/:id
router.delete('/admin/assignments/:id', requireAdmin, async (req, res) => {
    const submissions = await Submission.find({ assignmentId: req.params.id }).select('submissionId');
    const sids = submissions.map(s => s.submissionId);
    await Promise.all([
        Assignment.findByIdAndDelete(req.params.id),
        Submission.deleteMany({ assignmentId: req.params.id }),
        EvaluationRun.deleteMany({ submissionId: { $in: sids } }),
        StudentProgress.deleteMany({ assignmentId: req.params.id })
    ]);
    return res.json({ success: true });
});

// ── Submissions ────────────────────────────────────────────────────────────────
// GET /api/admin/submissions?assignmentId=&studentId=&limit=50&skip=0
router.get('/admin/submissions', requireAdmin, async (req, res) => {
    const { assignmentId, studentId, limit = 50, skip = 0 } = req.query;
    const filter = {};
    if (assignmentId) filter.assignmentId = assignmentId;
    if (studentId) filter.studentId = studentId;

    const [submissions, total] = await Promise.all([
        Submission.find(filter).sort({ submittedAt: -1 }).skip(Number(skip)).limit(Number(limit)),
        Submission.countDocuments(filter)
    ]);

    const sids = submissions.map(s => s.submissionId);
    const evalRuns = await EvaluationRun.find({ submissionId: { $in: sids } });
    const runMap = Object.fromEntries(evalRuns.map(r => [r.submissionId, r]));

    const userIds = [...new Set(submissions.map(s => s.studentId))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const result = submissions.map(s => ({
        ...s.toObject(),
        evalRun: runMap[s.submissionId] || null,
        studentName: userMap[s.studentId]?.name || 'Unknown',
        studentEmail: userMap[s.studentId]?.email || ''
    }));

    return res.json({ submissions: result, total });
});

// GET /api/admin/submissions/:submissionId — full detail
router.get('/admin/submissions/:submissionId', requireAdmin, async (req, res) => {
    const [submission, evalRun] = await Promise.all([
        Submission.findOne({ submissionId: req.params.submissionId }),
        EvaluationRun.findOne({ submissionId: req.params.submissionId })
    ]);
    if (!submission) return res.status(404).json({ error: 'Not found' });

    const user = await User.findById(submission.studentId).select('name email');
    return res.json({ submission, evalRun: evalRun || null, student: user });
});

// POST /api/admin/submissions/:submissionId/replay — re-queue for evaluation
router.post('/admin/submissions/:submissionId/replay', requireAdmin, async (req, res) => {
    const submission = await Submission.findOne({ submissionId: req.params.submissionId });
    if (!submission) return res.status(404).json({ error: 'Not found' });

    // Reset status and delete old eval run
    submission.status = 'pending';
    await submission.save();
    await EvaluationRun.deleteOne({ submissionId: req.params.submissionId });

    // Re-queue via the same BullMQ queue
    const IORedis = (await import('ioredis')).default;
    const { Queue } = await import('bullmq');
    const connection = new IORedis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: null
    });
    const evalQueue = new Queue('eval', { connection });
    await evalQueue.add('evaluate', {
        submissionId: submission.submissionId,
        assignmentId: submission.assignmentId,
        files: submission.files
    });
    await connection.quit();

    return res.json({ success: true, message: 'Submission re-queued for evaluation.' });
});

// ── Progress ──────────────────────────────────────────────────────────────────
// GET /api/admin/progress?assignmentId=
router.get('/admin/progress', requireAdmin, async (req, res) => {
    const { assignmentId } = req.query;
    const filter = assignmentId ? { assignmentId } : {};
    const records = await StudentProgress.find(filter).sort({ bestScore: -1 });

    const userIds = records.map(r => r.studentId);
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const result = records.map(r => ({
        ...r.toObject(),
        studentName: userMap[r.studentId]?.name || 'Unknown',
        studentEmail: userMap[r.studentId]?.email || ''
    }));
    return res.json(result);
});

// DELETE /api/admin/progress/:id — delete a single progress record
router.delete('/admin/progress/:id', requireAdmin, async (req, res) => {
    await StudentProgress.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
});

export default router;
