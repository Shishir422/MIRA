const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    trim: true,
    default: ''
  },
  content: {
    type: String,
    required: [true, 'Journal content is required']
  },
  date: {
    type: Date,
    default: Date.now
  },
  streakCount: {
    type: Number,
    default: 0
  },
  summary: {
    type: String,
    default: null  // AI generated later
  },
  insights: {
    type: String,
    default: null  // AI generated later
  },
  analysis: {
    type: Object,
    default: null  // AI analysis results (productive, unproductive, rest, etc.)
  },
  analysisStatus: {
    type: String,
    enum: ['pending', 'ready', 'failed'],
    default: null
  },
  analysisAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true  // Automatically adds createdAt and updatedAt
});

module.exports = mongoose.model('Journal', journalSchema);
