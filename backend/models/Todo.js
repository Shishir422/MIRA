const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Task text is required'],
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0, // Higher number = higher priority
    min: 0
  },
  dueTime: {
    type: Date,
    default: null // Optional time for the task
  },
  order: {
    type: Number,
    default: 0 // For manual ordering
  }
}, {
  timestamps: true
});

// Index for efficient querying
todoSchema.index({ userId: 1, completed: 1, priority: -1, order: 1 });

module.exports = mongoose.model('Todo', todoSchema);

