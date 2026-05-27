// NOTE: For production, consider adding express-rate-limit:
// const rateLimit = require('express-rate-limit');
// app.use('/api/', rateLimit({ windowMs: 60000, max: 100 }));

const express = require('express');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 7777;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'save.json');

// --- Server-side Store Items (source of truth for prices) ---
const STORE_ITEMS = [
    { id: 'xpBuff', type: 'buff', price: 500 },
    { id: 'autoWater', type: 'auto', price: 1000 },
    { id: 'cherry', type: 'skin', price: 2000 },
    { id: 'autumn', type: 'skin', price: 2500 },
    { id: 'snow', type: 'skin', price: 3000 },
    { id: 'golden', type: 'skin', price: 5000 },
];

// --- Companion Definitions ---
const COMPANIONS = [
    { id: 'butterfly', price: 0, unlockLevel: 1, bonus: { type: 'xp', value: 0.05 } },
    { id: 'squirrel', price: 1500, unlockLevel: 10, bonus: { type: 'coins', value: 0.1 } },
    { id: 'bird', price: 3000, unlockLevel: 25, bonus: { type: 'eventXp', value: 0.15 } },
    { id: 'owl', price: 5000, unlockLevel: 50, bonus: { type: 'coins', value: 0.2 } },
    { id: 'deer', price: 8000, unlockLevel: 75, bonus: { type: 'allBonus', value: 0.1 } },
    { id: 'phoenix', price: 15000, unlockLevel: 0, bonus: { type: 'allBonus', value: 0.2 }, prestigeOnly: true },
];

// --- Prestige Upgrade Definitions ---
const PRESTIGE_UPGRADES = [
    { id: 'xpBoost', maxLevel: 5, costPerLevel: 1, effectPerLevel: 0.1 },
    { id: 'coinBoost', maxLevel: 5, costPerLevel: 1, effectPerLevel: 0.15 },
    { id: 'eventFreq', maxLevel: 3, costPerLevel: 2, effectPerLevel: 60000 },
    { id: 'startLevel', maxLevel: 5, costPerLevel: 3, effectPerLevel: 2 },
    { id: 'comboBonus', maxLevel: 3, costPerLevel: 2, effectPerLevel: 0.5 },
];

// --- Daily Reward Table ---
const DAILY_REWARDS = [
    { day: 1, coins: 100, xp: 0 },
    { day: 2, coins: 150, xp: 5 },
    { day: 3, coins: 200, xp: 10 },
    { day: 4, coins: 250, xp: 0 },
    { day: 5, coins: 300, xp: 15 },
    { day: 6, coins: 400, xp: 0 },
    { day: 7, coins: 500, xp: 25 },
];

// --- Differentiated Event Rewards ---
const EVENT_REWARDS = {
    WATER:     { xpMin: 3,  xpMax: 10, coinMin: 10, coinMax: 20 },
    PEST:      { xpMin: 8,  xpMax: 20, coinMin: 15, coinMax: 25 },
    FERTILIZE: { xpMin: 5,  xpMax: 15, coinMin: 20, coinMax: 40 },
    PRUNE:     { xpMin: 3,  xpMax: 8,  coinMin: 30, coinMax: 50 },
    SUNLIGHT:  { xpMin: 5,  xpMax: 12, coinMin: 10, coinMax: 20 },
    STORM:     { xpMin: 15, xpMax: 30, coinMin: 25, coinMax: 50 },
};

// --- Weather System ---
const WEATHER_TYPES = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'];
const WEATHER_MODIFIERS = {
    sunny:  { xpMult: 1.2, coinMult: 1.0 },
    cloudy: { xpMult: 1.0, coinMult: 1.0 },
    rainy:  { xpMult: 1.3, coinMult: 0.9 },
    stormy: { xpMult: 0.8, coinMult: 1.3 },
    snowy:  { xpMult: 1.0, coinMult: 1.2 },
};

let globalWeather = {
    type: 'sunny',
    changedAt: Date.now(),
    nextChangeAt: Date.now() + (2 + Math.random() * 2) * 3600000,
};

function updateWeather() {
    const now = Date.now();
    if (now >= globalWeather.nextChangeAt) {
        const newType = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
        globalWeather = {
            type: newType,
            changedAt: now,
            nextChangeAt: now + (2 + Math.random() * 2) * 3600000,
        };
        console.log(`[Weather] Changed to ${newType}`);
    }
}

function getSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
}

function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Achievement Definitions ---
const ACHIEVEMENTS = [
    { id: 'first_event', condition: (u) => u.interactionCount >= 1 },
    { id: 'lvl10', condition: (u) => u.level >= 10 },
    { id: 'lvl25', condition: (u) => u.level >= 25 },
    { id: 'lvl50', condition: (u) => u.level >= 50 },
    { id: 'lvl100', condition: (u) => u.level >= 100 },
    { id: 'rich', condition: (u) => u.coins >= 5000 },
    { id: 'interact50', condition: (u) => u.interactionCount >= 50 },
    { id: 'interact100', condition: (u) => u.interactionCount >= 100 },
    // New achievements
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

// --- Username Validation ---
const USERNAME_REGEX = /^[a-zA-Z0-9_\u4e00-\u9fff]{2,16}$/;
function isValidUsername(name) {
    return typeof name === 'string' && USERNAME_REGEX.test(name);
}

// --- In-Memory Cache ---
let dbCache = {};
let isDirty = false; // Flag to track if cache has been modified

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'client/dist')));

// --- Helper: Create default user object ---
function createDefaultUser(isAdmin = false) {
    return {
        xp: 0,
        level: isAdmin ? 100 : 1,
        activeEvent: null,
        isDemoMode: false,
        lastTick: Date.now(),
        lastEventTime: Date.now(),
        coins: isAdmin ? 10000 : 0,
        inventory: { xpBuff: false, autoWater: false, treeSkin: 'default', unlockedSkins: ['default'] },
        joinDate: Date.now(),
        playTime: 0,
        interactionCount: 0,
        profile: { avatar: null, birthday: '', signature: '' },
        achievements: [],
        // --- New fields ---
        lastLoginDate: null,
        loginStreak: 0,
        maxLoginStreak: 0,
        dailyRewardClaimed: false,
        combo: 0,
        maxCombo: 0,
        companion: null,
        unlockedCompanions: [],
        generation: 0,
        prestigePoints: 0,
        prestigeUpgrades: {},
        totalXpEarned: 0,
        totalCoinsEarned: 0,
        totalEventsResolved: 0,
        lastOfflineXp: 0,
        lastOfflineCoins: 0,
        goldenHourUntil: 0,
        lastShakeTime: 0,
        lastGiftDate: null,
        minigameCount: 0,
        minigameDate: null,
    };
}

// --- Helper: Migrate existing user to add missing new fields ---
function migrateUser(user) {
    const defaults = createDefaultUser();
    for (const key of Object.keys(defaults)) {
        if (user[key] === undefined) {
            user[key] = defaults[key];
        }
    }
    // Ensure sub-objects exist
    if (!user.inventory) user.inventory = defaults.inventory;
    if (!user.profile) user.profile = defaults.profile;
    if (!user.achievements) user.achievements = [];
    if (!user.prestigeUpgrades) user.prestigeUpgrades = {};
    if (!Array.isArray(user.unlockedCompanions)) user.unlockedCompanions = [];
}

// --- Helper: Get companion bonus multipliers ---
function getCompanionBonuses(user) {
    const bonuses = { xpMult: 1, coinMult: 1, eventXpMult: 1 };
    if (!user.companion) return bonuses;
    const comp = COMPANIONS.find(c => c.id === user.companion);
    if (!comp) return bonuses;

    switch (comp.bonus.type) {
        case 'xp': bonuses.xpMult += comp.bonus.value; break;
        case 'coins': bonuses.coinMult += comp.bonus.value; break;
        case 'eventXp': bonuses.eventXpMult += comp.bonus.value; break;
        case 'allBonus':
            bonuses.xpMult += comp.bonus.value;
            bonuses.coinMult += comp.bonus.value;
            bonuses.eventXpMult += comp.bonus.value;
            break;
    }
    return bonuses;
}

// --- Helper: Get prestige bonus multipliers ---
function getPrestigeBonuses(user) {
    const bonuses = { xpMult: 1, coinMult: 1, eventFreqReduction: 0, startLevel: 1, comboCapBonus: 0 };
    const upgrades = user.prestigeUpgrades || {};
    for (const upg of PRESTIGE_UPGRADES) {
        const lvl = upgrades[upg.id] || 0;
        if (lvl <= 0) continue;
        switch (upg.id) {
            case 'xpBoost': bonuses.xpMult += lvl * upg.effectPerLevel; break;
            case 'coinBoost': bonuses.coinMult += lvl * upg.effectPerLevel; break;
            case 'eventFreq': bonuses.eventFreqReduction += lvl * upg.effectPerLevel; break;
            case 'startLevel': bonuses.startLevel = 1 + lvl * upg.effectPerLevel; break;
            case 'comboBonus': bonuses.comboCapBonus += lvl * upg.effectPerLevel; break;
        }
    }
    return bonuses;
}

// --- Initialization ---
function initializeDatabase() {
    console.log("------------------------------------------------");
    console.log(`[Init] Checking database file...`);
    try {
        if (!fs.existsSync(DB_FILE)) {
            console.log(`[Init] Creating new save.json...`);
            fs.writeFileSync(DB_FILE, '{}', 'utf8');
            dbCache = {};
        } else {
            console.log(`[Init] Found existing save.json. Loading into memory...`);
            const data = fs.readFileSync(DB_FILE, 'utf8');
            dbCache = JSON.parse(data || '{}');
            console.log(`[Init] Loaded ${Object.keys(dbCache).length} user(s) into memory.`);
        }
        fs.accessSync(DB_FILE, fs.constants.R_OK | fs.constants.W_OK);
        console.log(`[Init] Read/Write permissions confirmed.`);
    } catch (err) {
        console.error(`[CRITICAL ERROR] Cannot access save.json:`, err);
    }
    console.log("------------------------------------------------");
}

initializeDatabase();

// --- Migrate all existing users on startup ---
for (const [name, user] of Object.entries(dbCache)) {
    migrateUser(user);
}

// --- Ensure Admin always exists ---
if (!dbCache['Admin']) {
    dbCache['Admin'] = createDefaultUser(true);
    isDirty = true;
    console.log(`[Init] Admin account created.`);
} else {
    // Keep Admin at max level
    dbCache['Admin'].level = 100;
    if (!dbCache['Admin'].achievements) dbCache['Admin'].achievements = [];
    migrateUser(dbCache['Admin']);
    isDirty = true;
}

// --- Background Save Task ---
const SAVE_INTERVAL_MS = 5000; // Save every 5 seconds
setInterval(async () => {
    if (isDirty) {
        try {
            await fsPromises.writeFile(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf8');
            isDirty = false;
        } catch (err) {
            console.error(`[Background Sync Error] Failed to write save.json:`, err);
        }
    }
}, SAVE_INTERVAL_MS);

// --- Graceful Shutdown ---
async function shutdown(signal) {
    console.log(`\n[Shutdown] Received ${signal}. Saving data to disk...`);
    if (isDirty) {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf8');
            console.log(`[Shutdown] Data saved successfully.`);
        } catch (err) {
            console.error(`[Shutdown Error] Failed to save data:`, err);
        }
    } else {
        console.log(`[Shutdown] No pending changes. Data is safe.`);
    }
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// --- Helper: Check and unlock achievements ---
function checkAchievements(user) {
    if (!user.achievements) user.achievements = [];
    const newlyUnlocked = [];

    for (const ach of ACHIEVEMENTS) {
        if (!user.achievements.includes(ach.id) && ach.condition(user)) {
            user.achievements.push(ach.id);
            newlyUnlocked.push(ach.id);
        }
    }

    if (newlyUnlocked.length > 0) {
        user.newAchievements = newlyUnlocked;
        return true; // data changed
    }
    return false;
}

// --- Helper: Check daily login streak ---
function checkDailyLogin(user) {
    const today = getTodayStr();
    if (user.lastLoginDate === today) return; // already checked today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (user.lastLoginDate === yesterdayStr) {
        // Consecutive day
        user.loginStreak += 1;
    } else {
        // Streak broken or first login
        user.loginStreak = 1;
    }

    user.lastLoginDate = today;
    user.dailyRewardClaimed = false;
    if (user.loginStreak > (user.maxLoginStreak || 0)) {
        user.maxLoginStreak = user.loginStreak;
    }
}

// --- Helper: Game Logic Engine ---
function updateUserState(user) {
    const now = Date.now();
    let changed = false;

    // 0. Migrate any missing fields
    migrateUser(user);

    // 1. Check daily login
    checkDailyLogin(user);

    // 2. Calculate Time Delta
    const dt = now - user.lastTick;
    const speedMultiplier = user.isDemoMode ? 600 : 1;

    // Accumulate actual play time (if tick is within 15 seconds, assume active session)
    if (dt > 0 && dt <= 15000) {
        user.playTime += dt;
        changed = true;
    }

    // --- Offline earnings tracking ---
    if (dt > 15000) {
        // User was away — calculate offline earnings
        const offlineDt = dt;
        const weatherMod = WEATHER_MODIFIERS[globalWeather.type] || { xpMult: 1, coinMult: 1 };
        const companionBonus = getCompanionBonuses(user);
        const prestigeBonus = getPrestigeBonuses(user);
        const xpBuffMult = user.inventory.xpBuff ? 1.5 : 1;

        const totalXpMult = xpBuffMult * weatherMod.xpMult * companionBonus.xpMult * prestigeBonus.xpMult;
        const totalCoinMult = weatherMod.coinMult * companionBonus.coinMult * prestigeBonus.coinMult;

        const offlineXp = (offlineDt / 3600000) * speedMultiplier * 1 * totalXpMult;
        const offlineCoins = (offlineDt / 3600000) * speedMultiplier * 50 * totalCoinMult;

        user.lastOfflineXp = Math.floor(offlineXp * 10) / 10;
        user.lastOfflineCoins = Math.floor(offlineCoins);
        changed = true;
    } else {
        user.lastOfflineXp = 0;
        user.lastOfflineCoins = 0;
    }

    // 3. XP & Coin Calculation with all multipliers
    const prevXp = user.xp;
    const prevLevel = user.level;
    const prevCoins = user.coins;

    // Update weather
    updateWeather();

    const weatherMod = WEATHER_MODIFIERS[globalWeather.type] || { xpMult: 1, coinMult: 1 };
    const companionBonus = getCompanionBonuses(user);
    const prestigeBonus = getPrestigeBonuses(user);
    const goldenHourActive = now < (user.goldenHourUntil || 0);
    const goldenHourMult = goldenHourActive ? 2 : 1;

    const xpBuffMult = user.inventory.xpBuff ? 1.5 : 1;
    const totalXpMult = xpBuffMult * weatherMod.xpMult * companionBonus.xpMult * prestigeBonus.xpMult * goldenHourMult;
    const totalCoinMult = weatherMod.coinMult * companionBonus.coinMult * prestigeBonus.coinMult;

    const xpGained = (dt / 3600000) * speedMultiplier * 1 * totalXpMult;
    const coinsGained = (dt / 3600000) * speedMultiplier * 50 * totalCoinMult;

    if (user.level < 100) {
        user.xp += xpGained;
        user.coins += coinsGained;
        user.totalXpEarned = (user.totalXpEarned || 0) + xpGained;
        user.totalCoinsEarned = (user.totalCoinsEarned || 0) + coinsGained;

        const req = Math.floor(10 + Math.pow(user.level, 1.6));
        if (user.xp >= req) {
            user.xp -= req;
            user.level++;
            user.justLeveledUp = true;
        }
    }

    user.lastTick = now;

    // Check if XP/level/coins actually changed
    if (user.xp !== prevXp || user.level !== prevLevel || user.coins !== prevCoins) {
        changed = true;
    }

    // 4. Random Event Generation with prestige frequency bonus
    const prestigeEventReduction = prestigeBonus.eventFreqReduction || 0;
    const baseEventInterval = 10 * 60000; // 10 minutes
    const eventIntervalMs = Math.max(60000, baseEventInterval - prestigeEventReduction) / speedMultiplier;

    if (!user.activeEvent && user.level < 100) {
        const timeSinceEvent = now - user.lastEventTime;

        if (timeSinceEvent >= eventIntervalMs) {
            const events = ['WATER', 'PEST', 'FERTILIZE', 'PRUNE', 'SUNLIGHT', 'STORM'];
            user.activeEvent = events[Math.floor(Math.random() * events.length)];
            user.eventSpawnedAt = now;
            changed = true;
            console.log(`[Game Logic] Spawned ${user.activeEvent}`);
        }
    } else if (user.activeEvent === 'WATER' && user.inventory?.autoWater) {
        const timeSinceEventSpawn = now - (user.eventSpawnedAt || user.lastEventTime);
        const resolveTimeMs = 5000 / speedMultiplier;
        if (timeSinceEventSpawn >= resolveTimeMs) {
            const rewards = EVENT_REWARDS['WATER'];
            const comboMult = 1 + Math.min(user.combo || 0, 10) * 0.1;
            const xpMult = totalXpMult * companionBonus.eventXpMult * comboMult;
            const reward = (Math.floor(Math.random() * (rewards.xpMax - rewards.xpMin + 1)) + rewards.xpMin) * xpMult;
            const coinReward = Math.floor(Math.random() * (rewards.coinMax - rewards.coinMin + 1)) + rewards.coinMin;

            user.activeEvent = null;
            user.eventSpawnedAt = null;
            user.lastEventResolved = true;
            user.xp += reward;
            user.coins += coinReward;
            user.totalXpEarned = (user.totalXpEarned || 0) + reward;
            user.totalCoinsEarned = (user.totalCoinsEarned || 0) + coinReward;
            user.interactionCount++;
            user.totalEventsResolved = (user.totalEventsResolved || 0) + 1;
            user.combo = (user.combo || 0) + 1;
            if (user.combo > (user.maxCombo || 0)) user.maxCombo = user.combo;

            const reqXp = Math.floor(10 + Math.pow(user.level, 1.6));
            if (user.xp >= reqXp && user.level < 100) {
                user.xp -= reqXp;
                user.level++;
                user.justLeveledUp = true;
            }

            user.lastReward = Math.floor(reward * 10) / 10;
            user.lastEventTime = now;
            changed = true;
            console.log(`[Game Logic] Auto-resolved WATER (combo: ${user.combo})`);
        }
    }

    // 4b. STORM penalty — if STORM not resolved within 2 minutes, deduct XP
    if (user.activeEvent === 'STORM' && user.eventSpawnedAt) {
        const stormTimeout = (2 * 60000) / speedMultiplier;
        if (now - user.eventSpawnedAt >= stormTimeout) {
            user.xp = Math.max(0, user.xp - 10);
            user.activeEvent = null;
            user.eventSpawnedAt = null;
            user.lastEventTime = now;
            user.combo = 0; // Storm penalty breaks combo
            user.stormPenalty = true;
            changed = true;
            console.log(`[Game Logic] STORM penalty — user lost 10 XP`);
        }
    }

    // 5. Check for new achievements
    if (checkAchievements(user)) {
        changed = true;
    }

    if (changed) {
        isDirty = true;
    }
}

// --- API Endpoints ---

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        users: Object.keys(dbCache).length
    });
});

// Protected DB endpoint — only returns summary, full data requires admin param
app.get('/api/db', (req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Expires': '0' });
    // Only return usernames and count for safety
    const summary = {
        userCount: Object.keys(dbCache).length,
        users: Object.keys(dbCache)
    };
    res.json(summary);
});

// --- Weather endpoint ---
app.get('/api/weather', (req, res) => {
    updateWeather();
    res.json({
        type: globalWeather.type,
        season: getSeason(),
        changedAt: globalWeather.changedAt,
        nextChangeAt: globalWeather.nextChangeAt,
    });
});

app.post('/api/heartbeat', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username. 2-16 chars, letters/numbers/underscore/Chinese only." });

    try {
        if (!dbCache[username]) {
            dbCache[username] = createDefaultUser(username === 'Admin');
            isDirty = true;
        }

        const user = dbCache[username];
        updateUserState(user);

        // Build response with extra info
        const responseUser = {
            ...user,
            weather: globalWeather.type,
            season: getSeason(),
            dailyRewardAvailable: !user.dailyRewardClaimed,
        };

        // --- Clear transient flags ---
        if (user.justLeveledUp) {
            user.justLeveledUp = false;
            isDirty = true;
        }
        if (user.newAchievements) {
            delete user.newAchievements;
        }
        if (user.stormPenalty) {
            delete user.stormPenalty;
        }

        res.json(responseUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/toggle-warp', (req, res) => {
    const { username } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (dbCache[username]) {
            updateUserState(dbCache[username]); // Settle pending XP
            dbCache[username].isDemoMode = !dbCache[username].isDemoMode;
            isDirty = true;

            const responseUser = { ...dbCache[username], weather: globalWeather.type, season: getSeason() };
            if (dbCache[username].justLeveledUp) {
                dbCache[username].justLeveledUp = false;
            }
            if (dbCache[username].newAchievements) {
                delete dbCache[username].newAchievements;
            }

            res.json(responseUser);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/action', (req, res) => {
    const { username, action } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });

        const user = dbCache[username];
        updateUserState(user); // Update state first

        if (user.activeEvent === action) {
            // Success — use differentiated rewards
            const rewards = EVENT_REWARDS[action] || { xpMin: 3, xpMax: 15, coinMin: 10, coinMax: 30 };
            const companionBonus = getCompanionBonuses(user);
            const prestigeBonus = getPrestigeBonuses(user);
            const comboCapBase = 10;
            const comboCap = comboCapBase + (prestigeBonus.comboCapBonus || 0);
            const comboMult = 1 + Math.min((user.combo || 0), comboCap) * 0.1;
            const goldenHourActive = Date.now() < (user.goldenHourUntil || 0);
            const goldenHourMult = goldenHourActive ? 2 : 1;
            const xpBuffMult = user.inventory?.xpBuff ? 1.5 : 1;

            const totalEventXpMult = xpBuffMult * companionBonus.eventXpMult * companionBonus.xpMult * prestigeBonus.xpMult * comboMult * goldenHourMult;
            const reward = (Math.floor(Math.random() * (rewards.xpMax - rewards.xpMin + 1)) + rewards.xpMin) * totalEventXpMult;
            const coinReward = Math.floor((Math.floor(Math.random() * (rewards.coinMax - rewards.coinMin + 1)) + rewards.coinMin) * companionBonus.coinMult * prestigeBonus.coinMult);

            const reqXp = Math.floor(10 + Math.pow(user.level, 1.6));
            user.xp += reward;
            user.coins += coinReward;
            user.totalXpEarned = (user.totalXpEarned || 0) + reward;
            user.totalCoinsEarned = (user.totalCoinsEarned || 0) + coinReward;
            user.interactionCount++;
            user.totalEventsResolved = (user.totalEventsResolved || 0) + 1;

            // Combo
            user.combo = (user.combo || 0) + 1;
            if (user.combo > (user.maxCombo || 0)) user.maxCombo = user.combo;

            if (user.xp >= reqXp && user.level < 100) {
                user.xp -= reqXp;
                user.level++;
                user.justLeveledUp = true;
            }

            // Special event effects
            if (action === 'SUNLIGHT') {
                user.goldenHourUntil = Date.now() + 5 * 60 * 1000;
                user.goldenHourTriggered = true;
            }

            user.activeEvent = null;
            user.eventSpawnedAt = null;
            user.lastEventResolved = true;
            user.lastReward = Math.floor(reward * 10) / 10;
            user.lastCoinReward = coinReward;
            user.lastEventTime = Date.now();

            // Re-check achievements after action
            checkAchievements(user);

            console.log(`[Game Logic] ${username} solved ${action}. Combo: ${user.combo}`);
        } else {
            user.lastEventResolved = false;
            // Wrong action breaks combo
            user.combo = 0;
        }

        isDirty = true;

        const responseUser = {
            ...user,
            weather: globalWeather.type,
            season: getSeason(),
        };
        if (user.justLeveledUp) {
            user.justLeveledUp = false;
        }
        if (user.newAchievements) {
            delete user.newAchievements;
        }
        if (user.goldenHourTriggered) {
            delete user.goldenHourTriggered;
        }

        res.json(responseUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/profile/update', (req, res) => {
    const { username, profile } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

        if (profile) {
            // Avatar size limit: 500KB (base64 string ~ 700K chars)
            if (profile.avatar !== undefined) {
                if (profile.avatar && typeof profile.avatar === 'string' && profile.avatar.length > 700000) {
                    return res.status(400).json({ error: "Avatar too large. Must be under 500KB." });
                }
                user.profile.avatar = profile.avatar;
            }
            if (profile.birthday !== undefined) user.profile.birthday = profile.birthday;
            if (profile.signature !== undefined) user.profile.signature = profile.signature;
        }

        isDirty = true;
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/store/buy', (req, res) => {
    const { username, itemId, type } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

        // Server-side price lookup — ignore client price
        const storeItem = STORE_ITEMS.find(i => i.id === itemId && i.type === type);
        if (!storeItem) return res.status(400).json({ error: "Item not found" });
        const price = storeItem.price;

        if (user.coins >= price) {
            user.coins -= price;

            if (type === 'buff' && itemId === 'xpBuff') user.inventory.xpBuff = true;
            if (type === 'auto' && itemId === 'autoWater') user.inventory.autoWater = true;
            if (type === 'skin') {
                if (!user.inventory.unlockedSkins) user.inventory.unlockedSkins = ['default'];
                if (!user.inventory.unlockedSkins.includes(itemId)) {
                    user.inventory.unlockedSkins.push(itemId);
                }
                user.inventory.treeSkin = itemId;
            }

            // Re-check achievements after purchase
            checkAchievements(user);

            isDirty = true;
            res.json(user);
        } else {
            res.status(400).json({ error: "Not enough coins" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/store/equip', (req, res) => {
    const { username, itemId } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

        if (user.inventory?.unlockedSkins?.includes(itemId) || itemId === 'default') {
            user.inventory.treeSkin = itemId;
            isDirty = true;
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- Daily Reward Claim ---
app.post('/api/daily-reward/claim', (req, res) => {
    const { username } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

        if (user.dailyRewardClaimed) {
            return res.status(400).json({ error: "Already claimed today" });
        }

        const dayIndex = ((user.loginStreak || 1) - 1) % 7;
        const reward = DAILY_REWARDS[dayIndex];

        user.coins += reward.coins;
        user.totalCoinsEarned = (user.totalCoinsEarned || 0) + reward.coins;
        if (reward.xp > 0) {
            user.xp += reward.xp;
            user.totalXpEarned = (user.totalXpEarned || 0) + reward.xp;
        }
        user.dailyRewardClaimed = true;

        checkAchievements(user);
        isDirty = true;

        res.json({ ...user, claimedReward: reward, dayIndex });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- Companion Buy ---
app.post('/api/companion/buy', (req, res) => {
    const { username, companionId } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

        const comp = COMPANIONS.find(c => c.id === companionId);
        if (!comp) return res.status(400).json({ error: "Companion not found" });

        if (comp.prestigeOnly && (user.generation || 0) < 1) {
            return res.status(400).json({ error: "Requires at least 1 prestige" });
        }
        if (user.level < comp.unlockLevel) {
            return res.status(400).json({ error: `Requires level ${comp.unlockLevel}` });
        }
        if ((user.unlockedCompanions || []).includes(companionId)) {
            return res.status(400).json({ error: "Already owned" });
        }
        if (user.coins < comp.price) {
            return res.status(400).json({ error: "Not enough coins" });
        }

        user.coins -= comp.price;
        if (!user.unlockedCompanions) user.unlockedCompanions = [];
        user.unlockedCompanions.push(companionId);
        user.companion = companionId; // auto-equip

        checkAchievements(user);
        isDirty = true;
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- Companion Equip ---
app.post('/api/companion/equip', (req, res) => {
    const { username, companionId } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

        if (companionId === null) {
            user.companion = null;
            isDirty = true;
            return res.json(user);
        }

        if (!(user.unlockedCompanions || []).includes(companionId)) {
            return res.status(400).json({ error: "Companion not owned" });
        }

        user.companion = companionId;
        isDirty = true;
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- Prestige / Rebirth ---
app.post('/api/prestige', (req, res) => {
    const { username } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

        if (user.level < 50) {
            return res.status(400).json({ error: "Must be at least level 50 to prestige" });
        }

        // Award prestige points: 1 per 10 levels
        const pointsEarned = Math.floor(user.level / 10);
        const startLevel = getPrestigeBonuses(user).startLevel || 1;

        user.generation = (user.generation || 0) + 1;
        user.prestigePoints = (user.prestigePoints || 0) + pointsEarned;
        user.xp = 0;
        user.level = startLevel;
        user.activeEvent = null;
        user.eventSpawnedAt = null;
        user.lastEventTime = Date.now();
        user.combo = 0;
        user.goldenHourUntil = 0;
        // Keep: skins, companions, profile, achievements, stats, prestige upgrades

        checkAchievements(user);
        isDirty = true;
        res.json({ ...user, pointsEarned });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- Prestige Upgrade ---
app.post('/api/prestige/upgrade', (req, res) => {
    const { username, upgradeId } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

        const upg = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
        if (!upg) return res.status(400).json({ error: "Upgrade not found" });

        const currentLevel = (user.prestigeUpgrades || {})[upgradeId] || 0;
        if (currentLevel >= upg.maxLevel) {
            return res.status(400).json({ error: "Already at max level" });
        }

        const cost = upg.costPerLevel;
        if ((user.prestigePoints || 0) < cost) {
            return res.status(400).json({ error: "Not enough prestige points" });
        }

        user.prestigePoints -= cost;
        if (!user.prestigeUpgrades) user.prestigeUpgrades = {};
        user.prestigeUpgrades[upgradeId] = currentLevel + 1;

        isDirty = true;
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- Tree Shake ---
app.post('/api/shake', (req, res) => {
    const { username } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

        const now = Date.now();
        const cooldown = 30000; // 30 seconds
        if (now - (user.lastShakeTime || 0) < cooldown) {
            return res.json({ coins: 0, cooldown: true, remainingMs: cooldown - (now - user.lastShakeTime) });
        }

        user.lastShakeTime = now;
        let droppedCoins = 0;
        if (Math.random() < 0.3) {
            droppedCoins = Math.floor(Math.random() * 5) + 1;
            user.coins += droppedCoins;
            user.totalCoinsEarned = (user.totalCoinsEarned || 0) + droppedCoins;
        }

        isDirty = true;
        res.json({ coins: droppedCoins, cooldown: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- Garden Visit ---
app.get('/api/garden/:username', (req, res) => {
    const { username } = req.params;
    if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
    const user = dbCache[username];

    res.json({
        username,
        level: user.level || 1,
        generation: user.generation || 0,
        treeSkin: user.inventory?.treeSkin || 'default',
        companion: user.companion || null,
        achievements: user.achievements || [],
        joinDate: user.joinDate,
    });
});

// --- Gift System ---
app.post('/api/gift', (req, res) => {
    const { fromUsername, toUsername } = req.body;
    if (!isValidUsername(fromUsername) || !isValidUsername(toUsername)) {
        return res.status(400).json({ error: "Invalid username" });
    }
    if (fromUsername === toUsername) {
        return res.status(400).json({ error: "Cannot gift yourself" });
    }
    try {
        if (!dbCache[fromUsername]) return res.status(404).json({ error: "Sender not found" });
        if (!dbCache[toUsername]) return res.status(404).json({ error: "Recipient not found" });

        const sender = dbCache[fromUsername];
        const receiver = dbCache[toUsername];

        const today = getTodayStr();
        if (sender.lastGiftDate === today) {
            return res.status(400).json({ error: "Already sent a gift today" });
        }

        const giftAmount = 50;
        if (sender.coins < giftAmount) {
            return res.status(400).json({ error: "Not enough coins" });
        }

        sender.coins -= giftAmount;
        receiver.coins += giftAmount;
        receiver.totalCoinsEarned = (receiver.totalCoinsEarned || 0) + giftAmount;
        sender.lastGiftDate = today;

        isDirty = true;
        res.json({ success: true, amount: giftAmount, senderCoins: Math.floor(sender.coins) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- Mini-Game Reward ---
app.post('/api/minigame/reward', (req, res) => {
    const { username, gameType, score } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

        const today = getTodayStr();
        if (user.minigameDate !== today) {
            user.minigameDate = today;
            user.minigameCount = 0;
        }

        if (user.minigameCount >= 3) {
            return res.status(400).json({ error: "Max 3 mini-games per day" });
        }

        const coinsEarned = Math.min(Math.floor((score || 0) * 5), 200); // Cap at 200
        user.coins += coinsEarned;
        user.totalCoinsEarned = (user.totalCoinsEarned || 0) + coinsEarned;
        user.minigameCount++;

        isDirty = true;
        res.json({ coinsEarned, gamesRemaining: 3 - user.minigameCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.get('/api/users', (req, res) => {
    res.json(Object.keys(dbCache));
});

// Leaderboard — top 20 users by level desc, then XP desc (excludes Admin)
app.get('/api/leaderboard', (req, res) => {
    const entries = Object.entries(dbCache)
        .filter(([name]) => name !== 'Admin')
        .map(([name, data]) => ({
            username: name,
            level: data.level || 1,
            xp: data.xp || 0,
            treeSkin: data.inventory?.treeSkin || 'default',
            generation: data.generation || 0,
            companion: data.companion || null,
        }))
        .sort((a, b) => {
            // Sort by generation first, then level, then XP
            if (b.generation !== a.generation) return b.generation - a.generation;
            if (b.level !== a.level) return b.level - a.level;
            return b.xp - a.xp;
        })
        .slice(0, 20);
    res.json(entries);
});

// Achievements for a specific user
app.get('/api/achievements/:username', (req, res) => {
    const { username } = req.params;
    if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
    res.json({ achievements: dbCache[username].achievements || [] });
});

app.listen(PORT, () => {
    console.log(`\n🌱 Zen Arboretum Server running on http://localhost:${PORT}`);
});
