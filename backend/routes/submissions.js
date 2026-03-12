import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Submission from '../models/Submission.js';
import EvaluationRun from '../models/EvaluationRun.js';
import Assignment from '../models/Assignment.js';
import { evaluationQueue } from '../queue/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/submissions — student submits code for evaluation
router.post('/submissions', requireAuth, async (req, res) => {
  const { html, css, js, assignmentId } = req.body;

  if (!assignmentId) return res.status(400).json({ error: 'assignmentId is required' });

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const submissionId = uuidv4();

  await Submission.create({
    submissionId,
    assignmentId,
    studentId: req.user.id,
    files: { html: html || '', css: css || '', js: js || '' },
    status: 'pending'
  });

  await evaluationQueue.add('evaluate', { submissionId, assignmentId }, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 3000 }
  });

  return res.status(202).json({ submissionId });
});

// GET /api/result/:id — poll for evaluation result
router.get('/result/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const submission = await Submission.findOne({ submissionId: id });
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  if (submission.status === 'pending' || submission.status === 'processing') {
    return res.status(202).json({ status: submission.status });
  }

  if (submission.status === 'error') {
    return res.status(200).json({ status: 'error', submissionId: id });
  }

  const run = await EvaluationRun.findOne({ submissionId: id });
  return res.status(200).json({ status: 'done', result: run });
});

export default router;
