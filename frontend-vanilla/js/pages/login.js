// Login/Signup Page
function renderLoginPage() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    ${renderNavbar()}
    <div class="login-container">
      <div class="card login-card">
        <h2 class="login-title" id="login-title">AI Journal Login</h2>
        
        <div id="error-message" class="hidden"></div>
        
        <form id="auth-form">
          <div id="name-group" class="form-group hidden">
            <label class="form-label">Name</label>
            <input type="text" id="name-input" class="form-input" placeholder="Your name" />
          </div>

          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="email-input" class="form-input" placeholder="your@email.com" required />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="password-input" class="form-input" placeholder="••••••••" required minlength="6" />
          </div>

          <button type="submit" class="btn btn-primary" id="submit-btn" style="width: 100%;">
            Login
          </button>
        </form>

        <div class="text-center mt-6">
          <button class="btn-link" id="toggle-mode">
            Don't have an account? Sign up
          </button>
        </div>
      </div>
    </div>
  `;

  // Check if signup mode is requested via query parameter
  const urlParams = new URLSearchParams(window.location.search);
  let isSignup = urlParams.get('signup') === 'true';
  
  const form = document.getElementById('auth-form');
  const nameGroup = document.getElementById('name-group');
  const nameInput = document.getElementById('name-input');
  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  const submitBtn = document.getElementById('submit-btn');
  const toggleBtn = document.getElementById('toggle-mode');
  const errorDiv = document.getElementById('error-message');
  const titleEl = document.getElementById('login-title');

  // Initialize form state based on signup parameter
  if (isSignup) {
    titleEl.textContent = 'Create Account';
    submitBtn.textContent = 'Sign Up';
    toggleBtn.textContent = 'Already have an account? Login';
    nameGroup.classList.remove('hidden');
    nameInput.required = true;
  }

  // Toggle between login and signup
  toggleBtn.addEventListener('click', () => {
    isSignup = !isSignup;
    
    if (isSignup) {
      titleEl.textContent = 'Create Account';
      submitBtn.textContent = 'Sign Up';
      toggleBtn.textContent = 'Already have an account? Login';
      nameGroup.classList.remove('hidden');
      nameInput.required = true;
    } else {
      titleEl.textContent = 'AI Journal Login';
      submitBtn.textContent = 'Login';
      toggleBtn.textContent = "Don't have an account? Sign up";
      nameGroup.classList.add('hidden');
      nameInput.required = false;
    }

    // Clear form and errors
    form.reset();
    errorDiv.classList.add('hidden');
  });

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = isSignup ? 'Creating account...' : 'Logging in...';

    try {
      const email = emailInput.value;
      const password = passwordInput.value;
      
      let response;
      if (isSignup) {
        const name = nameInput.value;
        response = await authAPI.signup(name, email, password);
      } else {
        response = await authAPI.login(email, password);
      }

      if (response.ok && response.data.success) {
        setToken(response.data.data.token);
        navigateTo('/journals');
      } else {
        errorDiv.className = 'alert alert-error';
        errorDiv.textContent = response.data.message || `${isSignup ? 'Signup' : 'Login'} failed`;
        errorDiv.classList.remove('hidden');
      }
    } catch (error) {
      errorDiv.className = 'alert alert-error';
      errorDiv.textContent = `${isSignup ? 'Signup' : 'Login'} failed. Please try again.`;
      errorDiv.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isSignup ? 'Sign Up' : 'Login';
    }
  });
}

// Register route
addRoute('/login', renderLoginPage);
