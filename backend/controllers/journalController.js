const Journal = require('../models/Journal');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { google } = require('googleapis');
const { 
  analyzeJournalWithLlama, 
  detectEventsWithLlama, 
  checkOllamaAvailability,
  createRemindersWithAI  // NEW: AI-powered reminder creation
} = require('../services/ollamaService');

// Helper function to sync AI-created reminders to Google Calendar
const syncRemindersToCalendar = async (userId, aiReminders) => {
  try {
    const syncResults = [];
    
    // Get user to check if they have Google Calendar connected
    const user = await User.findById(userId);
    const hasCalendar = !!user.googleRefreshToken;

    if (!hasCalendar) {
      console.log('ℹ️ No Google Calendar connected, skipping sync');
      return syncResults;
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

    // Get user's timezone (default to Asia/Kolkata if not set)
    const userTimezone = user.timezone || 'Asia/Kolkata';
    console.log(`🌍 Using timezone: ${userTimezone} for calendar events`);

    for (const reminderData of aiReminders) {
      try {
        const startTime = reminderData.eventDate.toISOString();
        const endTime = new Date(reminderData.eventDate.getTime() + 60 * 60 * 1000).toISOString();
        
        console.log(`📅 Calendar Event: "${reminderData.title}"`);
        console.log(`   Start: ${startTime} (timezone: ${userTimezone})`);
        console.log(`   End: ${endTime} (timezone: ${userTimezone})`);
        
        // Create calendar event
        const calendarEvent = {
          summary: reminderData.title,
          description: reminderData.description || reminderData.aiMetadata?.preparationNotes || 'From MIRA Journal',
          start: {
            dateTime: startTime,
            timeZone: userTimezone,  // Use user's timezone instead of UTC
          },
          end: {
            dateTime: endTime, // 1 hour duration
            timeZone: userTimezone,  // Use user's timezone instead of UTC
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
          resource: calendarEvent,
        });

        syncResults.push({
          title: reminderData.title,
          synced: true,
          calendarEventId: response.data.id,
          calendarLink: response.data.htmlLink
        });

        console.log(`✅ AI reminder synced to calendar: ${reminderData.title}`);
      } catch (syncError) {
        console.error(`Failed to sync "${reminderData.title}" to calendar:`, syncError.message);
        syncResults.push({
          title: reminderData.title,
          synced: false,
          error: syncError.message
        });
      }
    }

    return syncResults;
  } catch (error) {
    console.error('Calendar sync error:', error);
    return [];
  }
};

// @desc    Create new journal entry
// @route   POST /api/journals/create
// @access  Private
const createJournal = async (req, res) => {
  try {
    const { title, content, date, streakCount } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Please provide content',
        data: null
      });
    }

    const journal = await Journal.create({
      userId: req.userId,
      title: title || '',
      content,
      date: date || Date.now(),
      streakCount: streakCount || 0
    });

    res.status(201).json({
      success: true,
      message: 'Journal created successfully',
      data: journal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
};

// @desc    Get all journals
// @route   GET /api/journals
// @access  Private
const getJournals = async (req, res) => {
  try {
    // Sort by createdAt ascending (oldest first) so we can number them properly
    const journals = await Journal.find({ userId: req.userId }).sort({ createdAt: 1 });
    
    // Add sequential numbers to each journal
    const journalsWithNumbers = journals.map((journal, index) => ({
      ...journal.toObject(),
      journalNumber: index + 1
    }));
    
    res.json({ success: true, message: 'Journals retrieved successfully', data: journalsWithNumbers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
};

// @desc    Get one journal
// @route   GET /api/journals/:id
// @access  Private
const getJournalById = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);
    if (!journal) return res.status(404).json({ success: false, message: 'Journal not found', data: null });

    if (journal.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized', data: null });
    }

    res.json({ success: true, message: 'Journal retrieved', data: journal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
};

// @desc    Update journal
// @route   PUT /api/journals/:id
// @access  Private
const updateJournal = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);
    if (!journal) return res.status(404).json({ success: false, message: 'Journal not found', data: null });

    if (journal.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized', data: null });
    }

    const { title, content, date, streakCount, summary, insights } = req.body;

    journal.title = title ?? journal.title;
    journal.content = content ?? journal.content;
    journal.date = date ?? journal.date;
    journal.streakCount = streakCount ?? journal.streakCount;
    journal.summary = summary ?? journal.summary;
    journal.insights = insights ?? journal.insights;

    const updatedJournal = await journal.save();
    res.json({ success: true, message: 'Journal updated successfully', data: updatedJournal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
};

// @desc    Delete journal
// @route   DELETE /api/journals/:id
// @access  Private
const deleteJournal = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);
    if (!journal) return res.status(404).json({ success: false, message: 'Journal not found', data: null });

    if (journal.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized', data: null });
    }

    await journal.deleteOne();
    res.json({ success: true, message: 'Journal deleted', data: null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
};

// @desc    Analyze journal using Ollama (Llama3)
// @route   POST /api/journals/:id/analyze
// @access  Private
const analyzeJournal = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);
    if (!journal) return res.status(404).json({ success: false, message: "Journal not found", data: null });

    if (journal.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized", data: null });
    }

    const content = journal.content;

    // Check if Ollama is available
    const ollamaAvailable = await checkOllamaAvailability();
    
    if (!ollamaAvailable) {
      return res.status(503).json({ 
        success: false, 
        message: "Ollama service not available. Please ensure Ollama is running and llama3 model is installed.",
        data: null 
      });
    }

    // ⚡ SPEED OPTIMIZATION: Run AI analysis, event detection, AND history fetch in parallel
    // This maximizes efficiency and cuts analysis time significantly!
    console.log('📚 Fetching user history and running AI analysis in parallel...');
    
    const [aiAnalysis, detectedEvents, recentJournals, existingReminders] = await Promise.all([
      analyzeJournalWithLlama(content),
      detectEventsWithLlama(content),
      Journal.find({ 
          userId: req.userId,
          _id: { $ne: req.params.id } // Exclude current journal from history
        })
        .sort({ date: -1 })
        .limit(5)
        .select('content date')
        .catch(err => {
          console.error('Failed to fetch recent journals:', err.message);
          return []; // Graceful fallback
        }),
      Reminder.find({ 
          userId: req.userId
          // INCLUDE reminders from current journal to prevent duplicates on re-analysis
        })
        .sort({ eventDate: -1 })
        .limit(20) // Increased limit to catch more potential duplicates
        .select('title eventDate status journalId')
        .catch(err => {
          console.error('Failed to fetch existing reminders:', err.message);
          return []; // Graceful fallback
        })
    ]);

    console.log(`📖 Loaded ${recentJournals.length} recent journals and ${existingReminders.length} existing reminders`);

    // 🤖 AGENTIC AI: Let AI intelligently decide which reminders to create
    let createdReminders = [];
    let syncResults = [];
    let aiAgentResponse = null;
    
    if (detectedEvents && detectedEvents.length > 0) {
      console.log(`🤖 AI Agent: Detected ${detectedEvents.length} potential events`);
      
      // Build user history context
      const userHistory = {
        recentJournals: recentJournals || [],
        existingReminders: existingReminders || []
      };
      
      // NEW: AI makes intelligent decisions WITH MEMORY
      const aiDecision = await createRemindersWithAI(detectedEvents, content, userHistory);
      const aiReminders = aiDecision.reminders || [];
      aiAgentResponse = {
        message: aiDecision.aiResponse,
        reasoning: aiDecision.reasoning,
        approved: aiDecision.approved,
        rejected: aiDecision.rejected
      };
      
      console.log(`🤖 AI Agent Decision: Approved ${aiReminders.length} reminders`);
      console.log(`💬 AI Says: "${aiDecision.aiResponse}"`);
      
      if (aiReminders.length > 0) {
        // Save AI-approved reminders to database
        for (const reminderData of aiReminders) {
          try {
            // 🛡️ VALIDATION: Ensure eventDate is valid before creating reminder
            const eventDate = new Date(reminderData.eventDate);
            
            // Check if date is valid and in the future
            if (isNaN(eventDate.getTime())) {
              console.error(`⚠️ Invalid date for reminder "${reminderData.title}": ${reminderData.eventDate}`);
              continue; // Skip this reminder
            }
            
            const now = new Date();
            if (eventDate < now) {
              console.warn(`⏰ Event date in the past for "${reminderData.title}", skipping`);
              continue; // Skip past events
            }
            
            const reminder = await Reminder.create({
              userId: req.userId,
              journalId: req.params.id,
              title: reminderData.title || 'Untitled Reminder',
              description: reminderData.description || '',
              eventDate: eventDate,
              originalSentence: reminderData.originalSentence || reminderData.aiMetadata?.reasoning || '',
              status: 'confirmed' // AI auto-confirms
            });
            
            createdReminders.push(reminder);
            console.log(`✅ AI-created reminder: ${reminder.title}`);
          } catch (dbError) {
            console.error(`Failed to save AI reminder "${reminderData.title}":`, dbError.message);
          }
        }
        
        // Sync AI-created reminders to Google Calendar
        syncResults = await syncRemindersToCalendar(req.userId, aiReminders);
        
        // Update reminder status for successfully synced items
        for (const syncResult of syncResults) {
          if (syncResult.synced && syncResult.calendarEventId) {
            const reminder = createdReminders.find(r => r.title === syncResult.title);
            if (reminder) {
              reminder.googleCalendarEventId = syncResult.calendarEventId;
              reminder.status = 'synced';
              await reminder.save();
            }
          }
        }
      }
    } else if (detectedEvents && detectedEvents.length === 0) {
      // No events detected - still provide AI response
      aiAgentResponse = {
        message: 'No upcoming events or appointments detected in this journal.',
        reasoning: 'Event detection found no future commitments.',
        approved: 0,
        rejected: 0
      };
      console.log('ℹ️ No events detected - AI response set to inform user');
    }

    // Combine analysis with detected events
    const analysis = {
      productive: aiAnalysis.productive,
      unproductive: aiAnalysis.unproductive,
      rest: aiAnalysis.rest,
      emotional: aiAnalysis.emotional,
      suggestions: aiAnalysis.suggestions,
      sentiment: aiAnalysis.sentiment,
      detectedEvents: detectedEvents,
      aiRemindersCreated: createdReminders.length, // AI-approved and created
      autoSyncedToCalendar: syncResults.filter(r => r.synced).length, // Count synced
      aiDecisionMaking: true, // Flag indicating AI made autonomous decisions
      aiAgentResponse: aiAgentResponse // AI's response to user about reminder decisions
    };

    // Save analysis to journal
    journal.analysis = analysis;
    journal.analysisStatus = "ready";
    journal.analysisAt = Date.now();
    await journal.save();

    // Enhanced success message with AI response
    let message = "Journal analyzed successfully with AI";
    if (createdReminders.length > 0) {
      const syncedCount = syncResults.filter(r => r.synced).length;
      if (syncedCount > 0) {
        message += ` • AI created ${createdReminders.length} reminder(s) • ${syncedCount} synced to Google Calendar`;
      } else {
        message += ` • AI created ${createdReminders.length} reminder(s)`;
      }
    }
    
    // Add AI's message to user
    if (aiAgentResponse && aiAgentResponse.message) {
      message += ` • AI: "${aiAgentResponse.message}"`;
    }

    return res.json({ 
      success: true, 
      message: message, 
      data: analysis 
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Analysis failed: ${error.message}`, 
      data: null 
    });
  }
};

module.exports = {
  createJournal,
  getJournals,
  getJournalById,
  updateJournal,
  deleteJournal,
  analyzeJournal
};
