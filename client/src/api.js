const SERVER = 'http://localhost:3001/api';

// Generic fetch wrapper: throws if the response is not ok
async function request(path, options = {}) {
  const res = await fetch(`${SERVER}${path}`, { credentials: 'include', ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Auth
export async function login(username, password) {
  return request('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export async function logout() {
  return request('/sessions/current', { method: 'DELETE' });
}

// Returns the logged-in user or null if no active session
export async function getCurrentUser() {
  const res = await fetch(`${SERVER}/sessions/current`, { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to fetch session.');
  return res.json();
}

// Game
export async function getNetwork() {
  return request('/network');
}

export async function getSegments() {
  return request('/segments');
}

export async function getGameSetup() {
  return request('/game/setup');
}

// Sends the built route (array of station IDs) and returns the scored result
export async function executeGame(route) {
  return request('/game/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ route }),
  });
}

// Ranking
export async function getRanking() {
  return request('/ranking');
}
