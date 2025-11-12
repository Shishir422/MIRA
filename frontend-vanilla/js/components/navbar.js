// Reusable Navbar Component
function renderNavbar() {
  const isAuth = isAuthenticated();
  
  return `
    <nav class="app-navbar">
      <div class="navbar-content">
        <div style="display:flex;align-items:center;gap:12px">
          <a href="#/" class="navbar-brand-link">
            <div class="navbar-brand">MIRA</div>
          </a>
          <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600">Mindful Intelligent Reflective Assistant</div>
        </div>
        <div class="navbar-actions">
          ${isAuth ? `
            <a href="#/dashboard" class="navbar-link">Dashboard</a>
            <a href="#/journals" class="navbar-link">Journals</a>
            <a href="#/events" class="navbar-link">Events</a>
            <button class="btn btn-outline btn-sm" onclick="logout()">Logout</button>
          ` : `
            <button class="btn btn-outline btn-sm" onclick="navigateTo('/login')">Log in</button>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('/login')">Get Started</button>
          `}
        </div>
      </div>
    </nav>
  `;
}

