// Todos Page - Todo list management
let todos = [];
let draggedElement = null;
let draggedIndex = null;

async function renderTodosPage() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    ${renderNavbar()}
    <div class="container" style="padding-top: 100px;">
      <div class="todos-header">
        <div>
          <h1 class="todos-title"><span class="title-emoji">✅</span> Todo List</h1>
          <p class="todos-subtitle">Manage your tasks and stay organized</p>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="btn btn-outline" id="ai-prioritize-btn" title="Let AI prioritize your tasks">
            🤖 AI Prioritize
          </button>
          <button class="btn btn-primary" id="ai-chat-toggle-btn">
            💬 AI Chat
          </button>
        </div>
      </div>

      <!-- AI Chat Panel -->
      <div id="ai-chat-panel" class="ai-chat-panel" style="display: none;">
        <div class="ai-chat-header">
          <h3>💬 AI Assistant</h3>
          <button class="ai-chat-close" id="ai-chat-close-btn">×</button>
        </div>
        <div class="ai-chat-messages" id="ai-chat-messages">
          <div class="ai-message ai-message-bot">
            <p>Hi! I can help you add tasks to your todo list. Just tell me what you need to do, and I'll add them for you!</p>
          </div>
        </div>
        <div class="ai-chat-input-container">
          <input type="text" id="ai-chat-input" class="ai-chat-input" placeholder="Type your message... (e.g., 'Add tasks: finish report, call mom, buy groceries')" />
          <button class="btn btn-primary" id="ai-chat-send-btn">Send</button>
        </div>
      </div>

      <!-- Add Task Form -->
      <div class="todo-add-form">
        <div style="display: flex; gap: 12px; width: 100%;">
          <input 
            type="text" 
            id="todo-input" 
            class="todo-input" 
            placeholder="Add a new task..." 
            autocomplete="off"
          />
          <div style="display: flex; gap: 4px; align-items: center;">
            <input 
              type="text" 
              id="todo-due-date" 
              class="todo-due-date" 
              placeholder="MM-DD"
              pattern="[0-1][0-9]-[0-3][0-9]"
              maxlength="5"
              title="Optional: Date (MM-DD format, e.g., 11-15)"
            />
            <input 
              type="time" 
              id="todo-due-time" 
              class="todo-due-time" 
              title="Optional: Time"
            />
          </div>
          <button class="btn btn-primary" id="add-todo-btn">Add Task</button>
        </div>
      </div>

      <!-- Todos List -->
      <div id="todos-content">
        <div class="spinner"></div>
      </div>
    </div>
  `;

  // Load todos
  await loadTodos();

  // Setup event listeners
  setupTodoEventListeners();
}

async function loadTodos() {
  const content = document.getElementById('todos-content');
  
  try {
    const response = await todoAPI.getAll();
    
    if (response.ok && response.data.success) {
      todos = response.data.data || [];
      renderTodos();
    } else {
      content.innerHTML = `
        <div class="card text-center">
          <h3>Failed to load todos</h3>
          <p class="mb-4">${response.data.message || 'Unknown error'}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading todos:', error);
    content.innerHTML = `
      <div class="card text-center">
        <h3>Error loading todos</h3>
        <p class="mb-4">${error.message}</p>
      </div>
    `;
  }
}

function renderTodos() {
  const content = document.getElementById('todos-content');
  
  if (todos.length === 0) {
    content.innerHTML = `
      <div class="card text-center">
        <h3>No tasks yet</h3>
        <p class="mb-4">Add your first task above to get started!</p>
      </div>
    `;
    return;
  }

  // Separate completed and incomplete todos
  const incompleteTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  // Sort incomplete todos: by priority (desc), then order (desc), then dueTime (asc)
  incompleteTodos.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (b.order !== a.order) return b.order - a.order;
    if (a.dueTime && b.dueTime) {
      return new Date(a.dueTime) - new Date(b.dueTime);
    }
    if (a.dueTime) return -1;
    if (b.dueTime) return 1;
    return 0;
  });

  // Sort completed todos: most recent first
  completedTodos.sort((a, b) => {
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  content.innerHTML = `
    ${incompleteTodos.length > 0 ? `
      <div class="todos-section">
        <h2 class="todos-section-title">Active Tasks (${incompleteTodos.length})</h2>
        <div class="todos-list" id="todos-list-incomplete">
          ${incompleteTodos.map((todo, index) => renderTodoItem(todo, index, false)).join('')}
        </div>
      </div>
    ` : ''}
    ${completedTodos.length > 0 ? `
      <div class="todos-section" style="margin-top: 32px;">
        <h2 class="todos-section-title">Completed (${completedTodos.length})</h2>
        <div class="todos-list" id="todos-list-completed">
          ${completedTodos.map((todo, index) => renderTodoItem(todo, index, true)).join('')}
        </div>
      </div>
    ` : ''}
  `;

  // Setup drag and drop
  setupDragAndDrop();
  
  // Setup event listeners for todos
  setupTodoItemListeners();
}

function renderTodoItem(todo, index, isCompleted) {
  const dueTimeStr = todo.dueTime 
    ? (() => {
        const date = new Date(todo.dueTime);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${month}-${day} ${displayHours}:${minutes} ${ampm}`;
      })()
    : '';

  return `
    <div 
      class="todo-item ${isCompleted ? 'todo-item-completed' : ''} ${!isCompleted ? 'todo-item-draggable' : ''}" 
      data-todo-id="${todo._id}"
      data-index="${index}"
      draggable="${!isCompleted}"
    >
      <div class="todo-item-content">
        <input 
          type="checkbox" 
          class="todo-checkbox" 
          id="todo-checkbox-${todo._id}"
          ${todo.completed ? 'checked' : ''}
          data-todo-id="${todo._id}"
        />
        <div class="todo-text-container">
          ${isCompleted ? `
            <span class="todo-text todo-text-strikethrough">${escapeHtml(todo.text)}</span>
          ` : `
            <input 
              type="text" 
              class="todo-text-input" 
              value="${escapeHtml(todo.text)}"
              data-todo-id="${todo._id}"
              data-original-value="${escapeHtml(todo.text)}"
            />
          `}
          ${dueTimeStr ? `
            <span class="todo-due-time-badge">🕐 ${dueTimeStr}</span>
          ` : ''}
        </div>
      </div>
      <div class="todo-item-actions">
        ${!isCompleted ? `
          <button class="todo-action-btn todo-edit-btn" data-todo-id="${todo._id}" title="Edit">✏️</button>
        ` : ''}
        <button class="todo-action-btn todo-delete-btn" data-todo-id="${todo._id}" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

function setupTodoEventListeners() {
  // Add todo button
  const addBtn = document.getElementById('add-todo-btn');
  const todoInput = document.getElementById('todo-input');
  const todoDueDate = document.getElementById('todo-due-date');
  const todoDueTime = document.getElementById('todo-due-time');

  // Format date input as user types (MM-DD)
  if (todoDueDate) {
    todoDueDate.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
      if (value.length >= 2) {
        value = value.substring(0, 2) + '-' + value.substring(2, 4);
      }
      e.target.value = value;
    });
    
    todoDueDate.addEventListener('keypress', (e) => {
      // Only allow numbers
      if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
        e.preventDefault();
      }
    });
  }

  addBtn.addEventListener('click', async () => {
    await addTodo();
  });

  todoInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      await addTodo();
    }
  });

  // AI Prioritize button
  const aiPrioritizeBtn = document.getElementById('ai-prioritize-btn');
  aiPrioritizeBtn.addEventListener('click', async () => {
    await prioritizeWithAI();
  });

  // AI Chat toggle
  const aiChatToggleBtn = document.getElementById('ai-chat-toggle-btn');
  const aiChatPanel = document.getElementById('ai-chat-panel');
  const aiChatCloseBtn = document.getElementById('ai-chat-close-btn');

  aiChatToggleBtn.addEventListener('click', () => {
    aiChatPanel.style.display = aiChatPanel.style.display === 'none' ? 'block' : 'none';
  });

  aiChatCloseBtn.addEventListener('click', () => {
    aiChatPanel.style.display = 'none';
  });

  // AI Chat send
  const aiChatInput = document.getElementById('ai-chat-input');
  const aiChatSendBtn = document.getElementById('ai-chat-send-btn');

  aiChatSendBtn.addEventListener('click', async () => {
    await sendAIChatMessage();
  });

  aiChatInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      await sendAIChatMessage();
    }
  });
}

function setupTodoItemListeners() {
  // Checkbox listeners
  document.querySelectorAll('.todo-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const todoId = e.target.dataset.todoId;
      await toggleTodoComplete(todoId);
    });
  });

  // Text input listeners (for editing)
  document.querySelectorAll('.todo-text-input').forEach(input => {
    let isEditing = false;
    
    input.addEventListener('focus', () => {
      isEditing = true;
      input.dataset.originalValue = input.value;
    });

    input.addEventListener('blur', async () => {
      if (isEditing && input.value !== input.dataset.originalValue) {
        const todoId = input.dataset.todoId;
        await updateTodoText(todoId, input.value);
      }
      isEditing = false;
    });

    input.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });
  });

  // Edit button listeners
  document.querySelectorAll('.todo-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const todoId = e.target.dataset.todoId;
      const todoItem = document.querySelector(`[data-todo-id="${todoId}"]`);
      if (todoItem) {
        const textInput = todoItem.querySelector('.todo-text-input');
        if (textInput) {
          textInput.focus();
          textInput.select();
        }
      }
    });
  });

  // Delete button listeners
  document.querySelectorAll('.todo-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const todoId = e.target.dataset.todoId;
      if (confirm('Are you sure you want to delete this task?')) {
        await deleteTodo(todoId);
      }
    });
  });
}

function setupDragAndDrop() {
  const incompleteList = document.getElementById('todos-list-incomplete');
  if (!incompleteList) return;

  const todoItems = incompleteList.querySelectorAll('.todo-item-draggable');

  todoItems.forEach((item, index) => {
    item.addEventListener('dragstart', (e) => {
      draggedElement = item;
      draggedIndex = index;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', item.innerHTML);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedElement = null;
      draggedIndex = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const afterElement = getDragAfterElement(incompleteList, e.clientY);
      const dragging = incompleteList.querySelector('.dragging');
      
      if (afterElement == null) {
        incompleteList.appendChild(dragging);
      } else {
        incompleteList.insertBefore(dragging, afterElement);
      }
    });

    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      await saveNewOrder();
    });
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.todo-item-draggable:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function saveNewOrder() {
  const incompleteList = document.getElementById('todos-list-incomplete');
  if (!incompleteList) return;

  const todoItems = incompleteList.querySelectorAll('.todo-item-draggable');
  const todoIds = Array.from(todoItems).map(item => item.dataset.todoId);

  try {
    const response = await todoAPI.reorder(todoIds);
    if (response.ok && response.data.success) {
      todos = response.data.data || [];
      renderTodos();
    } else {
      alert('Failed to reorder todos: ' + response.data.message);
      await loadTodos(); // Reload to restore original order
    }
  } catch (error) {
    console.error('Error reordering todos:', error);
    alert('Failed to reorder todos. Please try again.');
    await loadTodos();
  }
}

async function addTodo() {
  const todoInput = document.getElementById('todo-input');
  const todoDueDate = document.getElementById('todo-due-date');
  const todoDueTime = document.getElementById('todo-due-time');
  
  const text = todoInput.value.trim();
  if (!text) return;

  // Parse date (MM-DD) and time, combine with current year
  let dueTime = null;
  if (todoDueDate.value || todoDueTime.value) {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (todoDueDate.value) {
      // Parse MM-DD format
      const [month, day] = todoDueDate.value.split('-').map(Number);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const dueDate = new Date(currentYear, month - 1, day);
        
        // If time is provided, add it
        if (todoDueTime.value) {
          const [hours, minutes] = todoDueTime.value.split(':').map(Number);
          dueDate.setHours(hours, minutes, 0, 0);
        } else {
          dueDate.setHours(9, 0, 0, 0); // Default to 9 AM if no time specified
        }
        
        dueTime = dueDate.toISOString();
      }
    } else if (todoDueTime.value) {
      // Only time provided, use today's date
      const dueDate = new Date();
      const [hours, minutes] = todoDueTime.value.split(':').map(Number);
      dueDate.setHours(hours, minutes, 0, 0);
      dueTime = dueDate.toISOString();
    }
  }

  try {
    const response = await todoAPI.create({ text, dueTime });
    if (response.ok && response.data.success) {
      todoInput.value = '';
      todoDueDate.value = '';
      todoDueTime.value = '';
      await loadTodos();
    } else {
      alert('Failed to add task: ' + response.data.message);
    }
  } catch (error) {
    console.error('Error adding todo:', error);
    alert('Failed to add task. Please try again.');
  }
}

async function toggleTodoComplete(todoId) {
  const todo = todos.find(t => t._id === todoId);
  if (!todo) return;

  try {
    const response = await todoAPI.update(todoId, { completed: !todo.completed });
    if (response.ok && response.data.success) {
      await loadTodos();
    } else {
      alert('Failed to update task: ' + response.data.message);
      await loadTodos(); // Reload to restore checkbox state
    }
  } catch (error) {
    console.error('Error toggling todo:', error);
    alert('Failed to update task. Please try again.');
    await loadTodos();
  }
}

async function updateTodoText(todoId, newText) {
  if (!newText.trim()) {
    alert('Task text cannot be empty');
    await loadTodos();
    return;
  }

  try {
    const response = await todoAPI.update(todoId, { text: newText.trim() });
    if (response.ok && response.data.success) {
      todos = todos.map(t => t._id === todoId ? response.data.data : t);
    } else {
      alert('Failed to update task: ' + response.data.message);
      await loadTodos();
    }
  } catch (error) {
    console.error('Error updating todo:', error);
    alert('Failed to update task. Please try again.');
    await loadTodos();
  }
}

async function deleteTodo(todoId) {
  try {
    const response = await todoAPI.delete(todoId);
    if (response.ok && response.data.success) {
      await loadTodos();
    } else {
      alert('Failed to delete task: ' + response.data.message);
    }
  } catch (error) {
    console.error('Error deleting todo:', error);
    alert('Failed to delete task. Please try again.');
  }
}

async function prioritizeWithAI() {
  const incompleteTodos = todos.filter(t => !t.completed);
  if (incompleteTodos.length === 0) {
    alert('No incomplete tasks to prioritize');
    return;
  }

  const btn = document.getElementById('ai-prioritize-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '🤖 Prioritizing...';

  try {
    const response = await todoAPI.prioritizeWithAI();
    if (response.ok && response.data.success) {
      todos = response.data.data || [];
      renderTodos();
      alert('Tasks prioritized successfully!');
    } else {
      alert('Failed to prioritize tasks: ' + response.data.message);
    }
  } catch (error) {
    console.error('Error prioritizing todos:', error);
    alert('Failed to prioritize tasks. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function sendAIChatMessage() {
  const input = document.getElementById('ai-chat-input');
  const messagesContainer = document.getElementById('ai-chat-messages');
  const message = input.value.trim();

  if (!message) return;

  // Add user message
  const userMessage = document.createElement('div');
  userMessage.className = 'ai-message ai-message-user';
  userMessage.innerHTML = `<p>${escapeHtml(message)}</p>`;
  messagesContainer.appendChild(userMessage);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  input.value = '';
  input.disabled = true;

  // Show loading
  const loadingMessage = document.createElement('div');
  loadingMessage.className = 'ai-message ai-message-bot';
  loadingMessage.innerHTML = '<p>🤖 Thinking...</p>';
  messagesContainer.appendChild(loadingMessage);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    const response = await todoAPI.chatWithAI(message);
    if (response.ok && response.data.success) {
      // Remove loading message
      loadingMessage.remove();

      // Add AI response
      const botMessage = document.createElement('div');
      botMessage.className = 'ai-message ai-message-bot';
      botMessage.innerHTML = `<p>${escapeHtml(response.data.data.response)}</p>`;
      messagesContainer.appendChild(botMessage);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Reload todos if tasks were added
      if (response.data.data.tasks && response.data.data.tasks.length > 0) {
        await loadTodos();
      }
    } else {
      loadingMessage.remove();
      const errorMessage = document.createElement('div');
      errorMessage.className = 'ai-message ai-message-bot';
      errorMessage.innerHTML = `<p>❌ Error: ${escapeHtml(response.data.message || 'Failed to process message')}</p>`;
      messagesContainer.appendChild(errorMessage);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  } catch (error) {
    console.error('Error in AI chat:', error);
    loadingMessage.remove();
    const errorMessage = document.createElement('div');
    errorMessage.className = 'ai-message ai-message-bot';
    errorMessage.innerHTML = `<p>❌ Error: ${escapeHtml(error.message || 'Failed to process message')}</p>`;
    messagesContainer.appendChild(errorMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Register route
addRoute('/todos', renderTodosPage);

