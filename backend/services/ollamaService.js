// Ollama LLM Service for Local AI Analysis
const ollama = require('ollama').default;

/**
 * Analyze journal content using Ollama (Llama3)
 * @param {string} content - Journal text content
 * @returns {Promise<Object>} - Analysis results with productive/unproductive activities, score, suggestions
 */
async function analyzeJournalWithLlama(content) {
  try {
    const prompt = `You are an expert journal analyzer. Analyze this journal entry and extract meaningful insights.

JOURNAL ENTRY:
${content}

Extract and categorize activities with SEMANTIC UNDERSTANDING, not keyword matching.

Respond with this exact JSON structure:
{
  "productiveActivities": ["clear description of productive task"],
  "unproductiveActivities": ["clear description of time-wasting activity"],
  "restfulActivities": ["clear description of rest/relaxation"],
  "emotionalStates": ["emotion or feeling"],
  "suggestions": ["actionable suggestion"],
  "overallSentiment": "positive/neutral/negative"
}

EXTRACTION GUIDELINES:

1. PRODUCTIVE ACTIVITIES - Understand the MEANING and CONTEXT:
   - Tasks with deadlines, assignments, work obligations
   - Learning, studying, skill development
   - Exercise, health activities, self-improvement
   - Creative work, projects, problem-solving
   - ANY activity that moves toward a goal
   → Extract the COMPLETE task description naturally as mentioned
   → Include what they're doing AND what it's about/for
   → Use their own words and phrasing when possible

2. UNPRODUCTIVE ACTIVITIES - Identify time-wasting patterns:
   - Activities described as "wasting time", "procrastinating"
   - Excessive entertainment consumption mentioned negatively
   - Social media/gaming mentioned as distraction
   - ONLY if clearly framed as unproductive by the user
   → Don't assume - they must indicate it was time poorly spent

3. RESTFUL ACTIVITIES - Recognize intentional rest:
   - Sleep, naps, relaxation
   - Breaks, leisure time framed positively
   - Recreation for mental/physical recovery
   → Only count if framed as deliberate rest, not procrastination

4. EMOTIONAL STATES - Detect feelings from context:
   - Explicit emotion words (happy, stressed, anxious, motivated)
   - Implied emotions from tone and word choice
   - Current mental/emotional state

5. SUGGESTIONS - Provide contextual, personalized advice:
   - Based on their specific situation
   - Actionable and practical
   - Address challenges or optimize their workflow
   - 3-5 specific recommendations

CRITICAL RULES:
- Use SEMANTIC understanding, not keyword matching
- Extract ONLY what's explicitly present in the text
- Make descriptions complete and professional
- Empty array [] if nothing found in a category
- Don't invent or assume activities not mentioned

Respond with ONLY valid JSON, no explanations.`;

    const response = await ollama.chat({
      model: 'llama3',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.15, // Slightly higher for better semantic understanding
      }
    });

    const messageContent = response.message.content.trim();
    
    // Extract JSON from response (handle markdown code blocks if present)
    let jsonString = messageContent;
    if (messageContent.includes('```json')) {
      const match = messageContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1];
    } else if (messageContent.includes('```')) {
      const match = messageContent.match(/```\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1];
    }

    const analysis = JSON.parse(jsonString);

    // Validate and normalize
    return {
      productive: Array.isArray(analysis.productiveActivities) ? analysis.productiveActivities : [],
      unproductive: Array.isArray(analysis.unproductiveActivities) ? analysis.unproductiveActivities : [],
      rest: Array.isArray(analysis.restfulActivities) ? analysis.restfulActivities : [],
      emotional: Array.isArray(analysis.emotionalStates) ? analysis.emotionalStates : [],
      suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
      sentiment: analysis.overallSentiment || 'neutral'
    };

  } catch (error) {
    console.error('Ollama analysis error:', error);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

/**
 * Detect events and tasks from journal using Llama3
 * @param {string} content - Journal text
 * @returns {Promise<Array>} - Detected events with dates
 */
async function detectEventsWithLlama(content) {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const prompt = `You are a calendar event detector. Extract ONLY future events with specific dates/times from this journal.

TODAY'S DATE: ${todayStr}

CRITICAL RULES (MUST FOLLOW):
1. ONLY extract events that are EXPLICITLY MENTIONED in the journal text below
2. DO NOT invent, assume, or hallucinate any events
3. ONLY extract events with SPECIFIC future dates (like "tomorrow", "December 12", "next Monday", "on Friday")
4. IGNORE vague mentions like "I have a test" without a specific date
5. IGNORE past events (things already happened like "I went to", "I had", "I attended")
6. If NO events with specific dates exist in the journal, return an empty array []

JOURNAL TEXT (DO NOT ADD ANYTHING NOT IN THIS TEXT):
${content}

Examples of what to INCLUDE:
- "I have a meeting on December 12 at 3pm" ✓
- "dentist appointment tomorrow at 10am" ✓
- "deadline next Friday" ✓

Examples of what to EXCLUDE:
- "I have a test" (no specific date) ✗
- "the test is on Friday" (too vague) ✗
- "I went to the doctor" (past tense) ✗
- "This is testing for bugs" (no event at all) ✗
- "checking the program" (no event at all) ✗

IMPORTANT: If the journal is just casual writing with NO scheduled events, return []

Respond with ONLY a JSON array:
[
  {
    "title": "Event name (must be from journal text)",
    "date": "YYYY-MM-DD or 'tomorrow' or 'next Monday'",
    "time": "10:00am" or null,
    "type": "meeting/appointment/deadline",
    "context": "EXACT sentence from journal where event was mentioned"
  }
]

Return [] if NO future events found.`;

    const response = await ollama.chat({
      model: 'llama3',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.05, // VERY low temperature to reduce hallucinations
      }
    });

    const messageContent = response.message.content.trim();
    
    // Extract JSON
    let jsonString = messageContent;
    if (messageContent.includes('```json')) {
      const match = messageContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1];
    } else if (messageContent.includes('```')) {
      const match = messageContent.match(/```\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1];
    }

    let events = JSON.parse(jsonString);
    
    // Handle if response is wrapped in an object with "events" key
    if (!Array.isArray(events) && events.events && Array.isArray(events.events)) {
      events = events.events;
    }
    
    if (!Array.isArray(events)) return [];

    // 🛡️ CRITICAL VALIDATION: Filter out hallucinated events
    // Only keep events where the context/title actually appears in the journal
    const contentLower = content.toLowerCase();
    events = events.filter(event => {
      // Check if event title or context appears in the journal
      const titleLower = (event.title || '').toLowerCase();
      const contextLower = (event.context || '').toLowerCase();
      
      // Event is valid if:
      // 1. Title appears in journal, OR
      // 2. Context appears in journal, OR
      // 3. At least 3 words from context appear in journal (partial match)
      if (contentLower.includes(titleLower) || contentLower.includes(contextLower)) {
        return true;
      }
      
      // Partial match: Check if at least 3 words from context are in journal
      const contextWords = contextLower.split(' ').filter(w => w.length > 3);
      const matchingWords = contextWords.filter(word => contentLower.includes(word));
      
      if (matchingWords.length >= 3) {
        return true;
      }
      
      // If no match found, this is likely a hallucination
      console.warn(`🚫 Filtered out hallucinated event: "${event.title}" - not found in journal`);
      return false;
    });

    // Convert relative dates to ISO format for Google Calendar integration
    const now = new Date();
    events = events.map(event => {
      let eventDate = null;

      if (event.date) {
        const dateLower = event.date.toLowerCase();
        
        // Handle relative dates
        if (dateLower === 'tomorrow') {
          eventDate = new Date(now);
          eventDate.setDate(eventDate.getDate() + 1);
        } else if (dateLower === 'today') {
          eventDate = new Date(now);
        } else if (dateLower.includes('next week')) {
          eventDate = new Date(now);
          eventDate.setDate(eventDate.getDate() + 7);
        } else if (dateLower.includes('next friday')) {
          eventDate = new Date(now);
          const currentDay = eventDate.getDay();
          const daysUntilFriday = (5 - currentDay + 7) % 7 || 7; // 5 = Friday
          eventDate.setDate(eventDate.getDate() + daysUntilFriday);
        } else if (dateLower.includes('next monday')) {
          eventDate = new Date(now);
          const currentDay = eventDate.getDay();
          const daysUntilMonday = (1 - currentDay + 7) % 7 || 7;
          eventDate.setDate(eventDate.getDate() + daysUntilMonday);
        } else {
          // Try parsing as ISO date
          const parsed = new Date(event.date);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed;
            // If year is in past (like 2023), update to current/next year
            if (eventDate.getFullYear() < now.getFullYear()) {
              eventDate.setFullYear(now.getFullYear());
              // If date has passed this year, use next year
              if (eventDate < now) {
                eventDate.setFullYear(now.getFullYear() + 1);
              }
            }
          }
        }
      }

      // Set time if provided
      if (eventDate && event.time) {
        let hours = 9;
        let minutes = 0;
        
        const timeStr = event.time.toLowerCase().trim();
        
        // Handle various time formats: "10am", "10:00am", "10:30", "14:00"
        const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const meridiem = timeMatch[3];
          
          // Convert to 24-hour format if AM/PM is specified
          if (meridiem) {
            if (meridiem.toLowerCase() === 'pm' && hours < 12) {
              hours += 12;
            } else if (meridiem.toLowerCase() === 'am' && hours === 12) {
              hours = 0;
            }
          }
          
          if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            eventDate.setHours(hours, minutes, 0, 0);
          } else {
            eventDate.setHours(9, 0, 0, 0); // Default fallback
          }
        } else {
          eventDate.setHours(9, 0, 0, 0); // Default fallback
        }
      } else if (eventDate) {
        // Default to 9 AM if no time specified
        eventDate.setHours(9, 0, 0, 0);
      }

      return {
        title: event.title || 'Untitled Event',
        date: eventDate ? eventDate.toISOString() : null,
        description: event.context || '',
        sentence: event.context || '',
        type: event.type || 'task'
      };
    })
    .filter(event => event.date !== null) // Only return events with valid dates
    .filter(event => {
      // Additional filter: Only keep FUTURE events
      const eventDateTime = new Date(event.date);
      return eventDateTime > now; // Must be in the future
    });

    // 🔍 Final validation log
    if (events.length === 0) {
      console.log('ℹ️ No future events detected in journal');
    } else {
      console.log(`✅ Detected ${events.length} valid event(s):`, events.map(e => e.title));
    }

    return events;

  } catch (error) {
    console.error('Event detection error:', error);
    return []; // Return empty array on failure, don't break the flow
  }
}

/**
 * Generate personalized suggestions using Llama3
 * @param {Object} analysis - Current analysis data
 * @param {string} journalContent - Original journal content
 * @returns {Promise<Array>} - Personalized suggestions
 */
async function generateSuggestionsWithLlama(analysis, journalContent) {
  try {
    const prompt = `Provide 3-5 actionable suggestions for this journal. Respond with ONLY a JSON array.

ANALYSIS:
- Score: ${analysis.productivityScore}/100
- Productive: ${analysis.productive.join(', ')}
- Unproductive: ${analysis.unproductive.join(', ')}
- Emotions: ${analysis.emotional.join(', ')}

Format: ["Suggestion 1", "Suggestion 2", "Suggestion 3"]

Make them specific, empathetic, actionable. No explanations.`;

    const response = await ollama.chat({
      model: 'llama3',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.4,
      }
    });

    const messageContent = response.message.content.trim();
    
    // Extract JSON
    let jsonString = messageContent;
    if (messageContent.includes('```json')) {
      const match = messageContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1];
    } else if (messageContent.includes('```')) {
      const match = messageContent.match(/```\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1];
    }

    const suggestions = JSON.parse(jsonString);
    return Array.isArray(suggestions) ? suggestions : [];

  } catch (error) {
    console.error('Suggestion generation error:', error);
    return [
      'Focus on one task at a time to improve concentration',
      'Consider setting specific time blocks for deep work',
      'Take regular breaks to maintain energy levels'
    ];
  }
}

/**
 * Check if Ollama is running and Llama3 model is available
 * @returns {Promise<boolean>}
 */
async function checkOllamaAvailability() {
  try {
    const response = await ollama.list();
    const hasLlama3 = response.models.some(model => 
      model.name.toLowerCase().includes('llama3')
    );
    return hasLlama3;
  } catch (error) {
    console.error('Ollama check failed:', error.message);
    return false;
  }
}

/**
 * AI Agent: Intelligently decide which reminders to create and how to structure them
 * This is TRUE AGENTIC AI - the AI makes autonomous decisions about reminder creation
 * NOW WITH MEMORY: AI considers user's previous journals and reminders
 * @param {Array} detectedEvents - Events detected from journal
 * @param {string} journalContent - Original journal content for context
 * @param {Object} userHistory - User's previous journals and reminders for context
 * @returns {Promise<Object>} - AI decision with reminders and reasoning
 */
async function createRemindersWithAI(detectedEvents, journalContent, userHistory = {}) {
  try {
    if (!detectedEvents || detectedEvents.length === 0) {
      console.log('ℹ️ No events to analyze for reminder creation');
      return {
        reminders: [],
        aiResponse: 'No events detected in this journal entry.',
        reasoning: 'Event detection found no future commitments or appointments.'
      };
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 AGENTIC AI WITH MEMORY - REMINDER CREATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📥 Input: ${detectedEvents.length} detected events`);
    console.log(`🧠 User Context: ${userHistory.recentJournals?.length || 0} recent journals, ${userHistory.existingReminders?.length || 0} existing reminders`);
    console.log('📋 Events to analyze:', JSON.stringify(detectedEvents.map(e => {
      const eventDate = new Date(e.date);
      const dateOnly = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
      return {
        title: e.title,
        dateOnly: dateOnly,
        fullDate: e.date,
        type: e.type
      };
    }), null, 2));
    console.log('🧠 Sending to Llama3 AI with user history for intelligent decision-making...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Build context from user's history
    const recentJournalsContext = userHistory.recentJournals?.length > 0
      ? `\nRECENT JOURNALS (last ${userHistory.recentJournals.length}):\n` + 
        userHistory.recentJournals.map((j, i) => 
          `${i + 1}. [${new Date(j.date).toLocaleDateString()}] ${j.content.substring(0, 150)}...`
        ).join('\n')
      : '\nNo previous journals available.';

    const existingRemindersContext = userHistory.existingReminders?.length > 0
      ? `\nEXISTING REMINDERS (DO NOT CREATE DUPLICATES!):\n` + 
        userHistory.existingReminders.map((r, i) => {
          const eventDate = new Date(r.eventDate);
          const dateOnly = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD only
          const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          return `${i + 1}. "${r.title}" on ${dateOnly} (${eventDate.toLocaleDateString()}) at ${timeStr} [Status: ${r.status}]`;
        }).join('\n')
      : '\nNo existing reminders.';

    const prompt = `You are an intelligent AI agent managing a user's personal journal and reminders. You have access to their history and must make autonomous decisions about reminder creation.

USER'S HISTORY:
${recentJournalsContext}
${existingRemindersContext}

CURRENT JOURNAL ENTRY:
${journalContent}

DETECTED EVENTS IN THIS ENTRY (with dates for comparison):
${JSON.stringify(detectedEvents.map(e => {
  const eventDate = new Date(e.date);
  const dateOnly = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD for easy comparison
  return {
    title: e.title,
    dateOnly: dateOnly,
    fullDateTime: e.date,
    context: e.sentence,
    type: e.type
  };
}), null, 2)}

YOUR TASK AS AN AGENTIC AI:
1. **CRITICAL FIRST STEP: Check for duplicates** - Compare each detected event with EXISTING REMINDERS
   - Extract date-only (YYYY-MM-DD) from both detected events and existing reminders
   - Compare titles (case-insensitive, semantic similarity)
   - If title is similar AND date (YYYY-MM-DD) matches = DUPLICATE → set shouldCreate: false
   - IGNORE time differences when comparing (9am vs 3pm on same day = SAME EVENT!)
2. Analyze the detected events in context of user's history
3. Understand user's patterns (do they follow through? do they need more structure?)
4. Decide autonomously which events truly need reminders
5. Provide reasoning for your decisions that will be shown to the user

DECISION CRITERIA:
✓ CREATE (shouldCreate: true) if: 
  - Important deadline, appointment, or commitment
  - **NOT already in existing reminders** (check titles and dates carefully!)
  - User historically benefits from such reminders
  
✗ SKIP (shouldCreate: false) if: 
  - **DUPLICATE of existing reminder** (same event title or same date)
  - Casual mention ("maybe", "might", "thinking about")
  - Already passed
  - Too vague or uncertain

DUPLICATE DETECTION RULES (CRITICAL - READ CAREFULLY):
- Compare event titles (case-insensitive, ignore minor wording differences)
- Compare dates ONLY (Year-Month-Day), IGNORE time differences!
- "Client demo" on Nov 25 at 3pm is DUPLICATE of "Client demo" on Nov 25 at 9am (SAME DAY!)
- "Dentist appointment on Nov 19" is DUPLICATE of reminder "Dentist" or "Dentist appointment" on Nov 19
- "Team meeting tomorrow" is DUPLICATE if reminder "Team meeting" or "Standup meeting" exists for tomorrow
- Semantically similar titles on same date = DUPLICATE (e.g., "dentist" and "dental appointment")
- When in doubt about duplicates, set shouldCreate: false

EXAMPLES:
Example 1 - DUPLICATE (same title, same day, different times):
  Detected: "Client demo" on 2025-11-25T09:00:00.000Z (9am)
  Existing: "Client demo" on 2025-11-25T15:00:00.000Z (3pm)
  Decision: shouldCreate: false (DUPLICATE - same title, same DATE, ignore time difference!)
  
Example 2 - DUPLICATE (similar titles, same day):
  Detected: "Dentist" on 2025-11-19T14:00:00.000Z
  Existing: "Dentist appointment" on 2025-11-19T10:00:00.000Z
  Decision: shouldCreate: false (DUPLICATE - same event, same day)
  
Example 3 - NEW EVENT (different event):
  Detected: "Team standup" on 2025-11-15
  Existing: "Dentist appointment" on 2025-11-19
  Decision: shouldCreate: true (Different event)
  
Example 4 - NEW EVENT (same title, different month):
  Detected: "Dentist appointment" on 2025-12-19
  Existing: "Dentist appointment" on 2025-11-19
  Decision: shouldCreate: true (Same title but different month - likely a follow-up)
  
Example 5 - DUPLICATE (semantically similar):
  Detected: "Standup meeting" on 2025-11-15
  Existing: "Team standup" on 2025-11-15
  Decision: shouldCreate: false (DUPLICATE - same type of event, same day)

OUTPUT FORMAT (MUST BE VALID JSON):
{
  "reminders": [
    {
      "title": "Clear event name",
      "description": "Context + what to prepare (reference their history if relevant)",
      "eventDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "shouldCreate": true,
      "priority": "high/medium/low",
      "aiReasoning": "Why this needs a reminder (mention patterns from history if relevant)"
    }
  ],
  "aiResponse": "A friendly message to the user explaining your decisions",
  "reasoning": "Overall reasoning about the reminder creation process"
}

CRITICAL RULES:
1. Return ONLY valid JSON object (no markdown, no explanations outside JSON)
2. Only include reminders where shouldCreate is true
3. Use exact ISO dates from detected events
4. Reference user's history in your reasoning when relevant
5. Be autonomous - make decisions confidently
6. The aiResponse will be shown to the user, so be helpful and clear

Respond with JSON only:`;

    console.log('⏳ Waiting for Llama3 AI to analyze with full context...');
    
    const response = await ollama.chat({
      model: 'llama3',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.3, // Slightly higher for more contextual reasoning
        num_predict: 1500, // More tokens for reasoning
      }
    });

    const messageContent = response.message.content.trim();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 AI RESPONSE RECEIVED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Raw AI output (first 500 chars):', messageContent.substring(0, 500));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Extract JSON - handle markdown code blocks
    let jsonString = messageContent;
    if (messageContent.includes('```json')) {
      const match = messageContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1].trim();
    } else if (messageContent.includes('```')) {
      const match = messageContent.match(/```\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1].trim();
    }

    // Try to parse JSON
    let aiDecision;
    try {
      aiDecision = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('Failed JSON string (first 300 chars):', jsonString.substring(0, 300));
      
      // Fallback: Create basic response with proper structure
      console.log('⚠️ Falling back to basic reminder creation');
      return {
        reminders: detectedEvents.map(event => ({
          title: event.title || 'Untitled Event',
          description: event.description || event.sentence || 'Event from journal',
          eventDate: event.date, // Already in ISO format from detectEventsWithLlama
          originalSentence: event.sentence || '',
          aiMetadata: {
            priority: 'medium',
            reasoning: 'Auto-created due to AI parsing error'
          }
        })),
        aiResponse: `I detected ${detectedEvents.length} event(s) and created reminders. (Note: AI analysis encountered a parsing error, so I created basic reminders.)`,
        reasoning: 'AI parsing encountered an error, created reminders for all detected events as a fallback.',
        approved: detectedEvents.length,
        rejected: 0
      };
    }
    
    // Validate response structure
    if (!aiDecision.reminders || !Array.isArray(aiDecision.reminders)) {
      console.error('❌ AI returned invalid structure:', typeof aiDecision);
      
      // Try to find reminders array in nested structure
      if (aiDecision && typeof aiDecision === 'object') {
        const possibleKeys = ['reminders', 'events', 'items', 'data', 'results'];
        for (const key of possibleKeys) {
          if (Array.isArray(aiDecision[key])) {
            console.log(`✅ Found reminders array under key "${key}"`);
            aiDecision.reminders = aiDecision[key];
            break;
          }
        }
      }
      
      // If still invalid, fallback
      if (!Array.isArray(aiDecision.reminders)) {
        console.log('⚠️ Falling back to basic reminder creation (invalid structure)');
        return {
          reminders: detectedEvents.map(event => ({
            title: event.title || 'Untitled Event',
            description: event.description || event.sentence || 'Event from journal',
            eventDate: event.date, // Already in ISO format from detectEventsWithLlama
            originalSentence: event.sentence || '',
            aiMetadata: {
              priority: 'medium',
              reasoning: 'Auto-created due to AI structure error'
            }
          })),
          aiResponse: `I detected ${detectedEvents.length} event(s) and created reminders. (Note: AI returned invalid structure, so I created basic reminders.)`,
          reasoning: 'AI response structure was invalid, created reminders for all detected events as a fallback.',
          approved: detectedEvents.length,
          rejected: 0
        };
      }
    }

    // Filter: Only keep reminders where AI decided shouldCreate is true
    const approvedReminders = aiDecision.reminders.filter(reminder => reminder.shouldCreate === true);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 AI DECISION COMPLETE (WITH MEMORY)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 AI analyzed: ${detectedEvents.length} events`);
    console.log(`✅ AI approved: ${approvedReminders.length} reminders`);
    console.log(`❌ AI rejected: ${detectedEvents.length - approvedReminders.length} events`);
    console.log(`💬 AI Response to User: "${aiDecision.aiResponse}"`);
    console.log(`🧠 AI Reasoning: "${aiDecision.reasoning}"`);
    
    if (approvedReminders.length > 0) {
      console.log('\n📝 AI-APPROVED REMINDERS (with context):');
      approvedReminders.forEach((reminder, index) => {
        console.log(`\n${index + 1}. "${reminder.title}"`);
        console.log(`   📅 Date: ${reminder.eventDate}`);
        console.log(`   🎯 Priority: ${reminder.priority}`);
        console.log(`   💭 AI Reasoning: ${reminder.aiReasoning}`);
      });
    }

    if (approvedReminders.length === 0) {
      console.log('ℹ️ AI decided NO events need reminders');
      console.log(`   Reason: ${aiDecision.reasoning}`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ AI made autonomous decisions based on user history!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Transform AI reminders into database-ready format
    const remindersForDB = approvedReminders.map(reminder => ({
      title: reminder.title,
      description: reminder.description || '',
      eventDate: new Date(reminder.eventDate),
      originalSentence: reminder.aiReasoning || '',
      aiMetadata: {
        priority: reminder.priority || 'medium',
        reasoning: reminder.aiReasoning,
        preparationNotes: reminder.preparationNotes || reminder.description
      }
    }));

    // Return both reminders AND AI's response/reasoning for frontend
    return {
      reminders: remindersForDB,
      aiResponse: aiDecision.aiResponse || 'I analyzed the events and created reminders based on your history.',
      reasoning: aiDecision.reasoning || 'Created reminders for important commitments.',
      approved: approvedReminders.length,
      rejected: detectedEvents.length - approvedReminders.length
    };

  } catch (error) {
    console.error('❌ AI reminder creation error:', error);
    console.error('Error stack:', error.stack);
    
    // Fallback: Create basic reminders with proper structure
    console.log('⚠️ Error fallback: Creating basic reminders from all detected events');
    return {
      reminders: detectedEvents.map(event => ({
        title: event.title || 'Untitled Event',
        description: event.description || event.sentence || 'Event from journal',
        eventDate: event.date, // Already in ISO format
        originalSentence: event.sentence || '',
        aiMetadata: {
          priority: 'medium',
          reasoning: 'Auto-created due to unexpected AI error'
        }
      })),
      aiResponse: `I encountered an error but created ${detectedEvents.length} reminder(s) for the events I detected.`,
      reasoning: 'Fallback mode due to unexpected AI error.',
      approved: detectedEvents.length,
      rejected: 0
    };
  }
}

module.exports = {
  analyzeJournalWithLlama,
  detectEventsWithLlama,
  generateSuggestionsWithLlama,
  checkOllamaAvailability,
  createRemindersWithAI  // NEW: AI-powered reminder creation
};
