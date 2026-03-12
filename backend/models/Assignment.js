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
    domTests:            { type: [testSchema], default: [] },
    styleTests:          { type: [testSchema], default: [] },
    interactionTests:    { type: [testSchema], default: [] },
    functionalityTests:  { type: [testSchema], default: [] }
  },

  referenceScreenshotUrl: { type: String, default: null },
  baselineGeneratedAt:    { type: Date,   default: null },

  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date,    default: Date.now }
});

export default mongoose.model('Assignment', assignmentSchema);
