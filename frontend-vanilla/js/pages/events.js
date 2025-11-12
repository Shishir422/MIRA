// Events Page - List all reminders/events
async function renderEventsPage() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    ${renderNavbar()}
    <div class="container" style="padding-top: 100px;">
      <div class="events-header">
        <div>
          <h1 class="events-title"><span class="title-emoji">📅</span> Events</h1>
          <p class="events-subtitle">All your scheduled events and reminders</p>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="btn btn-primary" id="filter-btn">Filter</button>
        </div>
      </div>

      <div id="events-content">
        <div class="spinner"></div>
      </div>
    </div>
  `;

  const content = document.getElementById('events-content');
  const filterBtn = document.getElementById('filter-btn');

  // Filter state
  let currentFilter = 'all'; // all, upcoming, past, completed

  // Load events
  async function loadEvents(filter = 'all') {
    try {
      content.innerHTML = '<div class="spinner"></div>';
      
      const response = await reminderAPI.getAll();

      if (response.ok && response.data.success) {
        let events = response.data.data || [];

        // Apply filter and sort
        const now = new Date();
        switch (filter) {
          case 'upcoming':
            events = events.filter(e => {
              const eventDate = new Date(e.eventDate);
              return eventDate >= now && e.status !== 'cancelled' && e.status !== 'completed';
            });
            // Sort upcoming events: earliest first (ascending)
            events.sort((a, b) => {
              const dateA = new Date(a.eventDate);
              const dateB = new Date(b.eventDate);
              return dateA - dateB;
            });
            break;
          case 'past':
            events = events.filter(e => {
              const eventDate = new Date(e.eventDate);
              return eventDate < now && e.status !== 'cancelled' && e.status !== 'completed';
            });
            // Sort past events: most recent first (descending)
            events.sort((a, b) => {
              const dateA = new Date(a.eventDate);
              const dateB = new Date(b.eventDate);
              return dateB - dateA;
            });
            break;
          case 'completed':
            events = events.filter(e => e.status === 'completed');
            // Sort completed events: most recent first (descending)
            events.sort((a, b) => {
              const dateA = new Date(a.eventDate);
              const dateB = new Date(b.eventDate);
              return dateB - dateA;
            });
            break;
          case 'all':
          default:
            // For "all", show upcoming first, then past
            // Separate upcoming and past
            const upcoming = events.filter(e => {
              const eventDate = new Date(e.eventDate);
              return eventDate >= now && e.status !== 'cancelled' && e.status !== 'completed';
            });
            const past = events.filter(e => {
              const eventDate = new Date(e.eventDate);
              return eventDate < now && e.status !== 'cancelled' && e.status !== 'completed';
            });
            const completed = events.filter(e => e.status === 'completed');
            const cancelled = events.filter(e => e.status === 'cancelled');
            
            // Sort upcoming: earliest first (ascending)
            upcoming.sort((a, b) => {
              const dateA = new Date(a.eventDate);
              const dateB = new Date(b.eventDate);
              return dateA - dateB;
            });
            
            // Sort past: most recent first (descending)
            past.sort((a, b) => {
              const dateA = new Date(a.eventDate);
              const dateB = new Date(b.eventDate);
              return dateB - dateA;
            });
            
            // Sort completed: most recent first (descending)
            completed.sort((a, b) => {
              const dateA = new Date(a.eventDate);
              const dateB = new Date(b.eventDate);
              return dateB - dateA;
            });
            
            // Sort cancelled: most recent first (descending)
            cancelled.sort((a, b) => {
              const dateA = new Date(a.eventDate);
              const dateB = new Date(b.eventDate);
              return dateB - dateA;
            });
            
            // Combine: upcoming first, then past, then completed, then cancelled
            events = [...upcoming, ...past, ...completed, ...cancelled];
            break;
        }

        if (events.length === 0) {
          content.innerHTML = `
            <div class="card text-center">
              <h3>No events found</h3>
              <p class="mb-4">${getEmptyMessage(filter)}</p>
            </div>
          `;
        } else {
          // Group events by date
          const groupedEvents = groupEventsByDate(events, filter);
          
          content.innerHTML = `
            <div class="events-list">
              ${Object.keys(groupedEvents).map(dateKey => `
                <div class="events-date-group">
                  <h2 class="events-date-header">${formatDateHeader(dateKey)}</h2>
                  <div class="events-grid">
                    ${groupedEvents[dateKey].map(event => renderEventCard(event)).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          `;

          // Add event listeners for delete and complete buttons
          events.forEach(event => {
            const deleteBtn = document.getElementById(`delete-event-${event._id}`);
            if (deleteBtn) {
              deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
                  await deleteEvent(event._id);
                }
              });
            }

            const completeBtn = document.getElementById(`complete-event-${event._id}`);
            if (completeBtn) {
              completeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await toggleEventComplete(event._id);
              });
            }
          });
        }
      } else {
        content.innerHTML = `
          <div class="alert alert-error">
            Failed to load events: ${response.data.message}
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading events:', error);
      content.innerHTML = `
        <div class="alert alert-error">
          Error loading events. Please try again.
        </div>
      `;
    }
  }

  function getEmptyMessage(filter) {
    switch (filter) {
      case 'upcoming':
        return 'You have no upcoming events.';
      case 'past':
        return 'No past events found.';
      case 'completed':
        return 'No synced or cancelled events yet.';
      default:
        return 'You haven\'t created any events yet. Create a journal entry and let AI detect events automatically!';
    }
  }

  function groupEventsByDate(events, filter = 'all') {
    const grouped = {};
    
    // Preserve the order of events as they come in (already sorted)
    events.forEach(event => {
      const eventDate = new Date(event.eventDate);
      const dateKey = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    // Sort the date keys to maintain chronological order
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const now = new Date();
      const dateA = new Date(a);
      const dateB = new Date(b);
      
      if (filter === 'upcoming') {
        // Ascending: earliest dates first
        return a.localeCompare(b);
      } else if (filter === 'past' || filter === 'completed') {
        // Descending: most recent dates first
        return b.localeCompare(a);
      } else {
        // For "all": upcoming dates first (ascending), then past dates (descending)
        const nowDate = new Date(now.toISOString().split('T')[0]);
        const dateAOnly = new Date(a);
        const dateBOnly = new Date(b);
        
        const aIsUpcoming = dateAOnly >= nowDate;
        const bIsUpcoming = dateBOnly >= nowDate;
        
        if (aIsUpcoming && !bIsUpcoming) {
          return -1; // a is upcoming, b is past - a comes first
        } else if (!aIsUpcoming && bIsUpcoming) {
          return 1; // a is past, b is upcoming - b comes first
        } else if (aIsUpcoming && bIsUpcoming) {
          // Both upcoming: ascending (earliest first)
          return a.localeCompare(b);
        } else {
          // Both past: descending (most recent first)
          return b.localeCompare(a);
        }
      }
    });

    // Rebuild grouped object in sorted order
    const sortedGrouped = {};
    sortedKeys.forEach(key => {
      sortedGrouped[key] = grouped[key];
    });

    return sortedGrouped;
  }

  function formatDateHeader(dateKey) {
    const date = new Date(dateKey);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  function renderEventCard(event) {
    const eventDate = new Date(event.eventDate);
    const now = new Date();
    const isPast = eventDate < now;
    const isToday = eventDate.toDateString() === now.toDateString();
    const isUpcoming = eventDate > now;
    
    const statusClass = event.status === 'cancelled' 
      ? 'cancelled' 
      : isPast 
        ? 'past' 
        : isToday 
          ? 'today' 
          : 'upcoming';

    const statusBadge = event.status === 'completed'
      ? '<span class="event-status-badge completed">✓ Completed</span>'
      : event.status === 'synced' 
        ? '<span class="event-status-badge synced">📅 Synced</span>'
        : event.status === 'cancelled'
          ? '<span class="event-status-badge cancelled">✗ Cancelled</span>'
          : event.status === 'confirmed'
            ? '<span class="event-status-badge confirmed">✓ Confirmed</span>'
            : '';

    const isCompleted = event.status === 'completed';
    const completeButtonText = isCompleted ? 'Mark Incomplete' : 'Mark Complete';
    const completeButtonClass = isCompleted ? 'event-complete-btn completed' : 'event-complete-btn';

    return `
      <div class="event-card ${statusClass}" id="event-card-${event._id}">
        <div class="event-card-header">
          <div class="event-card-title-row">
            <h3 class="event-card-title">${event.title}</h3>
            ${statusBadge}
          </div>
          <button class="event-delete-btn" id="delete-event-${event._id}" title="Delete event">×</button>
        </div>
        
        <div class="event-card-time">
          <span class="event-time-icon">🕐</span>
          ${formatEventTime(eventDate)}
        </div>
        
        ${event.description ? `
          <p class="event-card-description">${event.description}</p>
        ` : ''}
        
        ${event.originalSentence ? `
          <div class="event-card-ai-note">
            <span class="ai-note-label">Context:</span>
            ${event.originalSentence}
          </div>
        ` : ''}
        
        ${event.journalId ? `
          <div class="event-card-link">
            <span class="event-link-icon">📝</span>
            Linked to journal entry
          </div>
        ` : ''}
        
        <div class="event-card-actions">
          <button class="${completeButtonClass}" id="complete-event-${event._id}" title="${completeButtonText}">
            ${isCompleted ? '✓ Completed' : '○ Mark Complete'}
          </button>
        </div>
      </div>
    `;
  }

  function formatEventTime(date) {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = (() => {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return date.toDateString() === tomorrow.toDateString();
    })();

    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${timeStr}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      }) + ` at ${timeStr}`;
    }
  }

  async function deleteEvent(eventId) {
    try {
      const response = await reminderAPI.delete(eventId);
      if (response.ok) {
        // Reload events
        await loadEvents(currentFilter);
      } else {
        alert('Failed to delete event: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  }

  async function toggleEventComplete(eventId) {
    try {
      const response = await reminderAPI.toggleComplete(eventId);
      if (response.ok) {
        // Reload events to show updated status
        await loadEvents(currentFilter);
      } else {
        alert('Failed to update event status: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error toggling event completion:', error);
      alert('Failed to update event status. Please try again.');
    }
  }

  // Filter button handler
  filterBtn.addEventListener('click', () => {
    const filters = ['all', 'upcoming', 'past', 'completed'];
    const currentIndex = filters.indexOf(currentFilter);
    const nextIndex = (currentIndex + 1) % filters.length;
    currentFilter = filters[nextIndex];
    
    // Update button text
    const filterLabels = {
      'all': 'All Events',
      'upcoming': 'Upcoming',
      'past': 'Past',
      'completed': 'Synced/Cancelled'
    };
    filterBtn.textContent = filterLabels[currentFilter];
    
    loadEvents(currentFilter);
  });

  // Initial load
  filterBtn.textContent = 'All Events';
  await loadEvents('all');
}

// Register route
addRoute('/events', renderEventsPage);

