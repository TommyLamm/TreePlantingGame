import gameData from '../../shared/game-data.json';

export const MAX_LEVEL = 100;

export const STORE_ITEMS = gameData.storeItems;

export const MILESTONES = [
    { level: 1, stage: 1, nameKey: 'stageSeed' },
    { level: 5, stage: 2, nameKey: 'stageSprout' },
    { level: 12, stage: 3, nameKey: 'stageSapling' },
    { level: 26, stage: 4, nameKey: 'stageYoung' },
    { level: 46, stage: 5, nameKey: 'stageMature' },
    { level: 66, stage: 6, nameKey: 'stageGrand' },
    { level: 86, stage: 7, nameKey: 'stageAncient' },
];

export const ACHIEVEMENT_DEFS = [
    { id: 'first_event', nameKey: 'achFirstEvent', icon: '🌱' },
    { id: 'lvl10', nameKey: 'achLvl10', icon: '🌿' },
    { id: 'lvl25', nameKey: 'achLvl25', icon: '🌳' },
    { id: 'lvl50', nameKey: 'achLvl50', icon: '🏔️' },
    { id: 'lvl100', nameKey: 'achLvl100', icon: '⭐' },
    { id: 'rich', nameKey: 'achRich', icon: '💰' },
    { id: 'interact50', nameKey: 'achInteract50', icon: '🤝' },
    { id: 'interact100', nameKey: 'achInteract100', icon: '🧙' },
    // New achievements
    { id: 'streak7', nameKey: 'achStreak7', icon: '🔥' },
    { id: 'streak30', nameKey: 'achStreak30', icon: '💎' },
    { id: 'combo5', nameKey: 'achCombo5', icon: '⚡' },
    { id: 'combo10', nameKey: 'achCombo10', icon: '🌪️' },
    { id: 'prestige1', nameKey: 'achPrestige1', icon: '♻️' },
    { id: 'prestige5', nameKey: 'achPrestige5', icon: '👑' },
    { id: 'companion3', nameKey: 'achCompanion3', icon: '🐾' },
    { id: 'totalXp1000', nameKey: 'achTotalXp1000', icon: '📈' },
    { id: 'totalEvents200', nameKey: 'achTotalEvents200', icon: '🎯' },
];

// --- Daily Rewards ---
export const DAILY_REWARDS = gameData.dailyRewards;

// --- Companion Definitions ---
export const COMPANIONS = gameData.companions;

// --- Prestige Upgrades ---
export const PRESTIGE_UPGRADES = gameData.prestigeUpgrades;

// --- Weather Types ---
export const WEATHER_TYPES = {
    sunny: { icon: '☀️', nameKey: 'weatherSunny', color: 'text-yellow-500' },
    cloudy: { icon: '⛅', nameKey: 'weatherCloudy', color: 'text-gray-400' },
    rainy: { icon: '🌧️', nameKey: 'weatherRainy', color: 'text-blue-400' },
    stormy: { icon: '⛈️', nameKey: 'weatherStormy', color: 'text-purple-500' },
    snowy: { icon: '🌨️', nameKey: 'weatherSnowy', color: 'text-cyan-300' },
};

// --- Seasons ---
export const SEASONS = {
    spring: { icon: '🌸', nameKey: 'seasonSpring' },
    summer: { icon: '☀️', nameKey: 'seasonSummer' },
    autumn: { icon: '🍂', nameKey: 'seasonAutumn' },
    winter: { icon: '❄️', nameKey: 'seasonWinter' },
};

// --- Event Info (client-side display) ---
export const EVENT_INFO = {
    WATER: { color: 'blue', difficulty: 'easy', rewardTier: 1 },
    PEST: { color: 'red', difficulty: 'medium', rewardTier: 2 },
    FERTILIZE: { color: 'amber', difficulty: 'medium', rewardTier: 2 },
    PRUNE: { color: 'green', difficulty: 'easy', rewardTier: 1 },
    SUNLIGHT: { color: 'orange', difficulty: 'medium', rewardTier: 2 },
    STORM: { color: 'purple', difficulty: 'hard', rewardTier: 3 },
};

// --- Mini-Game Emojis ---
export const MEMORY_EMOJIS = ['🌳', '🌸', '🍂', '❄️', '🌺', '🍄'];
