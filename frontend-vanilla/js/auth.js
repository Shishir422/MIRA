// Authentication utilitie
function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
}

function isAuthenticated() {
  return !!localStorage.getItem('token');
}

function logout() {
  removeToken();
  navigateTo('/login');
}
