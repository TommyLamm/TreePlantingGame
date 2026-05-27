const API_BASE = '';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getUsers: () => request('/api/users'),

  heartbeat: (username) => request('/api/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ username }),
  }),

  toggleWarp: (username) => request('/api/toggle-warp', {
    method: 'POST',
    body: JSON.stringify({ username }),
  }),

  sendAction: (username, action) => request('/api/action', {
    method: 'POST',
    body: JSON.stringify({ username, action }),
  }),

  updateProfile: (username, profile) => request('/api/profile/update', {
    method: 'POST',
    body: JSON.stringify({ username, profile }),
  }),

  buyItem: (username, itemId, type) => request('/api/store/buy', {
    method: 'POST',
    body: JSON.stringify({ username, itemId, type }),
  }),

  equipItem: (username, itemId) => request('/api/store/equip', {
    method: 'POST',
    body: JSON.stringify({ username, itemId }),
  }),

  getLeaderboard: () => request('/api/leaderboard'),

  getAchievements: (username) =>
    request(`/api/achievements/${encodeURIComponent(username)}`),

  health: () => request('/api/health'),
};
