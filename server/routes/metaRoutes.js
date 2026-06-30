const express = require('express');
const { asyncHandler } = require('../http/errors');

function createMetaRoutes({ repository, gameStateService }) {
  const router = express.Router();

  router.get('/health', asyncHandler((req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      users: repository.size(),
    });
  }));

  router.get('/db', asyncHandler((req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Expires': '0' });
    res.json({
      userCount: repository.size(),
      users: repository.listNames(),
    });
  }));

  router.get('/weather', asyncHandler((req, res) => {
    res.json(gameStateService.getWeather());
  }));

  return router;
}

module.exports = { createMetaRoutes };
