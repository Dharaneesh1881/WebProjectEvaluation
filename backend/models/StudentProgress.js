import mongoose from 'mongoose';

/**
 * Tracks each student's best result per assignment.
 * - bestScore       : highest totalScore achieved so far (0-100)
 * - bestSubmissionId: the submissionId that achieved bestScore
 * - completed       : true when bestScore >= 50
 * - completedAt     : timestamp of first time score hit >= 50
 * - attempts        : total number of submissions made
 */
const studentProgressSchema = new mongoose.Schema({
    studentId: { type: String, required: true },
    assignmentId: { type: String, required: true },
    bestScore: { type: Number, default: 0 },
    bestSubmissionId: { type: String, default: null },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

// One record per student+assignment pair
studentProgressSchema.index({ studentId: 1, assignmentId: 1 }, { unique: true });

export default mongoose.model('StudentProgress', studentProgressSchema);
