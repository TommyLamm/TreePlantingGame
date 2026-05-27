const express = require('express');
const fs = require('fs'); 
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 7777;

const DB_FILE = path.join(__dirname, 'save.json');

// --- In-Memory Cache ---
let dbCache = {};
let isDirty = false; // Flag to track if cache has been modified

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.static(path.join(__dirname, 'client/dist')));

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

// --- Ensure Admin always exists ---
if (!dbCache['Admin']) {
    dbCache['Admin'] = {
        xp: 0,
        level: 100,
        activeEvent: null,
        isDemoMode: false,
        lastTick: Date.now(),
        lastEventTime: Date.now(),
        coins: 10000,
        inventory: { xpBuff: false, autoWater: false, treeSkin: 'default', unlockedSkins: ['default'] },
        joinDate: Date.now(),
        playTime: 0,
        interactionCount: 0,
        profile: { avatar: null, birthday: '', signature: '' }
    };
    isDirty = true;
    console.log(`[Init] Admin account created.`);
} else {
    // Keep Admin at max level
    dbCache['Admin'].level = 100;
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

// --- Helper: Game Logic Engine ---
function updateUserState(user) {
    const now = Date.now();

    // 1. Initialize if missing fields
    if (!user.lastTick) user.lastTick = now;
    if (!user.lastEventTime) user.lastEventTime = now;
    if (typeof user.isDemoMode === 'undefined') user.isDemoMode = false;
    if (!user.activeEvent) user.activeEvent = null;
    if (typeof user.coins === 'undefined') user.coins = 0;
    if (!user.inventory) user.inventory = { xpBuff: false, autoWater: false, treeSkin: 'default', unlockedSkins: ['default'] };
    if (!user.joinDate) user.joinDate = now;
    if (typeof user.playTime === 'undefined') user.playTime = 0;
    if (typeof user.interactionCount === 'undefined') user.interactionCount = 0;
    if (!user.profile) user.profile = { avatar: null, birthday: '', signature: '' };

    // 2. Calculate Time Delta
    const dt = now - user.lastTick;
    const speedMultiplier = user.isDemoMode ? 600 : 1;
    
    // Accumulate actual play time (if tick is within 15 seconds, assume active session)
    if (dt > 0 && dt <= 15000) {
        user.playTime += dt;
    }
    
    // 3. XP & Coin Calculation
    const xpMultiplier = user.inventory.xpBuff ? 1.5 : 1;
    const xpGained = (dt / 3600000) * speedMultiplier * 1 * xpMultiplier; // 1 XP per Hour
    const coinsGained = (dt / 3600000) * speedMultiplier * 50; // 50 coins per Hour
    
    if (user.level < 100) {
        user.xp += xpGained;
        user.coins += coinsGained;
        const req = Math.floor(10 + Math.pow(user.level, 1.6));
        if (user.xp >= req) {
            user.xp -= req;
            user.level++;
            user.justLeveledUp = true; 
        }
    }

    user.lastTick = now;

    // 4. Random Event Generation
    if (!user.activeEvent && user.level < 100) {
        const timeSinceEvent = now - user.lastEventTime;
        const eventIntervalMs = (10 * 60000) / speedMultiplier; // 10 mins

        if (timeSinceEvent >= eventIntervalMs) {
            const events = ['WATER', 'PEST', 'FERTILIZE'];
            user.activeEvent = events[Math.floor(Math.random() * events.length)];
            console.log(`[Game Logic] Spawned ${user.activeEvent}`);
        }
    } else if (user.activeEvent === 'WATER' && user.inventory?.autoWater) {
        const timeSinceEventSpawn = now - user.lastEventTime;
        const resolveTimeMs = 5000 / speedMultiplier;
        if (timeSinceEventSpawn >= resolveTimeMs) {
            user.activeEvent = null;
            user.lastEventResolved = true;
            const xpMultiplier = user.inventory.xpBuff ? 1.5 : 1;
            const reward = (Math.floor(Math.random() * (15 - 3 + 1)) + 3) * xpMultiplier;
            const coinReward = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
            const reqXp = Math.floor(10 + Math.pow(user.level, 1.6));
            user.xp += reward;
            user.coins += coinReward;
            user.interactionCount++; // Increment interaction for auto-resolve too
            if (user.xp >= reqXp && user.level < 100) {
                user.xp -= reqXp;
                user.level++;
                user.justLeveledUp = true;
            }
            user.lastReward = reward;
            user.lastEventTime = now;
            console.log(`[Game Logic] Auto-resolved WATER`);
        }
    }
    
    isDirty = true; // Mark cache as dirty since state changed
}

// --- API Endpoints ---

app.get('/api/db', (req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Expires': '0' });
    res.json(dbCache);
});

app.post('/api/heartbeat', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    try {
        if (!dbCache[username]) {
            const isAdm = username === 'Admin';
            dbCache[username] = { 
                xp: 0, 
                level: isAdm ? 100 : 1, 
                activeEvent: null, 
                isDemoMode: false, 
                lastTick: Date.now(), 
                lastEventTime: Date.now(),
                coins: isAdm ? 10000 : 0,
                inventory: { xpBuff: false, autoWater: false, treeSkin: 'default', unlockedSkins: ['default'] }
            };
            isDirty = true;
        }

        const user = dbCache[username];
        updateUserState(user);
        
        // --- BUG FIX START ---
        const responseUser = { ...user };

        if (user.justLeveledUp) {
            user.justLeveledUp = false;
            isDirty = true;
        }
        // --- BUG FIX END ---

        res.json(responseUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/toggle-warp', (req, res) => {
    const { username } = req.body;
    try {
        if (dbCache[username]) {
            updateUserState(dbCache[username]); // Settle pending XP
            dbCache[username].isDemoMode = !dbCache[username].isDemoMode;
            isDirty = true;
            
            // Fix: Handle level up flag here too if toggling caused a level up
            const responseUser = { ...dbCache[username] };
            if (dbCache[username].justLeveledUp) {
                dbCache[username].justLeveledUp = false;
            }

            res.json(responseUser);
        } else {
            res.status(404).json({error: "User not found"});
        }
    } catch (err) { 
        console.error(err); 
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/action', (req, res) => {
    const { username, action } = req.body;
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        
        const user = dbCache[username];
        updateUserState(user); // Update state first

        if (user.activeEvent === action) {
            // Success
            const xpMultiplier = user.inventory?.xpBuff ? 1.5 : 1;
            const reward = (Math.floor(Math.random() * (15 - 3 + 1)) + 3) * xpMultiplier;
            const coinReward = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
            const reqXp = Math.floor(10 + Math.pow(user.level, 1.6));
            user.xp += reward;
            user.coins += coinReward;
            user.interactionCount++;
            
            if (user.xp >= reqXp && user.level < 100) {
                user.xp -= reqXp;
                user.level++;
                user.justLeveledUp = true;
            }
            
            user.activeEvent = null;
            user.lastEventResolved = true;
            user.lastReward = reward;
            user.lastCoinReward = coinReward;
            user.lastEventTime = Date.now(); 
            
            console.log(`[Game Logic] ${username} solved event. Cooldown reset.`);
        } else {
            user.lastEventResolved = false;
        }

        isDirty = true;

        // --- BUG FIX START ---
        const responseUser = { ...user };
        if (user.justLeveledUp) {
            user.justLeveledUp = false;
        }
        // --- BUG FIX END ---

        res.json(responseUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/profile/update', (req, res) => {
    const { username, profile } = req.body;
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

        if (profile) {
            if (profile.avatar !== undefined) user.profile.avatar = profile.avatar;
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
    const { username, itemId, price, type } = req.body;
    try {
        if (!dbCache[username]) return res.status(404).json({ error: "User not found" });
        const user = dbCache[username];
        updateUserState(user);

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

app.get('/api/users', (req, res) => {
    res.json(Object.keys(dbCache));
});

app.listen(PORT, () => {
    console.log(`\n🌱 Zen Arboretum Server running on http://localhost:${PORT}`);
});
