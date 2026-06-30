const express = require('express');
const cors = require('cors');
const { errorMiddleware } = require('./http/errors');
const { createMetaRoutes } = require('./routes/metaRoutes');
const { createSessionRoutes } = require('./routes/sessionRoutes');
const { createProgressionRoutes } = require('./routes/progressionRoutes');
const { createStoreRoutes } = require('./routes/storeRoutes');
const { createSocialRoutes } = require('./routes/socialRoutes');

function createApp({
  repository,
  gameStateService,
  progressionService,
  rewardService,
  socialService,
  clientDistPath,
}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.static(clientDistPath));
  app.use('/api', createMetaRoutes({ repository, gameStateService }));
  app.use('/api', createSessionRoutes({ repository, gameStateService, progressionService }));
  app.use('/api', createProgressionRoutes({ repository, progressionService }));
  app.use('/api', createStoreRoutes({ repository, rewardService }));
  app.use('/api', createSocialRoutes({ socialService }));
  app.use(errorMiddleware);
  return app;
}

module.exports = { createApp };
