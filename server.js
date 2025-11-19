const express = require('express');
const fs = require('fs'); 
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

const DB_FILE = path.join(__dirname, 'save.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.static(path.join(__dirname, 'public')));

// --- Initialization ---
function initializeDatabase() {
    console.log("------------------------------------------------");
    console.log(`[Init] Checking database file...`);
    try {
        if (!fs.existsSync(DB_FILE)) {
            console.log(`[Init] Creating new save.json...`);
            fs.writeFileSync(DB_FILE, '{}', 'utf8');
        } else {
            console.log(`[Init] Found existing save.json.`);
        }
        fs.accessSync(DB_FILE, fs.constants.R_OK | fs.constants.W_OK);
        console.log(`[Init] Read/Write permissions confirmed.`);
    } catch (err) {
        console.error(`[CRITICAL ERROR] Cannot access save.json:`, err);
    }
    console.log("------------------------------------------------");
}

initializeDatabase();

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
    
    if (user.level < 10) {
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
    if (!user.activeEvent && user.level < 10) {
        const timeSinceEvent = now - user.lastEventTime;
        const eventIntervalMs = (10 * 60000) / speedMultiplier; // 10 mins

        if (timeSinceEvent >= eventIntervalMs) {
            const events = ['WATER', 'PEST', 'FERTILIZE'];
            user.activeEvent = events[Math.floor(Math.random() * events.length)];
            console.log(`[Game Logic] Spawned ${user.activeEvent}`);
        }
    }
}

// --- API Endpoints ---

app.get('/api/db', async (req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Expires': '0' });
    try {
        const data = await fsPromises.readFile(DB_FILE, 'utf8');
        res.json(JSON.parse(data || '{}'));
    } catch (err) {
        res.json({});
    }
});

app.post('/api/heartbeat', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    try {
        const fileData = await fsPromises.readFile(DB_FILE, 'utf8');
        let db = JSON.parse(fileData || '{}');

        if (!db[username]) {
            db[username] = { xp: 0, level: 1, activeEvent: null, isDemoMode: false, lastTick: Date.now(), lastEventTime: Date.now() };
        }

        const user = db[username];
        updateUserState(user);
        
        // --- BUG FIX START ---
        // Create a copy to send to client containing the 'true' flag
        const responseUser = { ...user };

        // Reset the flag in the database so next poll sees 'false'
        if (user.justLeveledUp) {
            user.justLeveledUp = false;
        }
        // --- BUG FIX END ---

        await fsPromises.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
        res.json(responseUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/toggle-warp', async (req, res) => {
    const { username } = req.body;
    try {
        const fileData = await fsPromises.readFile(DB_FILE, 'utf8');
        let db = JSON.parse(fileData || '{}');
        
        if (db[username]) {
            updateUserState(db[username]); // Settle pending XP
            db[username].isDemoMode = !db[username].isDemoMode;
            
            // Fix: Handle level up flag here too if toggling caused a level up
            const responseUser = { ...db[username] };
            if (db[username].justLeveledUp) db[username].justLeveledUp = false;

            await fsPromises.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
            res.json(responseUser);
        } else {
            res.status(404).json({error: "User not found"});
        }
    } catch (err) { console.error(err); }
});

app.post('/api/action', async (req, res) => {
    const { username, action } = req.body;
    try {
        const fileData = await fsPromises.readFile(DB_FILE, 'utf8');
        let db = JSON.parse(fileData || '{}');
        
        if (!db[username]) return res.status(404).json({ error: "User not found" });
        
        const user = db[username];
        updateUserState(user); // Update state first

        if (user.activeEvent === action) {
            // Success
            const reward = Math.floor(Math.random() * (15 - 3 + 1)) + 3;
            const reqXp = user.level * 100;
            user.xp += reward;
            if (user.xp >= reqXp && user.level < 10) {
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

        // --- BUG FIX START ---
        const responseUser = { ...user };
        if (user.justLeveledUp) {
            user.justLeveledUp = false;
        }
        // --- BUG FIX END ---

        await fsPromises.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
        res.json(responseUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const data = await fsPromises.readFile(DB_FILE, 'utf8');
        const json = JSON.parse(data || '{}');
        res.json(Object.keys(json));
    } catch (err) { res.json([]); }
});

app.listen(PORT, () => {
    console.log(`\n🌱 Zen Arboretum Server running on http://localhost:${PORT}`);
});