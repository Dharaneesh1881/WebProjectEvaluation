import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({}, { strict: false, _id: false });
const fileSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['html', 'css', 'js'], required: true },
  content: { type: String, default: '' },
  isMain: { type: Boolean, default: false }
}, { _id: false });
const pageScreenshotSchema = new mongoose.Schema({
  pageName: { type: String, required: true, trim: true },
  url: { type: String, required: true },
  isMain: { type: Boolean, default: false }
}, { _id: false });

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  createdBy: { type: String, required: true },  // User _id as string

  files: { type: [fileSchema], default: [] },

  evalSpec: {
    domTests: { type: [testSchema], default: [] },
    styleTests: { type: [testSchema], default: [] },
    interactionTests: { type: [testSchema], default: [] },
    functionalityTests: { type: [testSchema], default: [] }
  },

  referenceScreenshotUrl: { type: String, default: null },
  referenceScreenshots: { type: [String], default: [] },  // multi-state screenshots
  referencePageScreenshots: { type: [pageScreenshotSchema], default: [] },
  allowedCdnDomains: { type: [String], default: [] },
  baselineGeneratedAt: { type: Date, default: null },

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Assignment', assignmentSchema);
