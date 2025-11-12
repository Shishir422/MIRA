// API Client - Vanilla JS with Fetch API
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    
    // Return both response and data for error handling
    return {
      ok: response.ok,
      status: response.status,
      data: data
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      data: {
        success: false,
        message: error.message || 'Network error',
        data: null
      }
    };
  }
}

// Auth API
const authAPI = {
  async login(email, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async signup(name, email, password) {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async getMe() {
    return apiRequest('/auth/me');
  }
};

// Journal API
const journalAPI = {
  async getAll() {
    return apiRequest('/journals');
  },

  async getById(id) {
    return apiRequest(`/journals/${id}`);
  },

  async create(data) {
    return apiRequest('/journals/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return apiRequest(`/journals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return apiRequest(`/journals/${id}`, {
      method: 'DELETE',
    });
  },

  async analyze(id) {
    return apiRequest(`/journals/${id}/analyze`, {
      method: 'POST',
    });
  }
};

// Reminder API
const reminderAPI = {
  async propose(eventData) {
    return apiRequest('/reminders/propose', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  async confirm(id) {
    return apiRequest(`/reminders/${id}/confirm`, {
      method: 'POST',
    });
  },

  async getAll() {
    return apiRequest('/reminders');
  },

  async delete(id) {
    return apiRequest(`/reminders/${id}`, {
      method: 'DELETE',
    });
  },

  async syncToCalendar(id) {
    return apiRequest(`/reminders/${id}/sync-to-calendar`, {
      method: 'POST',
    });
  },

  async toggleComplete(id) {
    return apiRequest(`/reminders/${id}/toggle-complete`, {
      method: 'PUT',
    });
  }
};

// Calendar API
const calendarAPI = {
  async getAuthUrl() {
    return apiRequest('/calendar/auth');
  },

  async getStatus() {
    return apiRequest('/calendar/status');
  },

  async disconnect() {
    return apiRequest('/calendar/disconnect', {
      method: 'POST',
    });
  }
};

// Whisper API (Speech-to-Text)
const whisperAPI = {
  async transcribe(audioFile) {
    const token = getToken();
    const formData = new FormData();
    formData.append('audio', audioFile);

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/whisper/transcribe`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        return {
          ok: false,
          status: response.status,
          data: {
            success: false,
            message: `Server returned non-JSON response. Status: ${response.status}`,
            data: null
          }
        };
      }

      const data = await response.json();
      
      return {
        ok: response.ok,
        status: response.status,
        data: data
      };
    } catch (error) {
      console.error('Whisper API error:', error);
      return {
        ok: false,
        status: 500,
        data: {
          success: false,
          message: error.message || 'Network error',
          data: null
        }
      };
    }
  }
};

// Todo API
const todoAPI = {
  async getAll() {
    return apiRequest('/todos');
  },

  async create(data) {
    return apiRequest('/todos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return apiRequest(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return apiRequest(`/todos/${id}`, {
      method: 'DELETE',
    });
  },

  async reorder(todoIds) {
    return apiRequest('/todos/reorder', {
      method: 'POST',
      body: JSON.stringify({ todoIds }),
    });
  },

  async prioritizeWithAI() {
    return apiRequest('/todos/prioritize-ai', {
      method: 'POST',
    });
  },

  async chatWithAI(message) {
    return apiRequest('/todos/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
};
