const fs = require('node:fs');
const fsPromises = require('node:fs/promises');

function createDefaultUser(isAdmin = false, now = Date.now()) {
    return {
        xp: 0,
        level: isAdmin ? 100 : 1,
        activeEvent: null,
        isDemoMode: false,
        lastTick: now,
        lastEventTime: now,
        coins: isAdmin ? 10000 : 0,
        inventory: { xpBuff: false, autoWater: false, treeSkin: 'default', unlockedSkins: ['default'] },
        joinDate: now,
        playTime: 0,
        interactionCount: 0,
        profile: { avatar: null, birthday: '', signature: '' },
        achievements: [],
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

function migrateUser(user, now = Date.now()) {
    const defaults = createDefaultUser(false, now);
    for (const key of Object.keys(defaults)) {
        if (user[key] === undefined) {
            user[key] = defaults[key];
        }
    }
    if (!user.inventory) user.inventory = defaults.inventory;
    if (!user.profile) user.profile = defaults.profile;
    if (!user.achievements) user.achievements = [];
    if (!user.prestigeUpgrades) user.prestigeUpgrades = {};
    if (!Array.isArray(user.unlockedCompanions)) user.unlockedCompanions = [];
    return user;
}

function createUserRepository({ dbFile, saveIntervalMs = 5000, logger = console, now = Date.now }) {
    let cache = {};
    let dirty = false;
    let saveTimer = null;

    function getUser(username) {
        return cache[username];
    }

    function hasUser(username) {
        return Object.hasOwn(cache, username);
    }

    function ensureUser(username, isAdmin = false) {
        if (!hasUser(username)) {
            cache[username] = createDefaultUser(isAdmin, now());
            dirty = true;
        }
        return cache[username];
    }

    function initialize() {
        logger.log('------------------------------------------------');
        logger.log('[Init] Checking database file...');
        try {
            if (!fs.existsSync(dbFile)) {
                logger.log('[Init] Creating new save.json...');
                fs.writeFileSync(dbFile, '{}', 'utf8');
                cache = {};
            } else {
                logger.log('[Init] Found existing save.json. Loading into memory...');
                const data = fs.readFileSync(dbFile, 'utf8');
                cache = JSON.parse(data || '{}');
                logger.log(`[Init] Loaded ${Object.keys(cache).length} user(s) into memory.`);
            }
            fs.accessSync(dbFile, fs.constants.R_OK | fs.constants.W_OK);
            logger.log('[Init] Read/Write permissions confirmed.');
        } catch (err) {
            logger.error('[CRITICAL ERROR] Cannot access save.json:', err);
        }
        logger.log('------------------------------------------------');

        for (const user of Object.values(cache)) {
            migrateUser(user, now());
        }

        if (!hasUser('Admin')) {
            ensureUser('Admin', true);
            logger.log('[Init] Admin account created.');
        } else {
            cache.Admin.level = 100;
            if (!cache.Admin.achievements) cache.Admin.achievements = [];
            migrateUser(cache.Admin, now());
            dirty = true;
        }
    }

    function markDirty() {
        dirty = true;
    }

    async function flush() {
        if (!dirty) return;
        try {
            await fsPromises.writeFile(dbFile, JSON.stringify(cache, null, 2), 'utf8');
            dirty = false;
        } catch (err) {
            logger.error('[Background Sync Error] Failed to write save.json:', err);
        }
    }

    function flushSync() {
        if (!dirty) return;
        try {
            fs.writeFileSync(dbFile, JSON.stringify(cache, null, 2), 'utf8');
            dirty = false;
        } catch (err) {
            logger.error('[Shutdown Error] Failed to save data:', err);
        }
    }

    function startAutoSave() {
        if (saveTimer !== null) return;
        saveTimer = setInterval(() => {
            void flush();
        }, saveIntervalMs);
    }

    function stopAutoSave() {
        if (saveTimer === null) return;
        clearInterval(saveTimer);
        saveTimer = null;
    }

    return {
        initialize,
        getUser,
        hasUser,
        ensureUser,
        listNames: () => Object.keys(cache),
        entries: () => Object.entries(cache),
        size: () => Object.keys(cache).length,
        markDirty,
        isDirty: () => dirty,
        startAutoSave,
        stopAutoSave,
        flush,
        flushSync,
    };
}

module.exports = { createDefaultUser, migrateUser, createUserRepository };
