// NOTE: For production, consider adding express-rate-limit:
// const rateLimit = require('express-rate-limit');
// app.use('/api/', rateLimit({ windowMs: 60000, max: 100 }));

const express = require('express');
const path = require('path');
const cors = require('cors');
const {
    STORE_ITEMS,
    COMPANIONS,
    PRESTIGE_UPGRADES,
    DAILY_REWARDS,
    EVENT_REWARDS,
    ACHIEVEMENTS,
} = require('./server/config/gameData');
const { createUserRepository } = require('./server/data/userRepository');
const { createAchievementService } = require('./server/services/achievementService');
const { createGameStateService } = require('./server/services/gameStateService');

const app = express();
const PORT = process.env.PORT || 7777;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'save.json');

// --- Username Validation ---
const USERNAME_REGEX = /^[a-zA-Z0-9_\u4e00-\u9fff]{2,16}$/;
function isValidUsername(name) {
    return typeof name === 'string' && USERNAME_REGEX.test(name);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'client/dist')));

const repository = createUserRepository({ dbFile: DB_FILE });
repository.initialize();
const achievementService = createAchievementService({ achievements: ACHIEVEMENTS });
const gameStateService = createGameStateService({ repository, achievementService });
repository.startAutoSave();

// --- Graceful Shutdown ---
async function shutdown(signal) {
    console.log(`\n[Shutdown] Received ${signal}. Saving data to disk...`);
    repository.stopAutoSave();
    if (repository.isDirty()) {
        await repository.flush();
        if (!repository.isDirty()) {
            console.log(`[Shutdown] Data saved successfully.`);
        } else {
            console.error(`[Shutdown Error] Failed to save data.`);
        }
    } else {
        console.log(`[Shutdown] No pending changes. Data is safe.`);
    }
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// --- API Endpoints ---

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        users: repository.size()
    });
});

// Protected DB endpoint — only returns summary, full data requires admin param
app.get('/api/db', (req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Expires': '0' });
    // Only return usernames and count for safety
    const summary = {
        userCount: repository.size(),
        users: repository.listNames()
    };
    res.json(summary);
});

// --- Weather endpoint ---
app.get('/api/weather', (req, res) => {
    res.json(gameStateService.getWeather());
});

app.post('/api/heartbeat', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username. 2-16 chars, letters/numbers/underscore/Chinese only." });

    try {
        const user = repository.ensureUser(username, username === 'Admin');
        res.json(gameStateService.heartbeat(user));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/toggle-warp', (req, res) => {
    const { username } = req.body;
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    try {
        if (repository.hasUser(username)) {
            const user = repository.getUser(username);
            gameStateService.updateUserState(user); // Settle pending XP
            user.isDemoMode = !user.isDemoMode;
            repository.markDirty();

            const responseUser = gameStateService.toGameResponse(user);
            if (user.justLeveledUp) {
                user.justLeveledUp = false;
            }
            if (user.newAchievements) {
                delete user.newAchievements;
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
        if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });

        const user = repository.getUser(username);
        gameStateService.updateUserState(user); // Update state first

        if (user.activeEvent === action) {
            // Success — use differentiated rewards
            const rewards = EVENT_REWARDS[action] || { xpMin: 3, xpMax: 15, coinMin: 10, coinMax: 30 };
            const companionBonus = gameStateService.getCompanionBonuses(user);
            const prestigeBonus = gameStateService.getPrestigeBonuses(user);
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
            achievementService.checkAchievements(user);

            console.log(`[Game Logic] ${username} solved ${action}. Combo: ${user.combo}`);
        } else {
            user.lastEventResolved = false;
            // Wrong action breaks combo
            user.combo = 0;
        }

        repository.markDirty();

        const responseUser = gameStateService.toGameResponse(user);
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
        if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
        const user = repository.getUser(username);
        gameStateService.updateUserState(user);

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

        repository.markDirty();
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
        if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
        const user = repository.getUser(username);
        gameStateService.updateUserState(user);

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
            achievementService.checkAchievements(user);

            repository.markDirty();
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
        if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
        const user = repository.getUser(username);
        gameStateService.updateUserState(user);

        if (user.inventory?.unlockedSkins?.includes(itemId) || itemId === 'default') {
            user.inventory.treeSkin = itemId;
            repository.markDirty();
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
        if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
        const user = repository.getUser(username);
        gameStateService.updateUserState(user);

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

        achievementService.checkAchievements(user);
        repository.markDirty();

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
        if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
        const user = repository.getUser(username);
        gameStateService.updateUserState(user);

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

        achievementService.checkAchievements(user);
        repository.markDirty();
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
        if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
        const user = repository.getUser(username);
        gameStateService.updateUserState(user);

        if (companionId === null) {
            user.companion = null;
            repository.markDirty();
            return res.json(user);
        }

        if (!(user.unlockedCompanions || []).includes(companionId)) {
            return res.status(400).json({ error: "Companion not owned" });
        }

        user.companion = companionId;
        repository.markDirty();
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
        if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
        const user = repository.getUser(username);
        gameStateService.updateUserState(user);

        if (user.level < 50) {
            return res.status(400).json({ error: "Must be at least level 50 to prestige" });
        }

        // Award prestige points: 1 per 10 levels
        const pointsEarned = Math.floor(user.level / 10);
        const startLevel = gameStateService.getPrestigeBonuses(user).startLevel || 1;

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

        achievementService.checkAchievements(user);
        repository.markDirty();
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
        if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
        const user = repository.getUser(username);
        gameStateService.updateUserState(user);

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

        repository.markDirty();
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
        if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
        const user = repository.getUser(username);
        gameStateService.updateUserState(user);

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

        repository.markDirty();
        res.json({ coins: droppedCoins, cooldown: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- Garden Visit ---
app.get('/api/garden/:username', (req, res) => {
    const { username } = req.params;
    if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
    const user = repository.getUser(username);

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
        if (!repository.hasUser(fromUsername)) return res.status(404).json({ error: "Sender not found" });
        if (!repository.hasUser(toUsername)) return res.status(404).json({ error: "Recipient not found" });

        const sender = repository.getUser(fromUsername);
        const receiver = repository.getUser(toUsername);

        const today = gameStateService.getTodayStr();
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

        repository.markDirty();
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
        if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
        const user = repository.getUser(username);
        gameStateService.updateUserState(user);

        const today = gameStateService.getTodayStr();
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

        repository.markDirty();
        res.json({ coinsEarned, gamesRemaining: 3 - user.minigameCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.get('/api/users', (req, res) => {
    res.json(repository.listNames());
});

// Leaderboard — top 20 users by level desc, then XP desc (excludes Admin)
app.get('/api/leaderboard', (req, res) => {
    const entries = repository.entries()
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
    if (!repository.hasUser(username)) return res.status(404).json({ error: "User not found" });
    res.json({ achievements: repository.getUser(username).achievements || [] });
});

const server = app.listen(PORT, () => {
    console.log(`\n🌱 Zen Arboretum Server running on http://localhost:${PORT}`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\n[Server] Port ${PORT} is already in use.`);
        console.error('[Server] Another game server is probably still running.');
        console.error(`[Server] Stop the existing process or start this one with a different port, for example: $env:PORT=7778; node server.js\n`);
        process.exit(1);
    }
    throw error;
});
