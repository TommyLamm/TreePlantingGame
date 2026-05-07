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

    // 2. Calculate Time Delta
    const dt = now - user.lastTick;
    const speedMultiplier = user.isDemoMode ? 600 : 1;
    
    // 3. XP Calculation
    const xpGained = (dt / 3600000) * speedMultiplier * 1; // 1 XP per Hour
    
    if (user.level < 100) {
        user.xp += xpGained;
        const req = user.level * 100;
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
            dbCache[username] = { xp: 0, level: 1, activeEvent: null, isDemoMode: false, lastTick: Date.now(), lastEventTime: Date.now() };
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
            const reward = Math.floor(Math.random() * (15 - 3 + 1)) + 3;
            const reqXp = user.level * 100;
            user.xp += reward;
            if (user.xp >= reqXp && user.level < 100) {
                user.xp -= reqXp;
                user.level++;
                user.justLeveledUp = true;
            }
            
            user.activeEvent = null;
            user.lastEventResolved = true;
            user.lastReward = reward;
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

app.get('/api/users', (req, res) => {
    res.json(Object.keys(dbCache));
});

app.listen(PORT, () => {
    console.log(`\n🌱 Zen Arboretum Server running on http://localhost:${PORT}`);
});
