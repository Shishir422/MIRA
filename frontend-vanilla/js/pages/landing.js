// Landing/Home Page - Clean & Simple
function renderLandingPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="landing-page">
      <!-- Logo at top center -->
      <div class="landing-logo-container">
        <div class="landing-logo">MIRA</div>
        <div class="landing-logo-subtitle">Mindful Intelligent Reflective Assistant</div>
      </div>

      <!-- Main content area -->
      <main class="landing-main">
        <div class="landing-content">
          <p class="landing-description">
            MIRA transforms daily journaling into an actionable assistant with intelligent autonomy. 
            Experience automatic analysis, event detection, reminders, and calendar sync — 
            all working seamlessly so you can focus on what matters most.
          </p>

          <div class="landing-actions">
            <a href="#/login" class="landing-btn landing-btn-primary">Login</a>
            <a href="#/login?signup=true" class="landing-btn landing-btn-secondary">Sign Up</a>
          </div>
        </div>
      </main>

      <!-- AI Features Section -->
      <section class="landing-features">
        <h2 class="landing-features-title">AI-Powered Features</h2>
        <div class="landing-features-grid">
          <div class="landing-feature-card">
            <div class="landing-feature-icon">🧠</div>
            <h3 class="landing-feature-title">Intelligent Analysis</h3>
            <p class="landing-feature-description">
              Local Llama3 AI analyzes your journal entries to detect sentiment, emotions, 
              and categorize activities automatically. Get personalized insights without compromising privacy.
            </p>
          </div>

          <div class="landing-feature-card">
            <div class="landing-feature-icon">📅</div>
            <h3 class="landing-feature-title">Smart Event Detection</h3>
            <p class="landing-feature-description">
              AI autonomously detects meetings, deadlines, and appointments from natural language. 
              Automatically creates reminders and syncs with Google Calendar.
            </p>
          </div>

          <div class="landing-feature-card">
            <div class="landing-feature-icon">⚡</div>
            <h3 class="landing-feature-title">Autonomous Actions</h3>
            <p class="landing-feature-description">
              Auto-save, auto-analyze, and auto-sync work in the background. 
              Your journal entries are processed intelligently without any manual intervention.
            </p>
          </div>
        </div>
      </section>

      <!-- Additional Info Section -->
      <section class="landing-info">
        <div class="landing-info-grid">
          <div class="landing-info-item">
            <div class="landing-info-number">100%</div>
            <div class="landing-info-label">Private & Local</div>
            <div class="landing-info-text">Your data stays on your device. AI runs locally via Ollama.</div>
          </div>
          <div class="landing-info-item">
            <div class="landing-info-number">⚡</div>
            <div class="landing-info-label">Real-time Processing</div>
            <div class="landing-info-text">Auto-save and analysis happen instantly as you type.</div>
          </div>
          <div class="landing-info-item">
            <div class="landing-info-number">🔗</div>
            <div class="landing-info-label">Calendar Integration</div>
            <div class="landing-info-text">Seamless Google Calendar sync with OAuth security.</div>
          </div>
        </div>
      </section>
    </div>
  `;
}

// Register route
addRoute('/', renderLandingPage);
