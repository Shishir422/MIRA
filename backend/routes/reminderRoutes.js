const express = require('express');
const router = express.Router();
const {
  proposeReminder,
  confirmReminder,
  getReminders,
  deleteReminder,
  syncToGoogleCalendar,
  toggleComplete
} = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');

// All reminder routes are protected
router.post('/propose', protect, proposeReminder);
router.post('/:id/confirm', protect, confirmReminder);
router.post('/:id/sync-to-calendar', protect, syncToGoogleCalendar);
router.put('/:id/toggle-complete', protect, toggleComplete);
router.get('/', protect, getReminders);
router.delete('/:id', protect, deleteReminder);

module.exports = router;
