// Journals List Page
async function renderJournalsPage() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    ${renderNavbar()}
    <div class="container" style="padding-top: 100px;">
      <div class="journals-header">
        <div>
          <h1 class="journals-title">
            My Journals
          
          </h1>
        </div>
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-primary" id="new-journal-btn">+ New Entry</button>
        </div>
      </div>

      <div id="journals-content">
        <div class="spinner"></div>
      </div>
    </div>
  `;

  const content = document.getElementById('journals-content');
  const streakBadge = document.getElementById('streak-badge');

  // Load journals
  try {
    const response = await journalAPI.getAll();

    if (response.ok && response.data.success) {
      const journals = response.data.data;

      if (journals.length === 0) {
        content.innerHTML = `
          <div class="card text-center">
            <h3>No journals yet</h3>
            <p class="mb-4">Start your journaling journey by creating your first entry!</p>
            <button class="btn btn-primary" onclick="navigateTo('/journal/new')">Create First Journal</button>
          </div>
        `;
      } else {
        // Calculate streak (max from all journals)
        const maxStreak = Math.max(...journals.map(j => j.streakCount || 0));
        streakBadge.textContent = `🔥 ${maxStreak} day streak`;

        content.innerHTML = `
          <div class="journals-grid">
            ${journals.map(journal => `
              <div class="journal-card" onclick="navigateTo('/journal/${journal._id}')">
                <h3 class="journal-card-title">${journal.title || 'Untitled Entry'}</h3>
                <p class="journal-card-preview">${journal.content.substring(0, 150)}${journal.content.length > 150 ? '...' : ''}</p>
                <p class="journal-card-date">${new Date(journal.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            `).join('')}
          </div>
        `;
      }
    } else {
      content.innerHTML = `
        <div class="alert alert-error">
          Failed to load journals: ${response.data.message}
        </div>
      `;
    }
  } catch (error) {
    content.innerHTML = `
      <div class="alert alert-error">
        Error loading journals. Please try again.
      </div>
    `;
  }

  // Event listeners
  document.getElementById('new-journal-btn').addEventListener('click', () => {
    navigateTo('/journal/new');
  });
}

// Register route
addRoute('/journals', renderJournalsPage);
