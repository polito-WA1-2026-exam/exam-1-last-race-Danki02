const SERVER = 'http://localhost:3001/api';

export async function login(username, password) {
  const res = await fetch(`${SERVER}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed.');
  return data;
}

export async function logout() {
  const res = await fetch(`${SERVER}/sessions/current`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Logout failed.');
}

export async function getCurrentUser() {
  const res = await fetch(`${SERVER}/sessions/current`, {
    credentials: 'include',
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to fetch session.');
  return await res.json();
}

export async function getNetwork() {
  const res = await fetch(`${SERVER}/network`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch network.');
  return res.json();
}

export async function getEvents() {
  const res = await fetch(`${SERVER}/events`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch events.');
  return res.json();
}

export async function saveGame(score) {
  const res = await fetch(`${SERVER}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ score }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save game.');
  return data;
}

export async function getGameSetup() {
  const res = await fetch(`${SERVER}/game/setup`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch game setup.');
  return res.json();
}

export async function getRanking() {
  const res = await fetch(`${SERVER}/ranking`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch ranking.');
  return res.json();
}
