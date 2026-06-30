const path = require('path');
const { ACHIEVEMENTS } = require('./server/config/gameData');
const { createUserRepository } = require('./server/data/userRepository');
const { createAchievementService } = require('./server/services/achievementService');
const { createGameStateService } = require('./server/services/gameStateService');
const { createProgressionService } = require('./server/services/progressionService');
const { createRewardService } = require('./server/services/rewardService');
const { createSocialService } = require('./server/services/socialService');
const { createApp } = require('./server/app');

const PORT = process.env.PORT || 7777;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'save.json');

function createShutdown({ repository, exit = process.exit, logger = console }) {
    let shutdownPromise;

    return function shutdown(signal) {
        if (!shutdownPromise) {
            shutdownPromise = (async () => {
                logger.log(`\n[Shutdown] Received ${signal}. Saving data to disk...`);
                repository.stopAutoSave();
                const hadPending = repository.isDirty();

                try {
                    await repository.flush();
                    if (repository.isDirty()) {
                        throw new Error('Data remains unsaved after flush.');
                    }
                } catch (error) {
                    logger.error('[Shutdown Error] Failed to save data:', error);
                    exit(1);
                    return;
                }

                logger.log(hadPending
                    ? '[Shutdown] Data saved successfully.'
                    : '[Shutdown] No pending changes. Data is safe.');
                exit(0);
            })();
        }
        return shutdownPromise;
    };
}

function main() {
    const repository = createUserRepository({ dbFile: DB_FILE });
    repository.initialize();
    const achievementService = createAchievementService({ achievements: ACHIEVEMENTS });
    const gameStateService = createGameStateService({ repository, achievementService });
    const progressionService = createProgressionService({ repository, gameStateService, achievementService });
    const rewardService = createRewardService({ repository, gameStateService, achievementService });
    const socialService = createSocialService({ repository, gameStateService });

    const app = createApp({
        repository,
        gameStateService,
        progressionService,
        rewardService,
        socialService,
        clientDistPath: path.join(__dirname, 'client/dist'),
    });

    const shutdown = createShutdown({ repository });
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    const server = app.listen(PORT, () => {
        repository.startAutoSave();
        console.log(`\n🌱 Zen Arboretum Server running on http://localhost:${PORT}`);
    });

    server.on('error', (error) => {
        repository.stopAutoSave();
        if (error.code === 'EADDRINUSE') {
            console.error(`\n[Server] Port ${PORT} is already in use.`);
            console.error('[Server] Another game server is probably still running.');
            console.error(`[Server] Stop the existing process or start this one with a different port, for example: $env:PORT=7778; node server.js\n`);
            process.exit(1);
            return;
        }
        console.error('[Server Error]', error);
        process.exit(1);
    });
}

if (require.main === module) main();

module.exports = { createShutdown };
