# MIRA - Mindful Intelligent Reflective Assistant

**An AI-Powered Personal Journaling Application with Autonomous Reminder Creation**

MIRA is a production-ready personal journaling web application that uses a local AI model (Llama3) to automatically analyze your journal entries, extract insights, detect future events, and create calendar reminders autonomously with intelligent 3-layer duplicate prevention.

## 🎯 What Makes MIRA Special

**Agentic AI with Memory** - MIRA uses intelligent AI that doesn't just extract events from your journals—it makes autonomous decisions about which events deserve reminders by:
- Analyzing your recent journal history for behavioral patterns
- Detecting semantic duplicates (understands "client demo" = "preparing for demo")
- Autonomously deciding priority levels based on context and urgency
- Enhancing event descriptions with preparation notes from your journal content
- **3-Layer Duplicate Prevention** system (rule-based + AI semantic + database) ensures zero duplicate reminders

## 🤖 AI-Powered Features

### **Intelligent Journal Analysis**
- **Auto-Save**: Automatically saves journals 2 seconds after you stop typing
- **Auto-Analysis**: Automatically analyzes journals 5 seconds after typing stops using local Llama3 LLM
- **Semantic Understanding**: Deep semantic analysis using Llama3 (Temperature: 0.15 for consistent results)
- **Natural Language Event Detection**: AI detects future events from conversational text:
  - "I have a meeting tomorrow at 3pm"
  - "Dentist appointment on December 12 at 10am"
  - "Submit report by Friday at 5pm"
  - Intelligently ignores vague mentions and past events

### **🤖 Agentic AI Reminder Creation (Core Innovation)**

The AI agent autonomously manages your reminders through intelligent decision-making:

**Context-Aware Decision Making:**
- Receives your current journal entry plus last 5 journal entries for pattern recognition
- Accesses all existing reminders for comprehensive duplicate detection
- Analyzes detected events against your personal history

**Autonomous Intelligence:**
- Decides `shouldCreate: true/false` for each detected event
- Assigns priority levels (high/medium/low) based on context
- Adds intelligent preparation notes from journal context
- Filters casual mentions and duplicate events automatically

**3-Layer Duplicate Prevention System:**
1. **Pre-Filter (Rule-Based)**: Same date + similar title detection (~70% of duplicates caught)
2. **AI Semantic Analysis**: Llama3 understands "client demo" = "preparing for demo" = "demo with client"
3. **Database Safety Net**: Unique constraints prevent any edge cases

**Real Example:**
```
User writes: "Working on project. Client demo on the 25th at 3pm. Still preparing for the demo."

AI Processing:
- Detects: "Client demo" and "preparing for the demo" (same date)
- Decides: Create 1 reminder (filters duplicate mention)
- Enhances: "Client demo - Prepare slides, test environment, review features"
- Priority: HIGH (based on context)
```

### **Comprehensive Journal Analysis**
- **Activity Categorization**: Productive, unproductive, and restful activities with semantic understanding
- **Emotional Intelligence**: Detects explicit emotions and reads emotional tone from context
- **Personalized Suggestions**: 3-5 actionable recommendations tailored to your journal content
- **Sentiment Analysis**: Overall mood detection (positive/neutral/negative)

### **Automatic Google Calendar Integration**
- One-click OAuth 2.0 secure authentication
- Auto-sync AI-created reminders without manual intervention
- Timezone-aware event creation (defaults to Asia/Kolkata, customizable)
- Each event includes AI-enhanced descriptions with preparation notes
- Automatic popup (30min) and email (60min) reminders
- Real-time sync status with calendar links

## ✨ Complete Feature Set

### **Smart Journaling**
- Create, read, update, and delete journal entries
- Auto-save technology (2-second delay prevents data loss)
- Sequential journal numbering (#1, #2, #3...)
- Streak tracking for consecutive journaling days
- Delete confirmation for safety

### **Interactive Dashboard**
Built with Chart.js for beautiful data visualization:
- **Real-time Stats**: Total journals, current streak, completed tasks, upcoming events
- **Productivity Chart**: 7-day activity visualization with interactive tooltips
- **Yesterday's Summary**: Quick preview with sentiment analysis
- **Activity Timeline**: Recent journals and reminders in chronological order

### **Events Management Center**
- Comprehensive reminder viewing with smart filters (Today/Upcoming/Past/Cancelled)
- Detailed event cards displaying:
  - Full event information with date/time
  - Status badges (proposed/synced/completed/cancelled)
  - AI reasoning explanations
  - Direct Google Calendar links (when synced)
  - Quick complete/delete actions

### **AI-Powered Todo List**
- Create, update, and delete todos with ease
- Manual drag-and-drop reordering
- **AI Prioritization Engine**:
  - Llama3 analyzes all incomplete todos
  - Considers due dates, urgency, and task context
  - Intelligently ranks and reorders based on importance
- Due date/time support with smart sorting
- Visual completion tracking

### **Speech-to-Text Integration**
- Real-time voice transcription in journal editor
- Continuous recording mode with live feedback
- Interim and final transcription results
- Seamless text insertion at cursor position

### **Secure Authentication & Privacy**
- JWT-based authentication system (30-day token expiration)
- bcrypt password hashing for maximum security
- Protected routes with automatic login redirect
- Per-user OAuth tokens stored securely in MongoDB
- Each user connects their own Google Calendar account

## 🛠 Technology Stack

### **Backend**
- **Node.js + Express.js 4.18.2** - RESTful API server
- **MongoDB Atlas + Mongoose 8.19.3** - Cloud NoSQL database
- **Ollama + Llama3 8B** - Local AI model (Temperature: 0.15, JSON format)
- **Google Calendar API v3** - OAuth 2.0 + Event synchronization
- **JWT + bcryptjs** - Secure authentication and password hashing
- **Axios, Multer, CORS** - HTTP client, file handling, cross-origin support

### **Frontend**
- **Pure Vanilla JavaScript (ES6+)** - Zero framework overhead
- **HTML5 + CSS3** - Modern glassmorphism design
- **Hash-based SPA Routing** - Seamless navigation (#/dashboard, #/journals, #/events, #/todos)
- **Native Fetch API** - JWT-authenticated HTTP requests
- **Chart.js 4.4.0** - Beautiful data visualization
- **Web Speech API** - Browser-native voice input

### **Database Architecture**
- **User Model**: Authentication, OAuth tokens, timezone preferences
- **Journal Model**: Content, AI analysis results, streak tracking
- **Reminder Model**: Events, calendar sync status, AI metadata
- **Todo Model**: Tasks, priority scores, completion status

## 📂 Project Structure

```
/MIRA
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB Atlas connection
│   ├── models/
│   │   ├── User.js               # User schema with OAuth tokens
│   │   ├── Journal.js            # Journal schema with AI analysis
│   │   ├── Reminder.js           # Reminder schema with calendar sync
│   │   └── Todo.js               # Todo schema with AI prioritization
│   ├── routes/
│   │   ├── authRoutes.js         # Authentication endpoints
│   │   ├── journalRoutes.js      # Journal CRUD + AI analysis
│   │   ├── reminderRoutes.js     # Reminder management
│   │   ├── calendarRoutes.js     # Google Calendar OAuth & sync
│   │   └── todoRoutes.js         # Todo CRUD + AI prioritization
│   ├── controllers/
│   │   ├── authController.js     # Signup, login, getMe
│   │   ├── journalController.js  # Journal operations + AI analysis
│   │   ├── reminderController.js # Reminder operations + calendar sync
│   │   ├── calendarController.js # OAuth flow + Google Calendar API
│   │   └── todoController.js     # Todo operations + AI prioritization
│   ├── services/
│   │   └── ollamaService.js      # Llama3 AI integration (834 lines)
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT authentication middleware
│   ├── .env                      # Environment variables (NOT in git)
│   ├── package.json              # Backend dependencies
│   └── server.js                 # Express server entry point
│
├── frontend-vanilla/             # ACTIVE FRONTEND
│   ├── js/
│   │   ├── pages/
│   │   │   ├── landing.js        # Landing page
│   │   │   ├── login.js          # Login/signup page
│   │   │   ├── journals.js       # Journal list with streak
│   │   │   ├── journal-view.js   # Journal editor with AI
│   │   │   ├── dashboard.js      # Dashboard with Chart.js
│   │   │   ├── events.js         # Events management
│   │   │   ├── todos.js          # Todo list with AI prioritization
│   │   │   └── calendar-connected.js # OAuth success
│   │   ├── components/
│   │   │   └── navbar.js         # Reusable navigation bar
│   │   ├── api.js                # API client with JWT auth
│   │   ├── auth.js               # Authentication utilities
│   │   ├── router.js             # Hash-based SPA routing
│   │   └── app.js                # Application entry point
│   ├── index.html                # Main HTML file
│   └── styles.css                # Global styles (1400+ lines)
│
└── Main/HomePage/                # Static homepage
    ├── home.html
    ├── home.css
    └── home.js
```

## 📋 Quick Start Guide

### Prerequisites
- **Node.js** (v18+) - [Download here](https://nodejs.org/)
- **MongoDB Atlas** account - [Free tier signup](https://www.mongodb.com/cloud/atlas/register)
- **Ollama + Llama3** - [Install guide](https://ollama.ai)
- **Google Cloud** account (for Calendar) - [Console](https://console.cloud.google.com/)

### Installation Steps

**1. Install Ollama and Llama3**
```powershell
# Download Ollama from https://ollama.ai
# After installation:
ollama pull llama3
ollama list  # Verify installation
```

**2. Clone and Setup Backend**
```powershell
cd backend
npm install

# Create .env file with your credentials
# See .env.example for template
```

**3. Configure Environment Variables**
```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mira
JWT_SECRET=your_secure_32_character_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
FRONTEND_URL=http://localhost:5173
```

**4. Get Google Calendar Credentials**
1. Create project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Google Calendar API"
3. Create OAuth 2.0 Client ID (Web application)
4. Add redirect URI: `http://localhost:5000/api/calendar/callback`
5. Copy credentials to `.env`

**5. Start the Application**
```powershell
cd backend
npm run dev
```

**6. Open Browser**
```
http://localhost:5000
```

That's it! The frontend is served automatically by the backend.

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/me` - Get current user profile (protected)

### Journals (Protected)
- `POST /api/journals/create` - Create new journal entry
- `GET /api/journals` - Get all user journals
- `GET /api/journals/:id` - Get specific journal
- `PUT /api/journals/:id` - Update journal
- `DELETE /api/journals/:id` - Delete journal
- `POST /api/journals/:id/analyze` - **AI analysis + auto-create reminders + auto-sync calendar**

### Reminders (Protected)
- `POST /api/reminders/propose` - Create reminder manually
- `POST /api/reminders/:id/confirm` - Confirm proposed reminder
- `POST /api/reminders/:id/toggle-complete` - Mark complete/incomplete
- `GET /api/reminders` - Get all user reminders
- `DELETE /api/reminders/:id` - Delete reminder
- `POST /api/reminders/:id/sync-to-calendar` - Sync to Google Calendar

### Todos (Protected)
- `POST /api/todos` - Create new todo
- `GET /api/todos` - Get all user todos
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo
- `POST /api/todos/reorder` - Reorder todos
- `POST /api/todos/prioritize-ai` - **AI-powered prioritization**

### Google Calendar (Protected)
- `GET /api/calendar/auth` - Get OAuth authorization URL
- `GET /api/calendar/callback` - OAuth callback handler
- `GET /api/calendar/status` - Check connection status
- `POST /api/calendar/disconnect` - Disconnect Google Calendar

## 🌐 Frontend Routes

- `#/` - Landing page / Dashboard
- `#/login` - Login/Signup
- `#/dashboard` - Analytics dashboard
- `#/journals` - Journal list
- `#/journal/new` - Create journal
- `#/journal/:id` - Edit journal
- `#/events` - Events management
- `#/todos` - Todo list
- `#/calendar-connected` - OAuth success

## 🚀 How MIRA's AI Works

### Complete AI Workflow:

**Step 1: Journal Creation**
```
User types journal → Auto-save (2s delay) → Saved to MongoDB
```

**Step 2: Automatic AI Analysis (5s delay)**
```
Parallel AI Processing (faster performance):
├── Analysis #1: Activity categorization, emotions, sentiment, suggestions
└── Analysis #2: Event detection from natural language
```

**Step 3: Agentic AI Decision Making**
```
AI Agent receives:
- Detected events from Step 2
- User's last 5 journals (pattern recognition)
- All existing reminders (duplicate prevention)

AI Agent decides for each event:
- shouldCreate: true/false (autonomous decision)
- priority: high/medium/low (context-based)
- Enhanced description with preparation notes
- Filters duplicates through 3-layer system

Output: Only necessary reminders created
```

**Step 4: Automatic Calendar Sync (if connected)**
```
For each created reminder:
- OAuth2 authentication with stored tokens
- Create Google Calendar event
- Add AI-enhanced description
- Set timezone (Asia/Kolkata default)
- Add popup + email reminders
- Update reminder status to 'synced'
```

### AI Decision Example:
```javascript
Journal: "Working on project. Client demo on the 25th. Still preparing for demo."

AI Processing:
✓ Detects: "Client demo on the 25th" + "preparing for demo"
✓ Recognizes: Same event (semantic duplicate)
✓ Decides: Create 1 reminder only
✓ Enhances: "Client demo - Prepare slides, test environment, review features"
✓ Priority: HIGH (deadline-based)

Result: 1 smart reminder created (not 2 duplicates)
```

## 🎨 Key Innovations

1. **Agentic AI with Memory Context**
   - AI receives user history (last 5 journals + all reminders)
   - Makes context-aware decisions, not just pattern matching
   - Autonomous `shouldCreate` decision for each event

2. **3-Layer Duplicate Prevention**
   - Layer 1: Rule-based pre-filter (70% duplicates caught)
   - Layer 2: AI semantic understanding
   - Layer 3: Database unique constraints

3. **Timezone-Aware Calendar Sync**
   - User-specific timezone settings (default: Asia/Kolkata)
   - Prevents time mismatch issues in calendar events

4. **Auto-Save + Auto-Analyze Architecture**
   - Non-blocking async processing
   - User never loses work
   - AI analysis happens in background

5. **Privacy-First Design**
   - Llama3 runs locally via Ollama
   - Journal analysis never sent to cloud AI services
   - Per-user OAuth tokens (not shared between users)

6. **Zero-Build Frontend**
   - Pure vanilla JavaScript (no React/Vue/Angular)
   - Served directly by Express
   - Instant deployment, no compilation needed

## 📖 Usage Guide

### Getting Started
1. Open `http://localhost:5000` in your browser
2. Sign up with name, email, and password
3. Login to access your personal dashboard

### Connecting Google Calendar (Optional)
- Click "Connect Google Calendar" in navigation
- Authorize MIRA in Google OAuth screen
- Once connected, all AI-created reminders auto-sync

### Writing Journals
- Click "New Entry" button
- Write naturally about your day
- **Auto-save** activates after 2 seconds (see "Saved" indicator)
- **Auto-analyze** starts after 5 seconds (AI processing spinner appears)

### Viewing AI Insights
Below your journal, you'll automatically see:
- **Productive Activities**: Work, study, exercise detected
- **Restful Activities**: Sleep, breaks, relaxation
- **Emotional States**: Feelings from your writing
- **AI Suggestions**: 3-5 personalized recommendations
- **Detected Events**: Future events with auto-created reminders

### Managing Events & Reminders
- View all events on **Events** page
- Filter by: Today | Upcoming | Past | Cancelled
- Mark events as complete
- Delete unwanted reminders
- Click calendar links to view in Google Calendar

### Using AI Todo Prioritization
- Add todos with optional due dates
- Click "AI Prioritize" button
- Llama3 analyzes urgency and reorders tasks
- Manually drag-and-drop to adjust

### Natural Language Date Examples
The AI understands:
- "tomorrow at 3pm"
- "December 12 at 10am"
- "next Monday"
- "on the 25th"
- "Friday at 5pm"
- "in 3 days"

## 🔒 Security & Privacy

- **JWT Authentication**: Secure token-based auth with 30-day expiration
- **Password Hashing**: bcryptjs with salt rounds (10 rounds)
- **Google OAuth 2.0**: Industry-standard OAuth flow
- **Per-User Token Storage**: OAuth tokens stored in MongoDB per user (NOT hardcoded)
- **Environment Variables**: Sensitive keys in `.env` (excluded from git via `.gitignore`)
- **Protected Routes**: Backend JWT middleware + frontend route guards
- **Refresh Tokens**: Google refresh tokens stored securely, used to get new access tokens
- **Each Developer**: Must create their own Google Cloud credentials
- **Each User**: Connects their own Google Calendar account independently

## ⚡ Performance Details

**AI Analysis Speed (with GPU - RTX 4050):**
- Journal semantic analysis: ~3-5 seconds
- Event detection: ~2-3 seconds
- **AI reminder decision-making**: ~2-4 seconds
- **Parallel execution**: Analysis + Event Detection run simultaneously → ~5 seconds
- **Sequential**: Then AI decides on reminders → +2-4 seconds
- **Total**: ~7-9 seconds for complete AI workflow (analysis + event detection + intelligent reminder creation)
- Temperature: 0.15 for analysis, 0.3 for reminder decisions (more consistent decision-making)

**Without Ollama Running:**
- Returns 503 error: "Ollama service not available. Please ensure Ollama is running and llama3 model is installed."
- App still works for writing/saving journals
- AI analysis just won't be available until Ollama is started

**Auto-Save/Auto-Analyze Timers:**
- Auto-save debounce: 2 seconds
- Auto-analyze debounce: 5 seconds
- Skips initial load (prevents unnecessary API calls)

## 🏗 Architecture Highlights

- **Modular MVC Pattern**: Controllers, routes, models cleanly separated
- **Auto-save/Auto-analyze**: Debounced timers prevent excessive API calls
- **Parallel AI Calls**: Promise.all() runs analysis + event detection simultaneously (50% faster)
- **🤖 Agentic AI**: Third sequential AI call makes intelligent decisions about reminder creation
- **Llama3 Integration**: Local LLM via Ollama for complete privacy—no data sent to external APIs
- **Semantic NLP**: Deep language understanding, not regex or keyword matching
- **AI Decision Engine**: Llama3 filters events, assigns priorities, adds context, and decides what needs reminders
- **Event Detection**: AI-powered date/time parsing with relative date conversion
- **Google Calendar**: Persistent access via OAuth 2.0 refresh tokens (stored per-user)
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **CORS Enabled**: Secure frontend-backend communication (configured for localhost)
- **Hash Routing**: SPA-style routing without page reloads
- **Static File Serving**: Express serves vanilla frontend directly (no separate server needed)

## ✅ What Works (Features Actually Implemented)

- ✅ User signup and login with JWT authentication
- ✅ Create, read, update, delete journal entries
- ✅ Streak tracking for consecutive journaling days
## 🔒 Security & Privacy

- **JWT Authentication**: 30-day token expiration with secure bcrypt password hashing
- **Per-User OAuth Tokens**: Each user connects their own Google Calendar (tokens never shared)
- **Protected API Routes**: All journal/reminder endpoints require valid JWT
- **Local AI Processing**: Llama3 runs locally via Ollama (journal content never sent to cloud)
- **Environment Variables**: Sensitive credentials stored in `.env` (not committed to git)
- **MongoDB Security**: Cloud database with authentication and encrypted connections

## 🌟 Project Highlights

✅ **Fully Functional Features**:
- AI-powered journal analysis with Llama3
- Autonomous reminder creation with 3-layer duplicate prevention
- Google Calendar integration with OAuth 2.0
- Interactive dashboard with Chart.js visualizations
- AI-powered todo prioritization
- Real-time speech-to-text input
- Auto-save and auto-analyze functionality
- Streak tracking and analytics

## 📊 Database Models

### User Model
- Email, password (bcrypt hashed)
- Google OAuth tokens (refresh + access)
- Timezone preferences (default: Asia/Kolkata)

### Journal Model
- Title, content, date
- AI analysis results (activities, emotions, sentiment, suggestions)
- Streak counter

### Reminder Model
- Event details (title, description, date, priority)
- Status tracking (proposed/synced/completed/cancelled)
- Google Calendar event ID and link
- AI metadata (reasoning, preparation notes)

### Todo Model
- Task text, completion status
- Priority score (AI-assigned)
- Due date/time, manual ordering

## 🤝 Contributing

This is an academic project demonstrating agentic AI capabilities. Contributions welcome for:
- Enhanced AI prompt engineering
- Additional calendar provider integrations
- UI/UX improvements
- Performance optimizations

## 📄 License

MIT License - Free for learning and development

---

**MIRA - Mindful Intelligent Reflective Assistant**  
*Journaling powered by autonomous AI decision-making*

Built with ❤️ using Ollama + Llama3, Node.js, MongoDB, and Vanilla JavaScript
