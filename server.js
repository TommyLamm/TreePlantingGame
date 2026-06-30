// NOTE: For production, consider adding express-rate-limit:
// const rateLimit = require('express-rate-limit');
// app.use('/api/', rateLimit({ windowMs: 60000, max: 100 }));

const express = require('express');
const path = require('path');
const cors = require('cors');
const { ACHIEVEMENTS } = require('./server/config/gameData');
const { createUserRepository } = require('./server/data/userRepository');
const { HttpError, asyncHandler, errorMiddleware } = require('./server/http/errors');
const { requireValidUsername, requireExistingUser } = require('./server/http/userContext');
const { createAchievementService } = require('./server/services/achievementService');
const { createGameStateService } = require('./server/services/gameStateService');
const { createProgressionService } = require('./server/services/progressionService');
const { createRewardService } = require('./server/services/rewardService');
const { createSocialService } = require('./server/services/socialService');

const app = express();
const PORT = process.env.PORT || 7777;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'save.json');

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'client/dist')));

const repository = createUserRepository({ dbFile: DB_FILE });
repository.initialize();
const achievementService = createAchievementService({ achievements: ACHIEVEMENTS });
const gameStateService = createGameStateService({ repository, achievementService });
const progressionService = createProgressionService({ repository, gameStateService, achievementService });
const rewardService = createRewardService({ repository, gameStateService, achievementService });
const socialService = createSocialService({ repository, gameStateService });
repository.startAutoSave();

async function shutdown(signal) {
    console.log(`\n[Shutdown] Received ${signal}. Saving data to disk...`);
    repository.stopAutoSave();
    if (repository.isDirty()) {
        await repository.flush();
        if (!repository.isDirty()) {
            console.log('[Shutdown] Data saved successfully.');
        } else {
            console.error('[Shutdown Error] Failed to save data.');
        }
    } else {
        console.log('[Shutdown] No pending changes. Data is safe.');
    }
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

app.get('/api/health', asyncHandler((req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        users: repository.size(),
    });
}));

app.get('/api/db', asyncHandler((req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Expires': '0' });
    res.json({
        userCount: repository.size(),
        users: repository.listNames(),
    });
}));

app.get('/api/weather', asyncHandler((req, res) => {
    res.json(gameStateService.getWeather());
}));

app.post('/api/heartbeat', asyncHandler((req, res) => {
    const { username } = req.body;
    if (!username) throw new HttpError(400, 'Username required');
    requireValidUsername(username, 'Invalid username. 2-16 chars, letters/numbers/underscore/Chinese only.');
    const user = repository.ensureUser(username, username === 'Admin');
    res.json(gameStateService.heartbeat(user));
}));

app.post('/api/toggle-warp', asyncHandler((req, res) => {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(progressionService.toggleWarp(user));
}));

app.post('/api/action', asyncHandler((req, res) => {
    const { action } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(progressionService.resolveAction(user, action, username));
}));

app.post('/api/profile/update', asyncHandler((req, res) => {
    const { profile } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(progressionService.updateProfile(user, profile));
}));

app.post('/api/store/buy', asyncHandler((req, res) => {
    const { itemId, type } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.buyItem(user, itemId, type));
}));

app.post('/api/store/equip', asyncHandler((req, res) => {
    const { itemId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.equipItem(user, itemId));
}));

app.post('/api/daily-reward/claim', asyncHandler((req, res) => {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.claimDailyReward(user));
}));

app.post('/api/companion/buy', asyncHandler((req, res) => {
    const { companionId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.buyCompanion(user, companionId));
}));

app.post('/api/companion/equip', asyncHandler((req, res) => {
    const { companionId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.equipCompanion(user, companionId));
}));

app.post('/api/prestige', asyncHandler((req, res) => {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(progressionService.prestige(user));
}));

app.post('/api/prestige/upgrade', asyncHandler((req, res) => {
    const { upgradeId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(progressionService.upgradePrestige(user, upgradeId));
}));

app.post('/api/shake', asyncHandler((req, res) => {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.shakeTree(user));
}));

app.get('/api/garden/:username', asyncHandler((req, res) => {
    res.json(socialService.getGarden(req.params.username));
}));

app.post('/api/gift', asyncHandler((req, res) => {
    const fromUsername = requireValidUsername(req.body.fromUsername);
    const toUsername = requireValidUsername(req.body.toUsername);
    res.json(socialService.sendGift(fromUsername, toUsername));
}));

app.post('/api/minigame/reward', asyncHandler((req, res) => {
    const { gameType, score } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.claimMinigameReward(user, gameType, score));
}));

app.get('/api/users', asyncHandler((req, res) => {
    res.json(socialService.listUsers());
}));

app.get('/api/leaderboard', asyncHandler((req, res) => {
    res.json(socialService.getLeaderboard());
}));

app.get('/api/achievements/:username', asyncHandler((req, res) => {
    res.json(socialService.getAchievements(req.params.username));
}));

app.use(errorMiddleware);

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
