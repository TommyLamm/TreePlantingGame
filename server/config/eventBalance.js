const EVENT_BALANCE = {
  // First event spawn window: 45–90 seconds after login/start
  FIRST_EVENT_MIN_MS: 45 * 1000,
  FIRST_EVENT_MAX_MS: 90 * 1000,

  // Steady-state event base interval: 3 minutes
  EVENT_BASE_INTERVAL_MS: 3 * 60 * 1000,

  // Minimum interval after prestige reduction
  EVENT_MIN_INTERVAL_MS: 60 * 1000,

  // Storm timeout before penalty applies
  STORM_TIMEOUT_MS: 2 * 60 * 1000,

  // Storm XP penalty
  STORM_PENALTY_XP: 10,
};

module.exports = { EVENT_BALANCE };