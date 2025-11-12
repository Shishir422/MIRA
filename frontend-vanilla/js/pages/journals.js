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
            <span id="streak-badge" class="streak-badge"></span>
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
        
        // Hide streak badge if no journals
        const streakBadge = document.getElementById('streak-badge');
        if (streakBadge) {
          streakBadge.style.display = 'none';
        }
      } else {
        // Calculate current streak based on consecutive days
        const streakBadge = document.getElementById('streak-badge');
        if (streakBadge) {
          streakBadge.style.display = 'inline-flex';
          
          // Sort journals by date (newest first)
          const sortedJournals = [...journals].sort((a, b) => new Date(b.date) - new Date(a.date));
          
          // Calculate consecutive days streak
          let currentStreak = 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          let checkDate = new Date(today);
          
          for (const journal of sortedJournals) {
            const journalDate = new Date(journal.date);
            journalDate.setHours(0, 0, 0, 0);
            
            // Check if this journal is for the date we're looking for
            if (journalDate.getTime() === checkDate.getTime()) {
              currentStreak++;
              checkDate.setDate(checkDate.getDate() - 1); // Move to previous day
            } else if (journalDate < checkDate) {
              // Journal is older than expected, break streak
              break;
            }
            // If journal is newer, skip it (already counted or future date)
          }
          
          if (currentStreak > 0) {
            streakBadge.textContent = `🔥 ${currentStreak} day streak`;
          } else {
            streakBadge.textContent = `🔥 Start your streak!`;
          }
        }

        content.innerHTML = `
          <div class="journals-grid">
            ${journals.map(journal => `
              <div class="journal-card" onclick="navigateTo('/journal/${journal._id}')">
                <div class="journal-card-header">
                  <div class="journal-number">#${journal.journalNumber}</div>
                  <button class="journal-delete-btn" id="delete-journal-${journal._id}" title="Delete journal" onclick="event.stopPropagation()">×</button>
                </div>
                <h3 class="journal-card-title">${journal.title || 'Untitled Entry'}</h3>
                <p class="journal-card-preview">${journal.content.substring(0, 150)}${journal.content.length > 150 ? '...' : ''}</p>
                <p class="journal-card-date">${new Date(journal.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            `).join('')}
          </div>
        `;
        
        // Add event listeners for delete buttons
        journals.forEach(journal => {
          const deleteBtn = document.getElementById(`delete-journal-${journal._id}`);
          if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
              e.stopPropagation();
              if (confirm(`Are you sure you want to delete "${journal.title || 'Untitled Entry'}"? This action cannot be undone.`)) {
                await deleteJournal(journal._id);
              }
            });
          }
        });
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
  
  // Delete journal function
  async function deleteJournal(journalId) {
    try {
      const response = await journalAPI.delete(journalId);
      if (response.ok && response.data.success) {
        // Reload the page to refresh the list
        await renderJournalsPage();
        showMessage('Journal deleted successfully', 'success');
      } else {
        alert('Failed to delete journal: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting journal:', error);
      alert('Failed to delete journal. Please try again.');
    }
  }
}

// Register route
addRoute('/journals', renderJournalsPage);
