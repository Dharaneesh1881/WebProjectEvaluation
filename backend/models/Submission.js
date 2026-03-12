import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  submissionId:  { type: String, required: true, unique: true, index: true },
  assignmentId:  { type: String, required: true, index: true },
  studentId:     { type: String, default: 'anonymous' },
  files: {
    html: { type: String, default: '' },
    css:  { type: String, default: '' },
    js:   { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'done', 'error'],
    default: 'pending'
  },
  submittedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Submission', submissionSchema);
