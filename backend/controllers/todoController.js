const Todo = require('../models/Todo');
const ollama = require('ollama').default;

// @desc    Get all todos for user
// @route   GET /api/todos
// @access  Private
const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.userId })
      .sort({ completed: 1, priority: -1, order: -1, dueTime: 1 });

    res.json({
      success: true,
      message: 'Todos retrieved successfully',
      data: todos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
};

// @desc    Create a new todo
// @route   POST /api/todos
// @access  Private
const createTodo = async (req, res) => {
  try {
    const { text, dueTime, priority } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Task text is required',
        data: null
      });
    }

    // Get the highest order value to add new todo at the end
    const maxOrderTodo = await Todo.findOne({ userId: req.userId })
      .sort({ order: -1 });
    const newOrder = maxOrderTodo ? maxOrderTodo.order + 1 : 0;

    const todo = await Todo.create({
      userId: req.userId,
      text: text.trim(),
      dueTime: dueTime ? new Date(dueTime) : null,
      priority: priority || 0,
      order: newOrder,
      completed: false
    });

    res.status(201).json({
      success: true,
      message: 'Todo created successfully',
      data: todo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
};

// @desc    Update a todo
// @route   PUT /api/todos/:id
// @access  Private
const updateTodo = async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found',
        data: null
      });
    }

    if (todo.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
        data: null
      });
    }

    const { text, completed, priority, dueTime, order } = req.body;

    if (text !== undefined) todo.text = text.trim();
    if (completed !== undefined) {
      todo.completed = completed;
      // If marking as completed, move to end by setting high order
      if (completed) {
        const maxOrderTodo = await Todo.findOne({ userId: req.userId })
          .sort({ order: -1 });
        todo.order = maxOrderTodo ? maxOrderTodo.order + 1 : 0;
      }
    }
    if (priority !== undefined) todo.priority = priority;
    if (dueTime !== undefined) todo.dueTime = dueTime ? new Date(dueTime) : null;
    if (order !== undefined) todo.order = order;

    await todo.save();

    res.json({
      success: true,
      message: 'Todo updated successfully',
      data: todo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
};

// @desc    Delete a todo
// @route   DELETE /api/todos/:id
// @access  Private
const deleteTodo = async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found',
        data: null
      });
    }

    if (todo.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
        data: null
      });
    }

    await todo.deleteOne();

    res.json({
      success: true,
      message: 'Todo deleted successfully',
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

// @desc    Reorder todos
// @route   POST /api/todos/reorder
// @access  Private
const reorderTodos = async (req, res) => {
  try {
    const { todoIds } = req.body; // Array of todo IDs in new order

    if (!Array.isArray(todoIds)) {
      return res.status(400).json({
        success: false,
        message: 'todoIds must be an array',
        data: null
      });
    }

    // Update order for each todo
    const updatePromises = todoIds.map((todoId, index) => {
      return Todo.findOneAndUpdate(
        { _id: todoId, userId: req.userId },
        { order: todoIds.length - index }, // Higher order = appears first
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    const todos = await Todo.find({ userId: req.userId })
      .sort({ completed: 1, priority: -1, order: -1, dueTime: 1 });

    res.json({
      success: true,
      message: 'Todos reordered successfully',
      data: todos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
};

// @desc    Prioritize todos using AI
// @route   POST /api/todos/prioritize-ai
// @access  Private
const prioritizeTodosWithAI = async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.userId, completed: false })
      .sort({ order: -1 });

    if (todos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No incomplete todos to prioritize',
        data: null
      });
    }

    // Get current date and time from server (real-time)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Format current date in multiple ways for clarity
    const currentDateISO = now.toISOString();
    const currentDateStr = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    // Also provide in simple format
    const currentDateSimple = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

    // Build prompt for AI with clear date calculations - showing YEAR prominently
    const todosList = todos.map((todo, index) => {
      let timeStr = '';
      let statusStr = '';
      let yearComparison = '';
      
      if (todo.dueTime) {
        const dueDate = new Date(todo.dueTime);
        const dueYear = dueDate.getFullYear();
        const dueMonth = dueDate.getMonth() + 1;
        const dueDay = dueDate.getDate();
        
        // Format date with YEAR prominently
        const dueDateFormatted = `${dueMonth}/${dueDay}/${dueYear}`;
        const dueDateFull = `${dueMonth}/${dueDay}/${dueYear} at ${dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        
        // Calculate time difference
        const timeDiff = dueDate - now;
        const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
        const daysUntil = Math.floor(hoursUntil / 24);
        const hoursRemaining = hoursUntil % 24;
        
        // Determine if overdue - YEAR comparison is critical
        const isOverdue = timeDiff < 0;
        const isPastYear = dueYear < currentYear;
        const isPastMonth = dueYear === currentYear && dueMonth < currentMonth;
        const isPastDay = dueYear === currentYear && dueMonth === currentMonth && dueDay < currentDay;
        const isToday = dueYear === currentYear && dueMonth === currentMonth && dueDay === currentDay;
        
        // YEAR COMPARISON - Make it very explicit
        if (isPastYear) {
          const yearsOverdue = currentYear - dueYear;
          yearComparison = ` [YEAR: ${dueYear} vs CURRENT YEAR: ${currentYear} - ${yearsOverdue} YEAR${yearsOverdue > 1 ? 'S' : ''} OVERDUE!]`;
          statusStr = ` [STATUS: OVERDUE - Task is from ${yearsOverdue} year${yearsOverdue > 1 ? 's' : ''} ago!]`;
          const daysOverdue = Math.abs(daysUntil);
          timeStr = ` (Due Date: ${dueDateFull} - OVERDUE by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''})`;
        } else if (isPastMonth || isPastDay || isOverdue) {
          statusStr = ' [STATUS: OVERDUE - This task is past its due date!]';
          const daysOverdue = Math.abs(daysUntil);
          timeStr = ` (Due Date: ${dueDateFull} - OVERDUE by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''})`;
          yearComparison = ` [YEAR: ${dueYear} vs CURRENT YEAR: ${currentYear} - Same year but date has passed]`;
        } else if (isToday) {
          statusStr = ' [STATUS: DUE TODAY - High priority!]';
          if (hoursUntil > 0) {
            timeStr = ` (Due Date: ${dueDateFull} - ${hoursUntil} hour${hoursUntil > 1 ? 's' : ''} from now - DUE TODAY)`;
          } else {
            timeStr = ` (Due Date: ${dueDateFull} - DUE TODAY, very soon!)`;
          }
          yearComparison = ` [YEAR: ${dueYear} = CURRENT YEAR: ${currentYear} - Due today]`;
        } else if (daysUntil === 1) {
          statusStr = ' [STATUS: DUE TOMORROW - High priority!]';
          timeStr = ` (Due Date: ${dueDateFull} - TOMORROW, ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} away)`;
          yearComparison = ` [YEAR: ${dueYear} = CURRENT YEAR: ${currentYear} - Due tomorrow]`;
        } else if (daysUntil <= 7) {
          statusStr = ' [STATUS: DUE THIS WEEK - Medium-High priority]';
          timeStr = ` (Due Date: ${dueDateFull} - ${daysUntil} day${daysUntil > 1 ? 's' : ''} from now)`;
          yearComparison = ` [YEAR: ${dueYear} = CURRENT YEAR: ${currentYear} - Due this week]`;
        } else {
          statusStr = ' [STATUS: FUTURE - Lower priority]';
          timeStr = ` (Due Date: ${dueDateFull} - ${daysUntil} day${daysUntil > 1 ? 's' : ''} from now)`;
          yearComparison = ` [YEAR: ${dueYear} = CURRENT YEAR: ${currentYear} - Future date]`;
        }
      } else {
        statusStr = ' [STATUS: NO DEADLINE - Lower priority]';
        yearComparison = ' [NO DATE - No year to compare]';
      }
      
      return `${index + 1}. ${todo.text}${timeStr}${yearComparison}${statusStr}`;
    }).join('\n');

    const prompt = `You are a productivity assistant. Analyze these tasks and prioritize them from highest to lowest priority.

⚠️⚠️⚠️ CRITICAL: TODAY'S DATE (REAL-TIME FROM SERVER) ⚠️⚠️⚠️
CURRENT YEAR: ${currentYear}
CURRENT DATE: ${currentDateStr}
CURRENT DATE (ISO): ${currentDateISO}
CURRENT DATE (Simple): ${currentDateSimple}
CURRENT TIME: ${currentHour}:${String(currentMinute).padStart(2, '0')}

🚨 YEAR COMPARISON RULES (VERY IMPORTANT):
- We are currently in the year ${currentYear}
- ANY task with a date from ${currentYear - 1} (${currentYear - 1}) or earlier is OVERDUE
- ANY task with a date from 2023 is OVERDUE (we are in ${currentYear}, which is ${currentYear - 2023} years later)
- ANY task with a date from 2022 is OVERDUE
- ANY task with a date from 2021 is OVERDUE
- ONLY tasks dated ${currentDateSimple} or later are NOT overdue

EXAMPLES:
- If a task says "Nov 12, 2023" and today is ${currentDateSimple}, that task is OVERDUE (2023 < ${currentYear})
- If a task says "Nov 13, 2023" and today is ${currentDateSimple}, that task is OVERDUE (2023 < ${currentYear})
- If a task says "${currentDateSimple}" or later, it is NOT overdue

⚠️ ANY DATE FROM 2023 OR EARLIER = OVERDUE (HIGHEST PRIORITY) ⚠️

TASKS (${todos.length} total):
${todosList}

PRIORITIZATION RULES:
1. OVERDUE tasks = HIGHEST priority (must be done first)
2. Tasks due today = HIGH priority
3. Tasks due soon (within 24 hours) = MEDIUM-HIGH priority
4. Tasks with no deadline = Lower priority (but still important)
5. Consider dependencies (if task A must be done before task B, prioritize A)

IMPORTANT: Use the current date and time (${currentDateStr}) to calculate urgency.

OUTPUT FORMAT:
You MUST respond with ONLY a JSON array containing exactly ${todos.length} numbers.
The numbers must be the task numbers (1, 2, 3, etc.) in priority order.
Highest priority task first, lowest priority task last.

Example with 4 tasks:
If tasks are: 1="Urgent", 2="Later", 3="Today", 4="Tomorrow"
And current date shows task 3 is due today and task 1 is overdue:
Correct response: [1, 3, 4, 2]

CRITICAL: 
- Return ONLY the array: [1, 3, 2, 4]
- Do NOT include any text before or after
- Do NOT include explanations
- The array must contain exactly ${todos.length} numbers
- Each number must be between 1 and ${todos.length}
- Each number must appear exactly once

Your response (JSON array only):`;

    const response = await ollama.chat({
      model: 'llama3',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1 // Lower temperature for more consistent output
      }
    });

    let jsonString = response.message.content.trim();
    console.log('Raw AI response:', jsonString.substring(0, 200));
    
    // Extract JSON from response (handle markdown code blocks if present)
    if (jsonString.includes('```json')) {
      const match = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1].trim();
    } else if (jsonString.includes('```')) {
      const match = jsonString.match(/```\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1].trim();
    }

    // Try to parse JSON
    let priorityOrder;
    try {
      const parsed = JSON.parse(jsonString);
      
      // Handle if response is wrapped in an object
      if (Array.isArray(parsed)) {
        priorityOrder = parsed;
      } else if (parsed.priorityOrder && Array.isArray(parsed.priorityOrder)) {
        priorityOrder = parsed.priorityOrder;
      } else if (parsed.order && Array.isArray(parsed.order)) {
        priorityOrder = parsed.order;
      } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
        priorityOrder = parsed.tasks;
      } else {
        // Try to extract numbers from text if JSON parsing succeeded but structure is wrong
        const numbers = jsonString.match(/\d+/g);
        if (numbers && numbers.length === todos.length) {
          priorityOrder = numbers.map(n => parseInt(n));
        } else {
          throw new Error('No valid array found in response');
        }
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('Failed JSON string:', jsonString);
      
      // Try to extract numbers from text as fallback
      const numbers = jsonString.match(/\d+/g);
      if (numbers && numbers.length === todos.length) {
        priorityOrder = numbers.map(n => parseInt(n));
      } else {
        return res.status(500).json({
          success: false,
          message: `AI response parsing failed: ${parseError.message}. Response: ${jsonString.substring(0, 200)}`,
          data: null
        });
      }
    }

    // Validate the response
    if (!Array.isArray(priorityOrder)) {
      return res.status(500).json({
        success: false,
        message: `AI returned non-array response. Got: ${typeof priorityOrder}. Response: ${JSON.stringify(priorityOrder).substring(0, 200)}`,
        data: null
      });
    }

    if (priorityOrder.length !== todos.length) {
      return res.status(500).json({
        success: false,
        message: `AI returned array with wrong length. Expected ${todos.length} tasks, got ${priorityOrder.length}. Response: ${JSON.stringify(priorityOrder)}`,
        data: null
      });
    }

    // Validate that all numbers are valid task indices
    const validIndices = priorityOrder.every(num => 
      typeof num === 'number' && num >= 1 && num <= todos.length
    );
    
    if (!validIndices) {
      return res.status(500).json({
        success: false,
        message: `AI returned invalid task numbers. Expected numbers 1-${todos.length}, got: ${JSON.stringify(priorityOrder)}`,
        data: null
      });
    }

    // Update todos with new priority order
    const updatePromises = priorityOrder.map((taskNum, index) => {
      const todoIndex = taskNum - 1; // Convert to 0-based index
      if (todoIndex >= 0 && todoIndex < todos.length) {
        const todo = todos[todoIndex];
        return Todo.findByIdAndUpdate(
          todo._id,
          { 
            priority: todos.length - index, // Higher priority number = higher priority
            order: todos.length - index
          },
          { new: true }
        );
      }
    });

    await Promise.all(updatePromises.filter(Boolean));

    const updatedTodos = await Todo.find({ userId: req.userId })
      .sort({ completed: 1, priority: -1, order: -1, dueTime: 1 });

    res.json({
      success: true,
      message: 'Todos prioritized successfully',
      data: updatedTodos
    });
  } catch (error) {
    console.error('AI prioritization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to prioritize todos: ' + error.message,
      data: null
    });
  }
};

// @desc    Chat with AI to add todos
// @route   POST /api/todos/chat
// @access  Private
const chatWithAIForTodos = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
        data: null
      });
    }

    // Get existing todos for context
    const existingTodos = await Todo.find({ userId: req.userId, completed: false })
      .sort({ priority: -1, order: -1 })
      .limit(10);

    const todosContext = existingTodos.length > 0
      ? existingTodos.map(t => `- ${t.text}`).join('\n')
      : 'No existing todos.';

    // Get current date for context
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentDateStr = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
    const currentDateISO = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const prompt = `You are a helpful todo list assistant. The user wants to add tasks to their todo list.

⚠️ CRITICAL: CURRENT DATE CONTEXT ⚠️
CURRENT YEAR: ${currentYear}
CURRENT DATE: ${currentDateStr}
CURRENT DATE (ISO): ${currentDateISO}
TODAY: ${now.toLocaleDateString('en-US', { weekday: 'long' })}

EXISTING TODOS:
${todosContext}

USER MESSAGE:
${message.trim()}

ABBREVIATION GUIDE (IMPORTANT - Understand these):
- "tom" or "tomorrow" = next day from current date
- "mon" or "monday" = next Monday from current date
- "tue" or "tuesday" = next Tuesday from current date
- "wed" or "wednesday" = next Wednesday from current date
- "thu" or "thursday" = next Thursday from current date
- "fri" or "friday" = next Friday from current date
- "sat" or "saturday" = next Saturday from current date
- "sun" or "sunday" = next Sunday from current date
- "next week" = 7 days from current date
- "next month" = same day next month

DATE CALCULATION EXAMPLES:
- If today is ${currentDateStr} and user says "tom" or "tomorrow", calculate: ${new Date(now.getTime() + 24*60*60*1000).toISOString().split('T')[0]}
- If today is ${currentDateStr} and user says "mon" or "monday", find the next Monday
- Always use year ${currentYear} unless explicitly stated otherwise

Your task:
1. Extract tasks from the user's message
2. Understand abbreviations (tom=tomorrow, mon=monday, etc.)
3. Convert relative dates to absolute dates using CURRENT DATE: ${currentDateStr}
4. If the user is asking a question or chatting, provide a helpful response
5. If the user wants to add tasks, extract them and return in JSON format

Respond with JSON in this format:
{
  "response": "Your helpful response to the user",
  "tasks": [
    {
      "text": "Task description",
      "dueTime": "2025-11-15T10:00:00Z" or null,
      "priority": 5
    }
  ]
}

Rules:
- Extract ALL tasks mentioned in the message
- Understand abbreviations: "tom" = tomorrow, "mon" = Monday, etc.
- Convert relative dates to ISO format using CURRENT DATE: ${currentDateStr}
- If user says "tom" or "tomorrow", use date: ${new Date(now.getTime() + 24*60*60*1000).toISOString().split('T')[0]}
- If user mentions time/deadline, include it in dueTime (ISO format: YYYY-MM-DDTHH:mm:ssZ)
- Set priority (0-100, higher = more important) based on urgency:
  * Overdue or due today = 90-100
  * Due tomorrow = 80-89
  * Due this week = 70-79
  * Future = 50-69
  * No deadline = 30-49
- If no tasks to add, return empty tasks array
- Always provide a friendly response
- Use CURRENT YEAR ${currentYear} for all dates

Return ONLY valid JSON, no markdown, no explanations.`;

    const aiResponse = await ollama.chat({
      model: 'llama3',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.3
      }
    });

    let jsonString = aiResponse.message.content.trim();
    if (jsonString.includes('```json')) {
      const match = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1].trim();
    } else if (jsonString.includes('```')) {
      const match = jsonString.match(/```\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1].trim();
    }

    const aiResult = JSON.parse(jsonString);

    // Create todos if any were extracted
    const createdTodos = [];
    if (aiResult.tasks && Array.isArray(aiResult.tasks) && aiResult.tasks.length > 0) {
      // Get current date for priority calculation
      const now = new Date();
      const currentYear = now.getFullYear();

      for (const task of aiResult.tasks) {
        let calculatedPriority = task.priority || 0;
        let parsedDueTime = null;
        
        // Check task text for abbreviations and parse them
        const textLower = task.text.toLowerCase();
        let hasAbbreviation = false;
        
        // Parse abbreviations from task text if dueTime not provided or needs fixing
        // Check for "tom" as abbreviation for tomorrow (not as a name)
        if (!task.dueTime || (typeof task.dueTime === 'string' && task.dueTime.toLowerCase().includes('tom'))) {
          // More specific patterns for "tom" = tomorrow
          // Look for: "exam tom", "tom exam", "tom lab", "lab tom", "tomorrow", "tom ", " tom", "tom."
          const tomPatterns = [
            /\bexam\s+tom\b/i,      // "exam tom"
            /\btom\s+exam\b/i,       // "tom exam"
            /\btom\s+lab\b/i,        // "tom lab"
            /\blab\s+tom\b/i,        // "lab tom"
            /\btom\s+test\b/i,       // "tom test"
            /\btest\s+tom\b/i,       // "test tom"
            /\btom\s+meeting\b/i,    // "tom meeting"
            /\bmeeting\s+tom\b/i,    // "meeting tom"
            /\btom\s+deadline\b/i,   // "tom deadline"
            /\bdeadline\s+tom\b/i,   // "deadline tom"
            /\btom\s+assignment\b/i, // "tom assignment"
            /\bassignment\s+tom\b/i, // "assignment tom"
            /\btom\s+project\b/i,    // "tom project"
            /\bproject\s+tom\b/i,    // "project tom"
            /\btom\s+presentation\b/i, // "tom presentation"
            /\bpresentation\s+tom\b/i, // "presentation tom"
            /\btom\s+due\b/i,        // "tom due"
            /\bdue\s+tom\b/i,        // "due tom"
            /\btom\s*$/i,            // ends with "tom"
            /^\s*tom\s+/i,           // starts with "tom "
            /\s+tom\s+/i,            // " tom " (standalone word)
            /\s+tom\./i,             // " tom."
            /\btomorrow\b/i          // "tomorrow" (full word)
          ];
          
          const hasTomAbbreviation = tomPatterns.some(pattern => pattern.test(task.text));
          
          if (hasTomAbbreviation) {
            // "tom" = tomorrow
            parsedDueTime = new Date(now);
            parsedDueTime.setDate(parsedDueTime.getDate() + 1);
            parsedDueTime.setHours(9, 0, 0, 0); // Default to 9 AM
            hasAbbreviation = true;
            console.log(`Detected "tom" abbreviation in task: "${task.text}" -> Setting due date to tomorrow`);
          }
        }
        
        // Check for other day abbreviations if "tom" wasn't found
        if (!hasAbbreviation && (!task.dueTime || (typeof task.dueTime === 'string' && !task.dueTime.toLowerCase().includes('tom')))) {
          if (textLower.includes(' mon ') || textLower.includes('mon ') || textLower.endsWith(' mon') || textLower.includes(' monday')) {
            // "mon" or "monday" = next Monday
            parsedDueTime = new Date(now);
            const currentDay = parsedDueTime.getDay();
            const daysUntilMonday = (1 - currentDay + 7) % 7 || 7; // 1 = Monday
            parsedDueTime.setDate(parsedDueTime.getDate() + daysUntilMonday);
            parsedDueTime.setHours(9, 0, 0, 0);
            hasAbbreviation = true;
          } else if (textLower.includes(' tue ') || textLower.includes('tue ') || textLower.includes(' tuesday')) {
            // "tue" or "tuesday" = next Tuesday
            parsedDueTime = new Date(now);
            const currentDay = parsedDueTime.getDay();
            const daysUntilTuesday = (2 - currentDay + 7) % 7 || 7; // 2 = Tuesday
            parsedDueTime.setDate(parsedDueTime.getDate() + daysUntilTuesday);
            parsedDueTime.setHours(9, 0, 0, 0);
            hasAbbreviation = true;
          } else if (textLower.includes(' wed ') || textLower.includes('wed ') || textLower.includes(' wednesday')) {
            // "wed" or "wednesday" = next Wednesday
            parsedDueTime = new Date(now);
            const currentDay = parsedDueTime.getDay();
            const daysUntilWednesday = (3 - currentDay + 7) % 7 || 7; // 3 = Wednesday
            parsedDueTime.setDate(parsedDueTime.getDate() + daysUntilWednesday);
            parsedDueTime.setHours(9, 0, 0, 0);
            hasAbbreviation = true;
          } else if (textLower.includes(' thu ') || textLower.includes('thu ') || textLower.includes(' thursday')) {
            // "thu" or "thursday" = next Thursday
            parsedDueTime = new Date(now);
            const currentDay = parsedDueTime.getDay();
            const daysUntilThursday = (4 - currentDay + 7) % 7 || 7; // 4 = Thursday
            parsedDueTime.setDate(parsedDueTime.getDate() + daysUntilThursday);
            parsedDueTime.setHours(9, 0, 0, 0);
            hasAbbreviation = true;
          } else if (textLower.includes(' fri ') || textLower.includes('fri ') || textLower.includes(' friday')) {
            // "fri" or "friday" = next Friday
            parsedDueTime = new Date(now);
            const currentDay = parsedDueTime.getDay();
            const daysUntilFriday = (5 - currentDay + 7) % 7 || 7; // 5 = Friday
            parsedDueTime.setDate(parsedDueTime.getDate() + daysUntilFriday);
            parsedDueTime.setHours(9, 0, 0, 0);
            hasAbbreviation = true;
          } else if (textLower.includes(' sat ') || textLower.includes('sat ') || textLower.includes(' saturday')) {
            // "sat" or "saturday" = next Saturday
            parsedDueTime = new Date(now);
            const currentDay = parsedDueTime.getDay();
            const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7; // 6 = Saturday
            parsedDueTime.setDate(parsedDueTime.getDate() + daysUntilSaturday);
            parsedDueTime.setHours(9, 0, 0, 0);
            hasAbbreviation = true;
          } else if (textLower.includes(' sun ') || textLower.includes('sun ') || textLower.includes(' sunday')) {
            // "sun" or "sunday" = next Sunday
            parsedDueTime = new Date(now);
            const currentDay = parsedDueTime.getDay();
            const daysUntilSunday = (0 - currentDay + 7) % 7 || 7; // 0 = Sunday
            parsedDueTime.setDate(parsedDueTime.getDate() + daysUntilSunday);
            parsedDueTime.setHours(9, 0, 0, 0);
            hasAbbreviation = true;
          }
        }
        
        // Parse and fix the dueTime if provided by AI or from abbreviation
        if (task.dueTime && !hasAbbreviation) {
          parsedDueTime = new Date(task.dueTime);
          
          // CRITICAL: Fix year if it's in the past (like 2023)
          const dueYear = parsedDueTime.getFullYear();
          if (dueYear < currentYear) {
            // If year is in past, update to current year
            parsedDueTime.setFullYear(currentYear);
            // If the date has already passed this year, move to next occurrence
            if (parsedDueTime < now) {
              // For dates like "Nov 13", if it's past, it might be next year
              // But for "tomorrow" or "Monday", we want to keep it in current year
              // Check if it's a relative date (within 7 days) - if so, keep current year
              const daysDiff = Math.floor((parsedDueTime - now) / (1000 * 60 * 60 * 24));
              if (daysDiff < -7) {
                // More than a week past, likely next year
                parsedDueTime.setFullYear(currentYear + 1);
              }
            }
          }
        }
        
        // Calculate priority based on dueTime
        if (parsedDueTime) {
          const timeDiff = parsedDueTime - now;
          const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
          const daysUntil = Math.floor(hoursUntil / 24);
          const finalDueYear = parsedDueTime.getFullYear();
          
          // Higher priority for overdue or urgent tasks
          if (finalDueYear < currentYear || timeDiff < 0) {
            calculatedPriority = 100; // Overdue = highest priority
          } else if (daysUntil === 0) {
            calculatedPriority = 95; // Due today = very high priority
          } else if (daysUntil === 1) {
            calculatedPriority = 90; // Due tomorrow = highest priority (after overdue/today)
          } else if (daysUntil <= 7) {
            calculatedPriority = 80; // Due this week = high priority
          } else if (calculatedPriority === 0) {
            calculatedPriority = 50; // Future task with no explicit priority
          }
        } else {
          // No deadline - check if task text suggests urgency
          if (textLower.includes('now') || textLower.includes('urgent') || textLower.includes('asap')) {
            calculatedPriority = 85; // Urgent but no date
          } else if (calculatedPriority === 0) {
            calculatedPriority = 30; // No deadline = lower priority
          }
        }

        const todo = await Todo.create({
          userId: req.userId,
          text: task.text,
          dueTime: parsedDueTime,
          priority: calculatedPriority,
          order: 0, // Will be set after reordering
          completed: false
        });
        createdTodos.push(todo);
      }

      // Reorder ALL todos (existing + new) by priority after adding new ones
      // Use the same sorting logic as getTodos
      const allTodos = await Todo.find({ userId: req.userId, completed: false })
        .sort({ priority: -1, order: -1, dueTime: 1 });

      // Update order for all todos based on new priority order
      const updatePromises = allTodos.map((todo, index) => {
        return Todo.findByIdAndUpdate(
          todo._id,
          { order: allTodos.length - index }, // Higher order = appears first
          { new: true }
        );
      });

      await Promise.all(updatePromises);
      
      // Also update priorities for existing todos that might need recalculation
      const nowForRecalc = new Date();
      const currentYearForRecalc = nowForRecalc.getFullYear();
      
      for (const todo of allTodos) {
        let needsUpdate = false;
        let newDueTime = todo.dueTime;
        let newPriority = todo.priority;
        
        if (todo.dueTime) {
          const dueDate = new Date(todo.dueTime);
          const dueYear = dueDate.getFullYear();
          
          // Fix year if it's in the past (like 2023)
          if (dueYear < currentYearForRecalc) {
            dueDate.setFullYear(currentYearForRecalc);
            // If date has passed this year, check if it should be next year
            if (dueDate < nowForRecalc) {
              const daysDiff = Math.floor((dueDate - nowForRecalc) / (1000 * 60 * 60 * 24));
              if (daysDiff < -7) {
                dueDate.setFullYear(currentYearForRecalc + 1);
              }
            }
            newDueTime = dueDate;
            needsUpdate = true;
          }
          
          const timeDiff = newDueTime - nowForRecalc;
          const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
          const daysUntil = Math.floor(hoursUntil / 24);
          const finalDueYear = new Date(newDueTime).getFullYear();
          
          // Recalculate priority
          if (finalDueYear < currentYearForRecalc || timeDiff < 0) {
            newPriority = 100; // Overdue
          } else if (daysUntil === 0) {
            newPriority = 95; // Due today
          } else if (daysUntil === 1) {
            newPriority = 90; // Due tomorrow
          } else if (daysUntil <= 7) {
            newPriority = 80; // Due this week
          } else if (newPriority < 50) {
            newPriority = 50; // Future task
          }
        } else {
          // No deadline - check if task text suggests urgency
          const textLower = todo.text.toLowerCase();
          if (textLower.includes('now') || textLower.includes('urgent') || textLower.includes('asap') || textLower.includes('need')) {
            newPriority = Math.max(newPriority, 85); // Urgent but no date
            needsUpdate = true;
          }
        }
        
        if (needsUpdate || newPriority !== todo.priority) {
          const updateData = { priority: newPriority };
          if (needsUpdate && newDueTime) {
            updateData.dueTime = newDueTime;
          }
          await Todo.findByIdAndUpdate(todo._id, updateData);
        }
      }
    }

    res.json({
      success: true,
      message: 'AI chat processed successfully',
      data: {
        response: aiResult.response || 'Tasks processed successfully',
        tasks: createdTodos
      }
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI chat: ' + error.message,
      data: null
    });
  }
};

module.exports = {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  reorderTodos,
  prioritizeTodosWithAI,
  chatWithAIForTodos
};

