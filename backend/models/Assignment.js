import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({}, { strict: false, _id: false });

const assignmentSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  createdBy:   { type: String, required: true },  // User _id as string

  referenceFiles: {
    html: { type: String, default: '' },
    css:  { type: String, default: '' },
    js:   { type: String, default: '' }
  },

  evalSpec: {
    rubric: {
      html:   { type: Number, default: 30 },
      css:    { type: Number, default: 25 },
      js:     { type: Number, default: 30 },
      visual: { type: Number, default: 15 }
    },
    domTests:         { type: [testSchema], default: [] },
    styleTests:       { type: [testSchema], default: [] },
    interactionTests: { type: [testSchema], default: [] }
  },

  referenceScreenshotUrl: { type: String, default: null },
  baselineGeneratedAt:    { type: Date,   default: null },

  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date,    default: Date.now }
});

export default mongoose.model('Assignment', assignmentSchema);
