// Simple Hash-based Router
const routes = {};
let currentPath = '';

function addRoute(path, handler) {
  routes[path] = handler;
}

function navigateTo(path) {
  window.location.hash = path;
}

function getCurrentPath() {
  return window.location.hash.slice(1) || '/';
}

function getRouteParams() {
  const path = getCurrentPath();
  const parts = path.split('/');
  return {
    id: parts[2] // For routes like /journal/:id
  };
}

async function handleRoute() {
  const path = getCurrentPath();
  currentPath = path;

  // Check if route requires auth
  const publicRoutes = ['/login', '/calendar-connected', '/'];
  const isPublicRoute = publicRoutes.includes(path);

  if (!isPublicRoute && !isAuthenticated()) {
    navigateTo('/login');
    return;
  }

  // Handle root - show landing page for unauthenticated, dashboard for authenticated
  if (path === '/') {
    if (isAuthenticated()) {
      navigateTo('/dashboard');
    } else {
      // Show landing page instead of redirecting to login
      const handler = routes['/'];
      if (handler) {
        await handler();
      }
    }
    return;
  }

  // Match route
  let handler = routes[path];

  // Handle dynamic routes like /journal/:id
  if (!handler && path.startsWith('/journal/')) {
    handler = routes['/journal/:id'];
  }

  if (handler) {
    await handler();
  } else {
    document.getElementById('app').innerHTML = '<div class="container"><h1>404 - Page Not Found</h1></div>';
  }
}

// Listen for hash changes
window.addEventListener('hashchange', handleRoute);

// Initialize router
function initRouter() {
  handleRoute();
}
