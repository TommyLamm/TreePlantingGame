export const MAX_LEVEL = 100;

export const STORE_ITEMS = [
    { id: 'xpBuff', type: 'buff', price: 500, icon: '🌟', nameKey: 'itemXpBuff', descKey: 'descXpBuff' },
    { id: 'autoWater', type: 'auto', price: 1000, icon: '🤖', nameKey: 'itemAutoWater', descKey: 'descAutoWater' },
    { id: 'cherry', type: 'skin', price: 2000, icon: '🌸', nameKey: 'itemCherrySkin', descKey: 'descCherrySkin' },
    { id: 'autumn', type: 'skin', price: 2500, icon: '🍂', nameKey: 'itemAutumnSkin', descKey: 'descAutumnSkin' },
    { id: 'snow', type: 'skin', price: 3000, icon: '❄️', nameKey: 'itemSnowSkin', descKey: 'descSnowSkin' },
    { id: 'golden', type: 'skin', price: 5000, icon: '✨', nameKey: 'itemGoldenSkin', descKey: 'descGoldenSkin' },
];

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
export const DAILY_REWARDS = [
    { day: 1, coins: 100, xp: 0, special: null, icon: '🪙' },
    { day: 2, coins: 150, xp: 5, special: null, icon: '🪙' },
    { day: 3, coins: 200, xp: 10, special: null, icon: '💫' },
    { day: 4, coins: 250, xp: 0, special: null, icon: '🪙' },
    { day: 5, coins: 300, xp: 15, special: 'luckyBuff', icon: '🍀' },
    { day: 6, coins: 400, xp: 0, special: null, icon: '🪙' },
    { day: 7, coins: 500, xp: 25, special: 'rareItem', icon: '🎁' },
];

// --- Companion Definitions ---
export const COMPANIONS = [
    { id: 'butterfly', price: 0, unlockLevel: 1, bonus: { type: 'xp', value: 0.05 }, icon: '🦋', nameKey: 'companionButterfly', descKey: 'companionButterflyDesc' },
    { id: 'squirrel', price: 1500, unlockLevel: 10, bonus: { type: 'coins', value: 0.1 }, icon: '🐿️', nameKey: 'companionSquirrel', descKey: 'companionSquirrelDesc' },
    { id: 'bird', price: 3000, unlockLevel: 25, bonus: { type: 'eventXp', value: 0.15 }, icon: '🐦', nameKey: 'companionBird', descKey: 'companionBirdDesc' },
    { id: 'owl', price: 5000, unlockLevel: 50, bonus: { type: 'coins', value: 0.2 }, icon: '🦉', nameKey: 'companionOwl', descKey: 'companionOwlDesc' },
    { id: 'deer', price: 8000, unlockLevel: 75, bonus: { type: 'allBonus', value: 0.1 }, icon: '🦌', nameKey: 'companionDeer', descKey: 'companionDeerDesc' },
    { id: 'phoenix', price: 15000, unlockLevel: 0, bonus: { type: 'allBonus', value: 0.2 }, icon: '🔥', nameKey: 'companionPhoenix', descKey: 'companionPhoenixDesc', prestigeOnly: true },
];

// --- Prestige Upgrades ---
export const PRESTIGE_UPGRADES = [
    { id: 'xpBoost', maxLevel: 5, costPerLevel: 1, icon: '⚡', nameKey: 'prestigeXpBoost', descKey: 'prestigeXpBoostDesc' },
    { id: 'coinBoost', maxLevel: 5, costPerLevel: 1, icon: '💰', nameKey: 'prestigeCoinBoost', descKey: 'prestigeCoinBoostDesc' },
    { id: 'eventFreq', maxLevel: 3, costPerLevel: 2, icon: '⏰', nameKey: 'prestigeEventFreq', descKey: 'prestigeEventFreqDesc' },
    { id: 'startLevel', maxLevel: 5, costPerLevel: 3, icon: '🚀', nameKey: 'prestigeStartLevel', descKey: 'prestigeStartLevelDesc' },
    { id: 'comboBonus', maxLevel: 3, costPerLevel: 2, icon: '🔥', nameKey: 'prestigeComboBonus', descKey: 'prestigeComboBonusDesc' },
];

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
