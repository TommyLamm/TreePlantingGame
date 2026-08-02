const shared = require('../../shared/game-data.json');

const EVENT_REWARDS = {
    WATER:     { xpMin: 3,  xpMax: 10, coinMin: 10, coinMax: 20 },
    PEST:      { xpMin: 8,  xpMax: 20, coinMin: 15, coinMax: 25 },
    FERTILIZE: { xpMin: 5,  xpMax: 15, coinMin: 20, coinMax: 40 },
    PRUNE:     { xpMin: 3,  xpMax: 8,  coinMin: 30, coinMax: 50 },
    SUNLIGHT:  { xpMin: 5,  xpMax: 12, coinMin: 10, coinMax: 20 },
    STORM:     { xpMin: 15, xpMax: 30, coinMin: 25, coinMax: 50 },
};

const WEATHER_MODIFIERS = shared.weatherModifiers;
const WEATHER_TYPES = Object.keys(WEATHER_MODIFIERS);

const ACHIEVEMENTS = [
    { id: 'first_event', condition: (u) => u.interactionCount >= 1 },
    { id: 'lvl10', condition: (u) => u.level >= 10 },
    { id: 'lvl25', condition: (u) => u.level >= 25 },
    { id: 'lvl50', condition: (u) => u.level >= 50 },
    { id: 'lvl100', condition: (u) => u.level >= 100 },
    { id: 'rich', condition: (u) => u.coins >= 5000 },
    { id: 'interact50', condition: (u) => u.interactionCount >= 50 },
    { id: 'interact100', condition: (u) => u.interactionCount >= 100 },
    { id: 'streak7', condition: (u) => (u.maxLoginStreak || 0) >= 7 },
    { id: 'streak30', condition: (u) => (u.maxLoginStreak || 0) >= 30 },
    { id: 'combo5', condition: (u) => (u.maxCombo || 0) >= 5 },
    { id: 'combo10', condition: (u) => (u.maxCombo || 0) >= 10 },
    { id: 'prestige1', condition: (u) => (u.generation || 0) >= 1 },
    { id: 'prestige5', condition: (u) => (u.generation || 0) >= 5 },
    { id: 'companion3', condition: (u) => (u.unlockedCompanions || []).length >= 3 },
    { id: 'totalXp1000', condition: (u) => (u.totalXpEarned || 0) >= 1000 },
    { id: 'totalEvents200', condition: (u) => (u.totalEventsResolved || 0) >= 200 },
];

module.exports = {
    STORE_ITEMS: shared.storeItems,
    COMPANIONS: shared.companions,
    PRESTIGE_UPGRADES: shared.prestigeUpgrades,
    DAILY_REWARDS: shared.dailyRewards.map(({ day, coins, xp }) => ({ day, coins, xp })),
    EVENT_REWARDS,
    WEATHER_TYPES,
    WEATHER_MODIFIERS,
    ACHIEVEMENTS,
};
