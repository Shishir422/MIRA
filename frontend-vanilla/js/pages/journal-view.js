// Journal View/Edit Page with Auto-save and Auto-analyze
let autoSaveTimer = null;
let autoAnalyzeTimer = null;
let hasUnsavedChanges = false;
let currentJournalId = null;
let initialLoad = true;

async function renderJournalViewPage() {
  // CRITICAL: Clear any existing timers to prevent duplicate operations
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  if (autoAnalyzeTimer) {
    clearTimeout(autoAnalyzeTimer);
    autoAnalyzeTimer = null;
  }
  
  // Reset state for new page load
  hasUnsavedChanges = false;
  initialLoad = true;
  
  const params = getRouteParams();
  const journalId = params.id;
  currentJournalId = journalId;
  const isNew = journalId === 'new';

  const app = document.getElementById('app');
  
  app.innerHTML = `
    ${renderNavbar()}
    <div class="container" style="padding-top: 100px;">
      <div class="journal-view-header">
        <h1>${isNew ? 'New Journal Entry' : 'Edit Journal'}</h1>
        <div class="journal-view-actions">
          <span class="auto-save-indicator" id="save-status"></span>
          <button class="btn btn-secondary" onclick="navigateTo('/journals')">← Back to Journals</button>
          ${!isNew ? '<button class="btn btn-danger" id="delete-btn">Delete</button>' : ''}
        </div>
      </div>

      <div id="message-area"></div>

      <div class="card">
        <div class="form-group">
          <label class="form-label">Title (optional)</label>
          <input type="text" id="title-input" class="form-input" placeholder="Give your journal a title..." />
        </div>

        <div class="form-group">
          <label class="form-label">Your Journal</label>
          <div style="position: relative;">
            <textarea id="content-input" class="form-textarea" placeholder="Write your thoughts, events, feelings... The AI will auto-analyze after 5 seconds of inactivity." required></textarea>
            <button type="button" id="speech-to-text-btn" class="speech-to-text-btn" title="Click to record speech">
              <span id="mic-icon">🎤</span>
              <span id="mic-status" class="mic-status"></span>
            </button>
          </div>
        </div>

        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="btn btn-primary" id="save-btn">Save Journal</button>
          <div id="calendar-status"></div>
        </div>
      </div>

      <div id="analysis-section"></div>
    </div>
  `;

  let titleInput = document.getElementById('title-input');
  let contentInput = document.getElementById('content-input');
  let saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');
  const messageArea = document.getElementById('message-area');
  const analysisSection = document.getElementById('analysis-section');
  const calendarStatus = document.getElementById('calendar-status');

  // CRITICAL FIX: Clone elements to remove ALL old event listeners
  const newTitleInput = titleInput.cloneNode(true);
  const newContentInput = contentInput.cloneNode(true);
  const newSaveBtn = saveBtn.cloneNode(true);
  
  titleInput.parentNode.replaceChild(newTitleInput, titleInput);
  contentInput.parentNode.replaceChild(newContentInput, contentInput);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
  
  // Update references to use the clean cloned elements
  titleInput = newTitleInput;
  contentInput = newContentInput;
  saveBtn = newSaveBtn;

  // Load existing journal if not new
  if (!isNew) {
    try {
      const response = await journalAPI.getById(journalId);
      if (response.ok && response.data.success) {
        const journal = response.data.data;
        titleInput.value = journal.title || '';
        contentInput.value = journal.content || '';
        
        // Load existing analysis if available
        if (journal.analysis) {
          renderAnalysis(journal.analysis);
          // Store in localStorage for debugging
          localStorage.setItem('lastAnalysis', JSON.stringify(journal.analysis));
          console.log('📊 Loaded stored analysis from database');
        } else {
          console.log('ℹ️ No stored analysis for this journal');
        }
      }
    } catch (error) {
      showMessage('Error loading journal', 'error');
    }
  }

  // Check calendar connection
  checkCalendarConnection();

  // Auto-save functionality
  function setupAutoSave() {
    const autoSave = async () => {
      console.log('🔄 Auto-save triggered', { initialLoad, hasContent: !!contentInput.value.trim() });
      
      if (initialLoad) {
        initialLoad = false;
        console.log('⏭️ Skipping auto-save (initial load)');
        return;
      }

      // 🚫 DISABLE auto-save for NEW journals - only save when user clicks "Save Journal" button
      if (isNew || currentJournalId === 'new') {
        console.log('⏭️ Skipping auto-save (new journal - manual save only)');
        return;
      }

      if (!contentInput.value.trim()) {
        console.log('⏭️ Skipping auto-save (empty content)');
        return;
      }

      saveStatus.textContent = 'Saving...';
      console.log('💾 Auto-saving journal...');
      
      try {
        const data = {
          title: titleInput.value,
          content: contentInput.value,
          date: new Date().toISOString()
        };

        let response;
        if (isNew || !currentJournalId || currentJournalId === 'new') {
          response = await journalAPI.create(data);
          if (response.ok && response.data.success) {
            currentJournalId = response.data.data._id;
            // Update URL without reloading the page (preserves state and timers)
            history.replaceState(null, '', `#/journal/${currentJournalId}`);
          }
        } else {
          response = await journalAPI.update(currentJournalId, data);
        }

        if (response.ok) {
          saveStatus.textContent = '✓ Saved';
          console.log('✅ Auto-save successful');
          setTimeout(() => saveStatus.textContent = '', 2000);
          hasUnsavedChanges = false;
        } else {
          console.error('❌ Auto-save failed:', response);
        }
      } catch (error) {
        console.error('❌ Auto-save error:', error);
        saveStatus.textContent = '⚠ Save failed';
      }
    };

    console.log('🎯 Setting up auto-save listeners');
    
    // Add fresh event listeners to cloned elements (no need to remove - elements are brand new)
    titleInput.addEventListener('input', function handleTitleInput() {
      hasUnsavedChanges = true;
      
      // 🚫 DISABLE auto-save for NEW journals - only save when user clicks "Save Journal" button
      if (isNew || currentJournalId === 'new') {
        console.log('📝 Title changed - auto-save DISABLED (new journal - manual save only)');
        return;
      }
      
      console.log('📝 Title changed - auto-save in 2s');
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(autoSave, 2000);
    });

    contentInput.addEventListener('input', function handleContentInput() {
      hasUnsavedChanges = true;
      
      // 🚫 DISABLE auto-save for NEW journals - only save when user clicks "Save Journal" button
      if (isNew || currentJournalId === 'new') {
        console.log('📝 Content changed - auto-save & auto-analyze DISABLED (new journal - manual save only)');
        return;
      }
      
      console.log('📝 Content changed - auto-save in 2s, auto-analyze in 5s');
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(autoSave, 2000);
      
      // Trigger auto-analyze after 5 seconds (ONLY for existing journals)
      clearTimeout(autoAnalyzeTimer);
      autoAnalyzeTimer = setTimeout(autoAnalyze, 5000);
    });
  }

  // Auto-analyze functionality
  async function autoAnalyze() {
    console.log('🤖 Auto-analyze triggered', { 
      currentJournalId, 
      hasContent: !!contentInput.value.trim() 
    });
    
    if (!currentJournalId || currentJournalId === 'new' || !contentInput.value.trim()) {
      console.log('⏭️ Skipping auto-analyze (journal not saved yet or empty)');
      return;
    }

    console.log('🔍 Starting AI analysis...');
    analysisSection.innerHTML = '<div class="analysis-section"><div class="spinner"></div><p class="text-center">AI is analyzing your journal...</p></div>';

    try {
      const response = await journalAPI.analyze(currentJournalId);
      console.log('📊 Analysis response:', response);
      
      if (response.ok && response.data.success) {
        console.log('✅ Analysis successful:', response.data.data);
        
        // Store analysis in localStorage
        localStorage.setItem('lastAnalysis', JSON.stringify(response.data.data));
        console.log('💾 Analysis saved to localStorage');
        
        renderAnalysis(response.data.data);
        
        // Show success message if reminders were created
        if (response.data.data.autoCreatedReminders > 0) {
          const syncCount = response.data.data.autoSyncedToCalendar || 0;
          let msg = `✨ ${response.data.data.autoCreatedReminders} reminder(s) created automatically`;
          if (syncCount > 0) {
            msg += ` • ${syncCount} synced to Google Calendar`;
          }
          showMessage(msg, 'success');
        }
      } else {
        console.error('❌ Analysis failed:', response);
        analysisSection.innerHTML = `<div class="alert alert-error">Analysis failed: ${response.data.message}</div>`;
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      analysisSection.innerHTML = '<div class="alert alert-error">Analysis failed. Make sure Ollama is running.</div>';
    }
  }

  // Render analysis results
  function renderAnalysis(analysis) {
    let html = '<div class="analysis-section"><h2 class="analysis-title">🤖 AI Analysis</h2><div class="analysis-grid">';

    if (analysis.productive && analysis.productive.length > 0) {
      html += `
        <div class="analysis-card analysis-card-productive">
          <div class="analysis-card-header">
            <span class="analysis-card-icon">✅</span>
            <h3 class="analysis-card-title">Productive Activities</h3>
          </div>
          <ul class="analysis-list">
            ${analysis.productive.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (analysis.unproductive && analysis.unproductive.length > 0) {
      html += `
        <div class="analysis-card analysis-card-unproductive">
          <div class="analysis-card-header">
            <span class="analysis-card-icon">⏰</span>
            <h3 class="analysis-card-title">Unproductive Activities</h3>
          </div>
          <ul class="analysis-list">
            ${analysis.unproductive.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (analysis.rest && analysis.rest.length > 0) {
      html += `
        <div class="analysis-card analysis-card-rest">
          <div class="analysis-card-header">
            <span class="analysis-card-icon">😌</span>
            <h3 class="analysis-card-title">Restful Activities</h3>
          </div>
          <ul class="analysis-list">
            ${analysis.rest.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (analysis.emotional && analysis.emotional.length > 0) {
      html += `
        <div class="analysis-card analysis-card-emotional">
          <div class="analysis-card-header">
            <span class="analysis-card-icon">💭</span>
            <h3 class="analysis-card-title">Emotional States</h3>
          </div>
          <ul class="analysis-list">
            ${analysis.emotional.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (analysis.suggestions && analysis.suggestions.length > 0) {
      html += `
        <div class="analysis-card analysis-card-suggestions">
          <div class="analysis-card-header">
            <span class="analysis-card-icon">💡</span>
            <h3 class="analysis-card-title">Suggestions</h3>
          </div>
          <ul class="analysis-list">
            ${analysis.suggestions.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (analysis.detectedEvents && analysis.detectedEvents.length > 0) {
      html += `
        <div class="analysis-card analysis-card-events">
          <div class="analysis-card-header">
            <span class="analysis-card-icon">📅</span>
            <h3 class="analysis-card-title">Detected Events</h3>
          </div>
          <div class="events-list">
            ${analysis.detectedEvents.map(event => `
              <div class="event-card">
                <div class="event-card-title">${event.title}</div>
                <div class="event-card-date">📅 ${new Date(event.date).toLocaleString()}</div>
                ${event.description ? `<p class="event-card-description">${event.description}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      // Show "No events found" message
      html += `
        <div class="analysis-card analysis-card-events">
          <div class="analysis-card-header">
            <span class="analysis-card-icon">📅</span>
            <h3 class="analysis-card-title">Detected Events</h3>
          </div>
          <div class="events-list">
            <p style="text-align: center; color: #666; padding: 20px; font-style: italic;">
              No scheduled events or appointments detected in this journal entry.
            </p>
          </div>
        </div>
      `;
    }

    if (analysis.sentiment) {
      html += `
        <div class="analysis-card analysis-card-sentiment">
          <div class="analysis-card-header">
            <span class="analysis-card-icon">${analysis.sentiment === 'positive' ? '😊' : analysis.sentiment === 'negative' ? '😔' : '😐'}</span>
            <h3 class="analysis-card-title">Overall Sentiment</h3>
          </div>
          <div class="sentiment-badge sentiment-${analysis.sentiment}">${analysis.sentiment}</div>
        </div>
      `;
    }

    html += '</div></div>';
    analysisSection.innerHTML = html;
  }

  // Check calendar connection status
  async function checkCalendarConnection() {
    try {
      const response = await calendarAPI.getStatus();
      if (response.ok && response.data.success) {
        const isConnected = response.data.data.connected;
        if (isConnected) {
          calendarStatus.innerHTML = '<span class="calendar-status calendar-connected">✓ Calendar Connected</span>';
        } else {
          calendarStatus.innerHTML = '<button class="btn btn-primary" id="connect-calendar-btn">Connect Google Calendar</button>';
          document.getElementById('connect-calendar-btn').addEventListener('click', connectCalendar);
        }
      }
    } catch (error) {
      console.error('Error checking calendar status');
    }
  }

  // Connect to Google Calendar
  async function connectCalendar() {
    try {
      const response = await calendarAPI.getAuthUrl();
      if (response.ok && response.data.success) {
        window.location.href = response.data.data.authUrl;
      }
    } catch (error) {
      showMessage('Failed to get calendar auth URL', 'error');
    }
  }

  // Show message
  function showMessage(text, type) {
    messageArea.innerHTML = `<div class="alert alert-${type}">${text}</div>`;
    setTimeout(() => messageArea.innerHTML = '', 5000);
  }

  // Manual save button - add fresh event listener to cloned element
  async function handleSaveClick() {
    if (!contentInput.value.trim()) {
      showMessage('Please write something first', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const data = {
        title: titleInput.value,
        content: contentInput.value,
        date: new Date().toISOString()
      };

      let response;
      if (isNew || !currentJournalId || currentJournalId === 'new') {
        response = await journalAPI.create(data);
        if (response.ok && response.data.success) {
          currentJournalId = response.data.data._id;
          
          // DON'T navigate away - stay on same page so auto-analysis can run
          // Just update the URL without reloading the page
          history.replaceState(null, '', `#/journal/${currentJournalId}`);
          
          showMessage('Journal created successfully!', 'success');
          
          // 🤖 Auto-trigger analysis after manual save (5 second delay)
          console.log('⏳ Starting auto-analysis in 5 seconds after manual save...');
          setTimeout(() => {
            if (currentJournalId && currentJournalId !== 'new') {
              console.log('🚀 Triggering auto-analysis...');
              autoAnalyze();
            }
          }, 5000);
        }
      } else {
        response = await journalAPI.update(currentJournalId, data);
        if (response.ok) {
          showMessage('Journal updated successfully!', 'success');
          
          // 🤖 Auto-trigger analysis after manual save (5 second delay)
          console.log('⏳ Starting auto-analysis in 5 seconds after manual save...');
          setTimeout(() => {
            if (currentJournalId && currentJournalId !== 'new') {
              console.log('🚀 Triggering auto-analysis...');
              autoAnalyze();
            }
          }, 5000);
        }
      }
    } catch (error) {
      showMessage('Failed to save journal', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Journal';
    }
  }

  // Add fresh event listener to cloned element
  saveBtn.addEventListener('click', handleSaveClick);

  // Delete button - clone to remove ALL old event listeners
  if (!isNew) {
    let deleteBtn = document.getElementById('delete-btn');
    
    // Clone to remove all old listeners
    const newDeleteBtn = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
    deleteBtn = newDeleteBtn;
    
    async function handleDeleteClick() {
      if (!confirm('Are you sure you want to delete this journal?')) return;

      try {
        const response = await journalAPI.delete(currentJournalId);
        if (response.ok) {
          navigateTo('/journals');
        }
      } catch (error) {
        showMessage('Failed to delete journal', 'error');
      }
    }

    // Add fresh event listener to cloned element
    deleteBtn.addEventListener('click', handleDeleteClick);
  }

  // Setup auto-save
  console.log('🚀 Initializing journal view page', { isNew, journalId: currentJournalId });
  setupAutoSave();

  // Setup speech-to-text (pass showMessage function)
  setupSpeechToText(contentInput, showMessage);

  // Reset initial load flag after short delay
  setTimeout(() => {
    initialLoad = false;
    console.log('✅ Initial load complete - auto-save now active');
  }, 500);
}

// Speech-to-Text functionality using Web Speech API (Browser Native - Real-time)
let recognition = null;
let isRecording = false;
let finalTranscript = '';
let interimTranscript = '';

function setupSpeechToText(contentInput, showMessage) {
  const speechBtn = document.getElementById('speech-to-text-btn');
  const micIcon = document.getElementById('mic-icon');
  const micStatus = document.getElementById('mic-status');
  
  if (!speechBtn) return;

  // Check if browser supports Speech Recognition
  // Priority: webkitSpeechRecognition (Chrome) first, then SpeechRecognition (Edge/Safari)
  const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
  
  // Detect browser for better error messages
  const isBrave = navigator.brave && navigator.brave.isBrave;
  const userAgent = navigator.userAgent.toLowerCase();
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
  const isEdge = userAgent.includes('edg');
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
  
  if (!SpeechRecognition) {
    speechBtn.disabled = true;
    speechBtn.title = 'Speech recognition not supported in this browser';
    let browserMessage = 'Speech recognition is not supported in your browser.';
    if (isBrave) {
      browserMessage = 'Brave browser blocks Web Speech API for privacy. Please use Chrome, Edge, or Safari for speech recognition.';
    } else if (isChrome) {
      browserMessage = 'Speech recognition requires HTTPS or localhost. Please ensure you are using a secure connection.';
    } else {
      browserMessage = 'Please use Chrome, Edge, or Safari for speech recognition.';
    }
    if (showMessage) showMessage(browserMessage, 'error');
    return;
  }
  
  // Check if we're in a secure context (HTTPS or localhost)
  if (!window.isSecureContext) {
    speechBtn.disabled = true;
    speechBtn.title = 'Speech recognition requires HTTPS or localhost';
    if (showMessage) showMessage('Speech recognition requires a secure connection (HTTPS) or localhost. Please use HTTPS or run on localhost.', 'error');
    return;
  }
  
  // Check for internet connection (Web Speech API requires internet)
  if (!navigator.onLine) {
    speechBtn.disabled = true;
    speechBtn.title = 'Internet connection required for speech recognition';
    if (showMessage) showMessage('Speech recognition requires an internet connection. Please check your network connection.', 'error');
    return;
  }

  // Initialize Speech Recognition with proper configuration
  try {
    recognition = new SpeechRecognition();
    
    // Set properties before any other operations
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    // Additional Chrome-specific settings
    if (window.webkitSpeechRecognition) {
      // Chrome/WebKit specific settings
      recognition.maxAlternatives = 1;
    }
  } catch (error) {
    console.error('Error initializing Speech Recognition:', error);
    speechBtn.disabled = true;
    speechBtn.title = 'Failed to initialize speech recognition';
    if (showMessage) {
      let errorMsg = 'Failed to initialize speech recognition. ';
      if (isBrave) {
        errorMsg += 'Brave browser blocks this feature. Please use Chrome, Edge, or Safari.';
      } else {
        errorMsg += 'Please check your browser settings and try again.';
      }
      showMessage(errorMsg, 'error');
    }
    return;
  }

  recognition.onstart = () => {
    isRecording = true;
    finalTranscript = '';
    interimTranscript = '';
    
    // Store the cursor position and text before starting
    const cursorPos = contentInput.selectionStart;
    const textBefore = contentInput.value.substring(0, cursorPos);
    const textAfter = contentInput.value.substring(cursorPos);
    
    // Store these for later use
    contentInput.dataset.speechStartPos = cursorPos;
    contentInput.dataset.speechTextBefore = textBefore;
    contentInput.dataset.speechTextAfter = textAfter;
    
    micIcon.textContent = '⏹️';
    micStatus.textContent = 'Listening...';
    speechBtn.classList.add('recording');
    if (showMessage) showMessage('Speech recognition started. Speak now!', 'success');
  };

  recognition.onresult = (event) => {
    let newFinalTranscript = '';
    let newInterimTranscript = '';
    
    // Process all results since last event
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        // Add to final transcript
        finalTranscript += transcript + ' ';
        interimTranscript = ''; // Clear interim when we get final
      } else {
        // Update interim transcript
        interimTranscript = transcript;
      }
    }
    
    // Get the stored insertion point
    const startPos = parseInt(contentInput.dataset.speechStartPos || 0);
    const textBefore = contentInput.dataset.speechTextBefore || '';
    const textAfter = contentInput.dataset.speechTextAfter || '';
    
    // Combine final and interim transcripts
    const fullTranscript = (finalTranscript + interimTranscript).trim();
    
    // Reconstruct the textarea value
    const separator = textBefore.trim() && !textBefore.endsWith(' ') ? ' ' : '';
    const newValue = textBefore + separator + fullTranscript + textAfter;
    
    // Only update if something changed
    if (newValue !== contentInput.value) {
      contentInput.value = newValue;
      
      // Update cursor position to end of inserted text
      const newCursorPos = textBefore.length + separator.length + fullTranscript.length;
      contentInput.setSelectionRange(newCursorPos, newCursorPos);
      
      // Trigger input event to activate auto-save (but throttle it)
      if (!contentInput._speechInputTimeout) {
        contentInput._speechInputTimeout = setTimeout(() => {
          contentInput.dispatchEvent(new Event('input', { bubbles: true }));
          contentInput._speechInputTimeout = null;
        }, 500); // Throttle to every 500ms
      }
    }
    
    // Show status
    if (interimTranscript) {
      micStatus.textContent = `Listening: ${interimTranscript.substring(0, 40)}...`;
    } else if (finalTranscript) {
      micStatus.textContent = '✓ Transcribed';
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isRecording = false;
    micIcon.textContent = '🎤';
    speechBtn.classList.remove('recording');
    speechBtn.disabled = false;
    
    let errorMessage = 'Speech recognition error';
    let statusMessage = '❌ Error';
    
    if (event.error === 'no-speech') {
      errorMessage = 'No speech detected. Please try again.';
      statusMessage = 'No speech detected';
    } else if (event.error === 'audio-capture') {
      errorMessage = 'No microphone found. Please check your microphone connection.';
      statusMessage = 'No microphone';
    } else if (event.error === 'not-allowed') {
      errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
      statusMessage = 'Permission denied';
    } else if (event.error === 'network') {
      errorMessage = 'Network error: Speech recognition requires an internet connection. Please check your connection and try again.';
      statusMessage = 'Network error';
      // For Brave, provide specific message
      if (isBrave) {
        errorMessage = 'Brave browser blocks Web Speech API for privacy. Please use Chrome, Edge, or Safari for speech recognition.';
        statusMessage = 'Blocked by Brave';
      }
    } else if (event.error === 'aborted') {
      errorMessage = 'Speech recognition was aborted.';
      statusMessage = 'Aborted';
    } else if (event.error === 'service-not-allowed') {
      errorMessage = 'Speech recognition service is not available. Please try again later.';
      statusMessage = 'Service unavailable';
    } else {
      errorMessage = `Speech recognition error: ${event.error}. Please check your internet connection and microphone permissions.`;
      statusMessage = `Error: ${event.error}`;
    }
    
    micStatus.textContent = statusMessage;
    
    if (showMessage) {
      showMessage(errorMessage, 'error');
    }
    
    // For network errors, show a longer message
    const timeoutDuration = event.error === 'network' ? 5000 : 3000;
    setTimeout(() => {
      micStatus.textContent = '';
    }, timeoutDuration);
  };

  recognition.onend = () => {
    // Clear any pending input timeout
    if (contentInput._speechInputTimeout) {
      clearTimeout(contentInput._speechInputTimeout);
      contentInput._speechInputTimeout = null;
    }
    
    // Final update with any remaining interim text
    if (interimTranscript.trim() && !finalTranscript.includes(interimTranscript)) {
      finalTranscript += interimTranscript + ' ';
      interimTranscript = '';
    }
    
    isRecording = false;
    micIcon.textContent = '🎤';
    speechBtn.classList.remove('recording');
    speechBtn.disabled = false;
    
    // Final update to textarea
    if (finalTranscript.trim()) {
      const startPos = parseInt(contentInput.dataset.speechStartPos || 0);
      const textBefore = contentInput.dataset.speechTextBefore || '';
      const textAfter = contentInput.dataset.speechTextAfter || '';
      
      const separator = textBefore.trim() && !textBefore.endsWith(' ') ? ' ' : '';
      const textToInsert = finalTranscript.trim();
      const finalValue = textBefore + separator + textToInsert + textAfter;
      
      if (contentInput.value !== finalValue) {
        contentInput.value = finalValue;
        
        const newCursorPos = textBefore.length + separator.length + textToInsert.length;
        contentInput.setSelectionRange(newCursorPos, newCursorPos);
      }
      
      // Trigger final input event for auto-save
      contentInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      micStatus.textContent = '✓ Transcribed';
      if (showMessage) showMessage('Speech transcribed successfully!', 'success');
      
      setTimeout(() => {
        micStatus.textContent = '';
      }, 2000);
    } else {
      micStatus.textContent = '';
    }
    
    // Clean up stored data
    delete contentInput.dataset.speechStartPos;
    delete contentInput.dataset.speechTextBefore;
    delete contentInput.dataset.speechTextAfter;
  };

  speechBtn.addEventListener('click', () => {
    if (isRecording) {
      // Stop recording
      recognition.stop();
    } else {
      // Check internet connection before starting
      if (!navigator.onLine) {
        if (showMessage) showMessage('Internet connection required. Please check your network and try again.', 'error');
        return;
      }
      
      // Start recording
      try {
        finalTranscript = '';
        interimTranscript = '';
        recognition.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        let errorMsg = 'Failed to start speech recognition. ';
        if (error.message && error.message.includes('already started')) {
          errorMsg += 'Recognition is already running.';
        } else if (!navigator.onLine) {
          errorMsg += 'Internet connection required.';
        } else {
          errorMsg += error.message || 'Please check your internet connection and microphone permissions.';
        }
        if (showMessage) showMessage(errorMsg, 'error');
      }
    }
  });
  
  // Listen for online/offline events to update button state
  window.addEventListener('online', () => {
    if (speechBtn.disabled && speechBtn.title.includes('Internet')) {
      speechBtn.disabled = false;
      speechBtn.title = 'Click to record speech';
    }
  });
  
  window.addEventListener('offline', () => {
    if (isRecording) {
      recognition.stop();
    }
    speechBtn.disabled = true;
    speechBtn.title = 'Internet connection required for speech recognition';
    if (showMessage) showMessage('Internet connection lost. Speech recognition requires an active connection.', 'error');
  });
}

// Register route
addRoute('/journal/:id', renderJournalViewPage);
