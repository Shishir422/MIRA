// Dashboard Page with Productivity Graph and Summary
async function renderDashboardPage() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    ${renderNavbar()}
    <div class="container" style="padding-top: 100px;">
      <div class="dashboard-header">
        <h1 class="dashboard-title">📊 Dashboard</h1>
        <p class="dashboard-subtitle">Track your productivity and journaling progress</p>
      </div>

      <div id="dashboard-content">
        <div class="spinner"></div>
      </div>
    </div>
  `;

  const content = document.getElementById('dashboard-content');

  try {
    // Load journals and reminders
    const [journalsResponse, remindersResponse] = await Promise.all([
      journalAPI.getAll(),
      reminderAPI.getAll()
    ]);

    if (!journalsResponse.ok || !journalsResponse.data.success) {
      throw new Error('Failed to load journals');
    }

    const journals = journalsResponse.data.data || [];
    const reminders = remindersResponse.ok && remindersResponse.data.success 
      ? remindersResponse.data.data || [] 
      : [];

    // Calculate statistics
    const stats = calculateStats(journals, reminders);
    
    // Get previous day summary
    const previousDaySummary = getPreviousDaySummary(journals);

    // Render dashboard
    content.innerHTML = `
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-content">
            <h3 class="stat-value">${stats.totalJournals}</h3>
            <p class="stat-label">Total Journals</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-content">
            <h3 class="stat-value">${stats.currentStreak}</h3>
            <p class="stat-label">Day Streak</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <h3 class="stat-value">${stats.completedReminders}</h3>
            <p class="stat-label">Completed Tasks</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-content">
            <h3 class="stat-value">${stats.upcomingReminders}</h3>
            <p class="stat-label">Upcoming Events</p>
          </div>
        </div>
      </div>

      <!-- Previous Day Summary -->
      <div class="dashboard-section">
        <h2 class="section-title">📋 Yesterday's Summary</h2>
        <div class="summary-card">
          ${previousDaySummary ? `
            <div class="summary-content">
              <p class="summary-date">${previousDaySummary.date}</p>
              <h3 class="summary-title">${previousDaySummary.title || 'Untitled Entry'}</h3>
              <p class="summary-text">${previousDaySummary.preview}</p>
              ${previousDaySummary.productiveCount > 0 ? `
                <div class="summary-stats">
                  <span class="summary-stat-item productive">✅ ${previousDaySummary.productiveCount} Productive Activities</span>
                  ${previousDaySummary.sentiment ? `<span class="summary-stat-item sentiment sentiment-${previousDaySummary.sentiment}">${previousDaySummary.sentiment === 'positive' ? '😊' : previousDaySummary.sentiment === 'negative' ? '😔' : '😐'} ${previousDaySummary.sentiment}</span>` : ''}
                </div>
              ` : ''}
              <a href="#/journal/${previousDaySummary.id}" class="summary-link">View Full Entry →</a>
            </div>
          ` : `
            <div class="summary-empty">
              <p>No journal entry for yesterday. Start your journaling journey today!</p>
            </div>
          `}
        </div>
      </div>

      <!-- Productivity Graph -->
      <div class="dashboard-section">
        <h2 class="section-title">📈 Productivity Over Time</h2>
        <div class="chart-card">
          <canvas id="productivityChart"></canvas>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="dashboard-section">
        <h2 class="section-title">🕐 Recent Journal History</h2>
        <div class="activity-list" id="activity-list">
          ${renderJournalHistory(journals, 4)}
        </div>
        ${getRecentJournalHistory(journals).length > 4 ? `
          <button class="btn btn-outline" id="show-all-journals-btn" style="margin-top: 16px;">
            Show All (${getRecentJournalHistory(journals).length})
          </button>
        ` : ''}
      </div>
    `;

    // Render chart after DOM is ready
    setTimeout(() => {
      renderProductivityChart(journals);
    }, 100);

    // Handle "Show All" button for journal history
    const showAllBtn = document.getElementById('show-all-journals-btn');
    if (showAllBtn) {
      let showingAll = false;
      showAllBtn.addEventListener('click', () => {
        const activityList = document.getElementById('activity-list');
        if (showingAll) {
          // Show only 4
          activityList.innerHTML = renderJournalHistory(journals, 4);
          showAllBtn.textContent = `Show All (${getRecentJournalHistory(journals).length})`;
          showingAll = false;
        } else {
          // Show all
          activityList.innerHTML = renderJournalHistory(journals, null);
          showAllBtn.textContent = 'Show Less';
          showingAll = true;
        }
      });
    }

  } catch (error) {
    console.error('Dashboard error:', error);
    content.innerHTML = `
      <div class="alert alert-error">
        Error loading dashboard. Please try again.
      </div>
    `;
  }
}

function calculateStats(journals, reminders) {
  // Calculate streak
  let currentStreak = 0;
  if (journals.length > 0) {
    const sortedJournals = [...journals].sort((a, b) => new Date(b.date) - new Date(a.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkDate = new Date(today);
    
    for (const journal of sortedJournals) {
      const journalDate = new Date(journal.date);
      journalDate.setHours(0, 0, 0, 0);
      
      if (journalDate.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (journalDate < checkDate) {
        break;
      }
    }
  }

  // Count reminders
  const completedReminders = reminders.filter(r => r.status === 'completed').length;
  const upcomingReminders = reminders.filter(r => {
    const eventDate = new Date(r.eventDate);
    return eventDate >= new Date() && r.status !== 'completed';
  }).length;

  return {
    totalJournals: journals.length,
    currentStreak: currentStreak,
    completedReminders: completedReminders,
    upcomingReminders: upcomingReminders
  };
}

function getPreviousDaySummary(journals) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const previousJournal = journals.find(j => {
    const journalDate = new Date(j.date);
    return journalDate >= yesterday && journalDate <= yesterdayEnd;
  });

  if (!previousJournal) return null;

  const preview = previousJournal.content.length > 200 
    ? previousJournal.content.substring(0, 200) + '...'
    : previousJournal.content;

  let productiveCount = 0;
  let sentiment = null;
  
  if (previousJournal.analysis) {
    productiveCount = previousJournal.analysis.productive?.length || 0;
    sentiment = previousJournal.analysis.sentiment || null;
  }

  return {
    id: previousJournal._id,
    date: new Date(previousJournal.date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    }),
    title: previousJournal.title,
    preview: preview,
    productiveCount: productiveCount,
    sentiment: sentiment
  };
}

function getRecentJournalHistory(journals) {
  // Get recent journals sorted by date (newest first)
  const recentJournals = [...journals]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return recentJournals.map(journal => {
    const journalDate = new Date(journal.date);
    const preview = journal.content.length > 100 
      ? journal.content.substring(0, 100) + '...'
      : journal.content;

    return {
      id: journal._id,
      icon: '📝',
      text: journal.title || 'Untitled Entry',
      preview: preview,
      time: formatTimeAgo(journalDate),
      date: journalDate
    };
  });
}

function renderJournalHistory(journals, limit = null) {
  const history = getRecentJournalHistory(journals);
  const displayHistory = limit ? history.slice(0, limit) : history;

  if (history.length === 0) {
    return `
      <div class="activity-empty">
        <p>No journal entries yet. Start journaling to see your history here!</p>
      </div>
    `;
  }

  return displayHistory.map(activity => `
    <div class="activity-item" onclick="navigateTo('/journal/${activity.id}')" style="cursor: pointer;">
      <div class="activity-icon">${activity.icon}</div>
      <div class="activity-content">
        <p class="activity-text">${activity.text}</p>
        ${activity.preview ? `<p class="activity-preview">${activity.preview}</p>` : ''}
        <p class="activity-time">${activity.time}</p>
      </div>
    </div>
  `).join('');
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderProductivityChart(journals) {
  const canvas = document.getElementById('productivityChart');
  if (!canvas || typeof Chart === 'undefined') {
    console.error('Chart.js not loaded or canvas not found');
    return;
  }

  // Get last 7 days of data
  const last7Days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    last7Days.push(date);
  }

  // Count journals per day
  const journalCounts = last7Days.map(date => {
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    return journals.filter(j => {
      const journalDate = new Date(j.date);
      return journalDate >= date && journalDate <= dateEnd;
    }).length;
  });

  // Count productive activities per day
  const productiveCounts = last7Days.map(date => {
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    const dayJournals = journals.filter(j => {
      const journalDate = new Date(j.date);
      return journalDate >= date && journalDate <= dateEnd;
    });

    return dayJournals.reduce((sum, j) => {
      return sum + (j.analysis?.productive?.length || 0);
    }, 0);
  });

  const labels = last7Days.map(date => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[date.getDay()];
  });

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Journals',
          data: journalCounts,
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Productive Activities',
          data: productiveCounts,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#f3f4f6'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#9ca3af'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#9ca3af',
            stepSize: 1
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        }
      }
    }
  });
}

// Register route
addRoute('/dashboard', renderDashboardPage);

