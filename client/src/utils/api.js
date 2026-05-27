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

  // --- New API Methods ---

  getWeather: () => request('/api/weather'),

  claimDailyReward: (username) => request('/api/daily-reward/claim', {
    method: 'POST',
    body: JSON.stringify({ username }),
  }),

  buyCompanion: (username, companionId) => request('/api/companion/buy', {
    method: 'POST',
    body: JSON.stringify({ username, companionId }),
  }),

  equipCompanion: (username, companionId) => request('/api/companion/equip', {
    method: 'POST',
    body: JSON.stringify({ username, companionId }),
  }),

  prestige: (username) => request('/api/prestige', {
    method: 'POST',
    body: JSON.stringify({ username }),
  }),

  prestigeUpgrade: (username, upgradeId) => request('/api/prestige/upgrade', {
    method: 'POST',
    body: JSON.stringify({ username, upgradeId }),
  }),

  shakeTree: (username) => request('/api/shake', {
    method: 'POST',
    body: JSON.stringify({ username }),
  }),

  visitGarden: (username) => request(`/api/garden/${encodeURIComponent(username)}`),

  sendGift: (fromUsername, toUsername) => request('/api/gift', {
    method: 'POST',
    body: JSON.stringify({ fromUsername, toUsername }),
  }),

  claimMinigameReward: (username, gameType, score) => request('/api/minigame/reward', {
    method: 'POST',
    body: JSON.stringify({ username, gameType, score }),
  }),
};
