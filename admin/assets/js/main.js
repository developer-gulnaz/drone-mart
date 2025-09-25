// -----------------------------
// API Request Helper (Session-based)
// -----------------------------
async function apiRequestLogin(endpoint, body) {

  // ✅ API Base URL (change in one place for local/prod)
  const API_BASE_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:5000/api/" + endpoint
      : "/api/" + endpoint;
  // const api_url = "http://localhost:5000/api/" + endpoint; // local testing
  // const api_url = "/api/" + endpoint; // production path

  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: "include" // ✅ send/receive session cookie
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || `API error: ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`Error calling ${endpoint}:`, err);
    throw err;
  }
}

// -----------------------------
// Login Form Submit Handler
// -----------------------------
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  try {
    const data = await apiRequestLogin('auth/login', { email, password });

    // ✅ Save session info (no token needed)
    sessionStorage.setItem('userType', data.userType || 'admin');
    sessionStorage.setItem('name', data.email.split('@')[0] || 'Admin');

    // Redirect to dashboard
    window.location.href = 'dashboard.html';
  } catch (err) {
    alert(err.message || 'Login failed. Please try again.');
  }
});

// -----------------------------
// Logout Function
// -----------------------------
async function logout() {
  try {
    await fetch("http://localhost:5000/api/auth/logout", {
      method: "POST",
      credentials: "include" // ✅ clear session on server
    });
  } catch (err) {
    console.error("Logout API failed:", err);
  }

  // Clear client-side session
  sessionStorage.clear();
  window.location.href = "/admin";
}
