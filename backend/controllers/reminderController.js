const Reminder = require('../models/Reminder');
const { google } = require('googleapis');

// @desc    Propose a reminder from detected event
// @route   POST /api/reminders/propose
// @access  Private
const proposeReminder = async (req, res) => {
  try {
    const { journalId, eventTitle, eventDate, description, originalSentence } = req.body;

    if (!eventTitle || !eventDate) {
      return res.status(400).json({
        success: false,
        message: 'Event title and date are required',
        data: null
      });
    }

    const reminder = await Reminder.create({
      userId: req.userId,
      journalId: journalId || null,
      title: eventTitle,
      description: description || '',
      eventDate: new Date(eventDate),
      originalSentence: originalSentence || '',
      status: 'proposed'
    });

    res.status(201).json({
      success: true,
      message: 'Reminder proposed successfully',
      data: reminder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
};

// @desc    Confirm a reminder (user approved)
// @route   POST /api/reminders/:id/confirm
// @access  Private
const confirmReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
        data: null
      });
    }

    if (reminder.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
        data: null
      });
    }

    reminder.status = 'confirmed';
    await reminder.save();

    res.json({
      success: true,
      message: 'Reminder confirmed successfully',
      data: reminder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
};

// @desc    Get all reminders for user
// @route   GET /api/reminders
// @access  Private
const getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.userId })
      .populate('journalId', 'title date')
      .sort({ eventDate: 1 });

    res.json({
      success: true,
      message: 'Reminders retrieved successfully',
      data: reminders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
};

// @desc    Delete a reminder
// @route   DELETE /api/reminders/:id
// @access  Private
const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
        data: null
      });
    }

    if (reminder.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
        data: null
      });
    }

    await reminder.deleteOne();

    res.json({
      success: true,
      message: 'Reminder deleted successfully',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
};

// @desc    Sync reminder to Google Calendar
// @route   POST /api/reminders/:id/sync-to-calendar
// @access  Private
const syncToGoogleCalendar = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
        data: null
      });
    }

    if (reminder.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
        data: null
      });
    }

    // Check if user has connected Google Calendar
    const User = require('../models/User');
    const user = await User.findById(req.userId);

    if (!user.googleRefreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Please connect your Google Calendar first',
        data: {
          needsAuth: true,
          authUrl: '/api/calendar/auth'
        }
      });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: user.googleRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create calendar event
    const event = {
      summary: reminder.title,
      description: reminder.description || `From MIRA Journal\n${reminder.originalSentence}`,
      start: {
        dateTime: reminder.eventDate.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(reminder.eventDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    // Update reminder with Google Calendar event ID
    reminder.googleCalendarEventId = response.data.id;
    reminder.status = 'synced';
    await reminder.save();

    res.json({
      success: true,
      message: 'Reminder synced to Google Calendar successfully',
      data: {
        reminder,
        calendarEventLink: response.data.htmlLink
      }
    });
  } catch (error) {
    console.error('Google Calendar sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync to Google Calendar',
      data: null
    });
  }
};

// @desc    Toggle completion status of a reminder
// @route   PUT /api/reminders/:id/toggle-complete
// @access  Private
const toggleComplete = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
        data: null
      });
    }

    if (reminder.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
        data: null
      });
    }

    // Toggle between completed and confirmed/synced
    if (reminder.status === 'completed') {
      // If it was synced before, restore to synced, otherwise to confirmed
      reminder.status = reminder.googleCalendarEventId ? 'synced' : 'confirmed';
    } else {
      // Mark as completed
      reminder.status = 'completed';
    }

    await reminder.save();

    res.json({
      success: true,
      message: reminder.status === 'completed' 
        ? 'Event marked as completed' 
        : 'Event marked as not completed',
      data: reminder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
};

module.exports = {
  proposeReminder,
  confirmReminder,
  getReminders,
  deleteReminder,
  syncToGoogleCalendar,
  toggleComplete
};
