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
            // Update URL without reload
            window.location.hash = `/journal/${currentJournalId}`;
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
      console.log('📝 Title changed - auto-save in 2s');
      hasUnsavedChanges = true;
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(autoSave, 2000);
    });

    contentInput.addEventListener('input', function handleContentInput() {
      console.log('📝 Content changed - auto-save in 2s, auto-analyze in 5s');
      hasUnsavedChanges = true;
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(autoSave, 2000);
      
      // Trigger auto-analyze after 5 seconds
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
          window.location.hash = `/journal/${currentJournalId}`;
          showMessage('Journal created successfully!', 'success');
        }
      } else {
        response = await journalAPI.update(currentJournalId, data);
        if (response.ok) {
          showMessage('Journal updated successfully!', 'success');
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

// Speech-to-Text functionality using Whisper API
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

function setupSpeechToText(contentInput, showMessage) {
  const speechBtn = document.getElementById('speech-to-text-btn');
  const micIcon = document.getElementById('mic-icon');
  const micStatus = document.getElementById('mic-status');
  
  if (!speechBtn) return;

  speechBtn.addEventListener('click', async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  });

  async function startRecording() {
    try {
      // Check for OpenAI API key
      let apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey) {
        apiKey = prompt('Please enter your OpenAI API key to use speech-to-text:\n\n(Your key will be stored locally in your browser)');
        if (!apiKey || !apiKey.trim()) {
          if (showMessage) showMessage('API key is required for speech-to-text', 'error');
          return;
        }
        localStorage.setItem('openai_api_key', apiKey.trim());
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio();
      };

      mediaRecorder.start();
      isRecording = true;
      
      micIcon.textContent = '⏹️';
      micStatus.textContent = 'Recording...';
      speechBtn.classList.add('recording');
      if (showMessage) showMessage('Recording started. Click again to stop.', 'success');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        if (showMessage) showMessage('Microphone permission denied. Please allow microphone access.', 'error');
      } else {
        if (showMessage) showMessage('Failed to start recording: ' + error.message, 'error');
      }
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
      
      micIcon.textContent = '🎤';
      micStatus.textContent = 'Processing...';
      speechBtn.classList.remove('recording');
      speechBtn.disabled = true;
    }
  }

  async function transcribeAudio() {
    try {
      const micStatus = document.getElementById('mic-status');
      micStatus.textContent = 'Transcribing...';
      
      // Convert audio chunks to blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      
      // Convert to file format for OpenAI API
      const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Optional: specify language
      
      // Get API key
      const apiKey = localStorage.getItem('openai_api_key');
      
      // Call OpenAI Whisper API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const transcribedText = data.text;
      
      // Insert transcribed text into textarea
      const currentText = contentInput.value;
      const cursorPos = contentInput.selectionStart;
      const textBefore = currentText.substring(0, cursorPos);
      const textAfter = currentText.substring(cursorPos);
      
      // Add space if there's text before
      const separator = textBefore.trim() && !textBefore.endsWith(' ') ? ' ' : '';
      contentInput.value = textBefore + separator + transcribedText + textAfter;
      
      // Set cursor position after inserted text
      const newCursorPos = cursorPos + separator.length + transcribedText.length;
      contentInput.setSelectionRange(newCursorPos, newCursorPos);
      
      // Trigger input event to activate auto-save
      contentInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      micStatus.textContent = '✓ Transcribed';
      speechBtn.disabled = false;
      if (showMessage) showMessage('Speech transcribed successfully!', 'success');
      
      // Reset status after 2 seconds
      setTimeout(() => {
        micStatus.textContent = '';
      }, 2000);
      
    } catch (error) {
      console.error('Error transcribing audio:', error);
      micStatus.textContent = '❌ Error';
      speechBtn.disabled = false;
      
      if (error.message.includes('API key') || error.message.includes('401')) {
        localStorage.removeItem('openai_api_key');
        if (showMessage) showMessage('Invalid API key. Please try again.', 'error');
      } else {
        if (showMessage) showMessage('Failed to transcribe: ' + error.message, 'error');
      }
      
      setTimeout(() => {
        micStatus.textContent = '';
      }, 3000);
    }
  }
}

// Register route
addRoute('/journal/:id', renderJournalViewPage);
