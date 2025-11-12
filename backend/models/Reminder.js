const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  journalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Journal',
    default: null
  },
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  eventDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['proposed', 'confirmed', 'synced', 'cancelled', 'completed'],
    default: 'proposed'
  },
  googleCalendarEventId: {
    type: String,
    default: null
  },
  originalSentence: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reminder', reminderSchema);
