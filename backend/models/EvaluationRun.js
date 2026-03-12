import mongoose from 'mongoose';

const testResultSchema = new mongoose.Schema({
  name:   String,
  passed: Boolean,
  weight: Number,
  earned: Number
}, { _id: false });

const bucketSchema = new mongoose.Schema({
  score:    Number,
  maxScore: Number,
  tests:    [testResultSchema]
}, { _id: false });

const visualBucketSchema = new mongoose.Schema({
  score:                  Number,
  maxScore:               Number,
  diffPercent:            Number,
  studentScreenshotUrl:   { type: String, default: null },
  referenceScreenshotUrl: { type: String, default: null },
  diffImageUrl:           { type: String, default: null },
  tests:                  { type: Array, default: [] }
}, { _id: false });

const evaluationRunSchema = new mongoose.Schema({
  submissionId: { type: String, required: true, index: true },
  completedAt:  { type: Date, default: Date.now },
  totalScore:   { type: Number, default: 0 },
  breakdown: {
    html:   bucketSchema,
    css:    bucketSchema,
    js:     bucketSchema,
    visual: visualBucketSchema
  },
  errorLog: { type: String, default: '' }
});

export default mongoose.model('EvaluationRun', evaluationRunSchema);
