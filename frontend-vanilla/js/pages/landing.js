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
    </div>
  `;
}

// Register route
addRoute('/', renderLandingPage);
