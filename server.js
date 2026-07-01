const path = require('path');
const http = require('node:http');
const { ACHIEVEMENTS } = require('./server/config/gameData');
const { createUserRepository } = require('./server/data/userRepository');
const { createAchievementService } = require('./server/services/achievementService');
const { createGameStateService } = require('./server/services/gameStateService');
const { createProgressionService } = require('./server/services/progressionService');
const { createRewardService } = require('./server/services/rewardService');
const { createSocialService } = require('./server/services/socialService');
const { createApp } = require('./server/app');
const { attachServerLifecycle, createShutdown } = require('./server/lifecycle');

const PORT = process.env.PORT || 7777;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'save.json');

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

    const server = http.createServer(app);
    const shutdown = createShutdown({ repository, server });
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    attachServerLifecycle({ server, repository, shutdown, port: PORT });
    server.listen(PORT);
}

if (require.main === module) main();

module.exports = { attachServerLifecycle, createShutdown };
