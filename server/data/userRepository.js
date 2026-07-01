const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

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

function migrateUser(user, now = Date.now(), onChange) {
    const defaults = createDefaultUser(false, now);
    const reportChange = typeof onChange === 'function' ? onChange : () => {};
    for (const key of Object.keys(defaults)) {
        if (user[key] === undefined) {
            user[key] = defaults[key];
            reportChange();
        }
    }
    if (!user.inventory) {
        user.inventory = defaults.inventory;
        reportChange();
    }
    if (!user.profile) {
        user.profile = defaults.profile;
        reportChange();
    }
    if (!user.achievements) {
        user.achievements = [];
        reportChange();
    }
    if (!user.prestigeUpgrades) {
        user.prestigeUpgrades = {};
        reportChange();
    }
    if (!Array.isArray(user.unlockedCompanions)) {
        user.unlockedCompanions = [];
        reportChange();
    }
    return user;
}

function createCache(entries = []) {
    const cache = Object.create(null);
    for (const [name, user] of entries) {
        cache[name] = user;
    }
    return cache;
}

function validateUserRecord(username, user) {
    const userLabel = JSON.stringify(username);
    if (user === null || Array.isArray(user) || typeof user !== 'object') {
        throw new TypeError(`User ${userLabel} must be a non-null, non-array object`);
    }

    for (const field of ['inventory', 'profile', 'prestigeUpgrades']) {
        const value = user[field];
        if (value !== null && value !== undefined
            && (Array.isArray(value) || typeof value !== 'object')) {
            throw new TypeError(`User ${userLabel} field ${field} must be a non-array object`);
        }
    }

    for (const field of ['achievements', 'unlockedCompanions']) {
        const value = user[field];
        if (value !== null && value !== undefined && !Array.isArray(value)) {
            throw new TypeError(`User ${userLabel} field ${field} must be an array`);
        }
    }
}

function createUserRepository({
    dbFile,
    saveIntervalMs = 5000,
    logger = console,
    now = Date.now,
    fsSync = fs,
    fsAsync = fsPromises,
}) {
    let cache = createCache();
    let mutationGeneration = 0;
    let persistedGeneration = 0;
    let inFlightPromise = null;
    let drainRequested = false;
    let saveTimer = null;
    let tempFileCounter = 0;

    function getUser(username) {
        return cache[username];
    }

    function hasUser(username) {
        return Object.hasOwn(cache, username);
    }

    function ensureUser(username, isAdmin = false) {
        if (!hasUser(username)) {
            cache[username] = createDefaultUser(isAdmin, now());
            markDirty();
        }
        return cache[username];
    }

    function initialize() {
        logger.log('------------------------------------------------');
        logger.log('[Init] Checking database file...');
        try {
            if (!fsSync.existsSync(dbFile)) {
                logger.log('[Init] Creating new save.json...');
                fsSync.writeFileSync(dbFile, '{}', 'utf8');
                fsSync.accessSync(dbFile, fsSync.constants.R_OK | fsSync.constants.W_OK);
                cache = createCache();
            } else {
                logger.log('[Init] Found existing save.json. Loading into memory...');
                const data = fsSync.readFileSync(dbFile, 'utf8');
                const parsed = JSON.parse(data);
                if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
                    throw new TypeError('Database root must be a non-null, non-array object');
                }
                const entries = Object.entries(parsed);
                for (const [username, user] of entries) {
                    validateUserRecord(username, user);
                }
                const loadedCache = createCache(entries);
                fsSync.accessSync(dbFile, fsSync.constants.R_OK | fsSync.constants.W_OK);
                cache = loadedCache;
                logger.log(`[Init] Loaded ${entries.length} user(s) into memory.`);
            }
            logger.log('[Init] Read/Write permissions confirmed.');
        } catch (err) {
            logger.error('[CRITICAL ERROR] Cannot access save.json:', err);
            throw err;
        } finally {
            logger.log('------------------------------------------------');
        }

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
            markDirty();
        }
    }

    function markDirty() {
        mutationGeneration += 1;
    }

    function isDirty() {
        return persistedGeneration < mutationGeneration;
    }

    function createTempFilePath() {
        tempFileCounter += 1;
        return path.join(
            path.dirname(dbFile),
            `.${path.basename(dbFile)}.${process.pid}.${tempFileCounter}.${randomUUID()}.tmp`,
        );
    }

    async function writeAtomically(contents) {
        const tempFile = createTempFilePath();
        let handle;
        try {
            handle = await fsAsync.open(tempFile, 'wx', 0o600);
            await handle.writeFile(contents, 'utf8');
            await handle.sync();
            await handle.close();
            handle = undefined;
            await fsAsync.rename(tempFile, dbFile);
        } catch (error) {
            if (handle) {
                try {
                    await handle.close();
                } catch {}
            }
            try {
                await fsAsync.unlink(tempFile);
            } catch (cleanupError) {
                if (cleanupError.code !== 'ENOENT') {
                    logger.error('[Background Sync Error] Failed to clean temporary save file:', cleanupError);
                }
            }
            throw error;
        }
    }

    function writeAtomicallySync(contents) {
        const tempFile = createTempFilePath();
        let descriptor;
        try {
            descriptor = fsSync.openSync(tempFile, 'wx', 0o600);
            fsSync.writeFileSync(descriptor, contents, 'utf8');
            fsSync.fsyncSync(descriptor);
            fsSync.closeSync(descriptor);
            descriptor = undefined;
            fsSync.renameSync(tempFile, dbFile);
        } catch (error) {
            if (descriptor !== undefined) {
                try {
                    fsSync.closeSync(descriptor);
                } catch {}
            }
            try {
                fsSync.unlinkSync(tempFile);
            } catch (cleanupError) {
                if (cleanupError.code !== 'ENOENT') {
                    logger.error('[Shutdown Error] Failed to clean temporary save file:', cleanupError);
                }
            }
            throw error;
        }
    }

    function startFlushCoordinator(shouldDrain) {
        drainRequested = shouldDrain;
        inFlightPromise = (async () => {
            do {
                if (!isDirty()) return;
                const snapshotGeneration = mutationGeneration;
                const snapshot = JSON.stringify(cache, null, 2);
                try {
                    await writeAtomically(snapshot);
                    persistedGeneration = Math.max(persistedGeneration, snapshotGeneration);
                } catch (err) {
                    logger.error('[Background Sync Error] Failed to write save.json:', err);
                    return;
                }
            } while (drainRequested && isDirty());
        })().finally(() => {
            inFlightPromise = null;
            drainRequested = false;
        });

        return inFlightPromise;
    }

    function flushOneSnapshot() {
        if (inFlightPromise || !isDirty()) return;
        void startFlushCoordinator(false);
    }

    function flush() {
        if (inFlightPromise) {
            drainRequested = true;
            return inFlightPromise;
        }
        if (!isDirty()) return Promise.resolve();
        return startFlushCoordinator(true);
    }

    function flushSync() {
        if (inFlightPromise) {
            throw new Error('Cannot flush synchronously while an asynchronous flush is in progress');
        }
        if (!isDirty()) return;
        const snapshotGeneration = mutationGeneration;
        try {
            writeAtomicallySync(JSON.stringify(cache, null, 2));
            persistedGeneration = Math.max(persistedGeneration, snapshotGeneration);
        } catch (err) {
            logger.error('[Shutdown Error] Failed to save data:', err);
        }
    }

    function startAutoSave() {
        if (saveTimer !== null) return;
        saveTimer = setInterval(() => {
            flushOneSnapshot();
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
        isDirty,
        startAutoSave,
        stopAutoSave,
        flush,
        flushSync,
    };
}

module.exports = { createDefaultUser, migrateUser, createUserRepository };
