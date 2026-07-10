const API_BASE = '';

export async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const get = path => request(path, { method: 'GET' });
export const post = (path, body) => request(path, {
  method: 'POST',
  body: JSON.stringify(body),
});

export const api = {
  getUsers: () => get('/api/users'),
  heartbeat: username => post('/api/heartbeat', { username }),
  toggleWarp: username => post('/api/toggle-warp', { username }),
  sendAction: (username, action) => post('/api/action', { username, action }),
  updateProfile: (username, profile) => post('/api/profile/update', { username, profile }),
  buyItem: (username, itemId, type) => post('/api/store/buy', { username, itemId, type }),
  equipItem: (username, itemId) => post('/api/store/equip', { username, itemId }),
  getLeaderboard: () => get('/api/leaderboard'),
  getAchievements: username => get(`/api/achievements/${encodeURIComponent(username)}`),
  health: () => get('/api/health'),
  getWeather: () => get('/api/weather'),
  claimDailyReward: username => post('/api/daily-reward/claim', { username }),
  buyCompanion: (username, companionId) => post('/api/companion/buy', { username, companionId }),
  equipCompanion: (username, companionId) => post('/api/companion/equip', { username, companionId }),
  prestige: username => post('/api/prestige', { username }),
  prestigeUpgrade: (username, upgradeId) => post('/api/prestige/upgrade', { username, upgradeId }),
  shakeTree: username => post('/api/shake', { username }),
  visitGarden: username => get(`/api/garden/${encodeURIComponent(username)}`),
  sendGift: (fromUsername, toUsername) => post('/api/gift', { fromUsername, toUsername }),
  claimMinigameReward: (username, gameType, score) => post('/api/minigame/reward', { username, gameType, score }),
};
