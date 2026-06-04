const SERVER = 'http://localhost:3001';

async function request(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  };
  const res = await fetch(SERVER + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  // Auth
  login:          (username, password) => request('POST',   '/api/sessions',         { username, password }),
  logout:         ()                   => request('DELETE', '/api/sessions/current'),
  getCurrentUser: ()                   => request('GET',    '/api/sessions/current'),

  // Network
  getNetwork:     ()                   => request('GET', '/api/network'),
  getSegments:    ()                   => request('GET', '/api/network/segments'),
  getStations:    ()                   => request('GET', '/api/network/stations'),

  // Ranking
  getRanking:     ()                   => request('GET', '/api/ranking'),
};
