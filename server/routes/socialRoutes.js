const express = require('express');
const { asyncHandler } = require('../http/errors');
const { requireValidUsername } = require('../http/userContext');

function createSocialRoutes({ socialService }) {
  const router = express.Router();

  router.get('/garden/:username', asyncHandler((req, res) => {
    res.json(socialService.getGarden(req.params.username));
  }));

  router.post('/gift', asyncHandler((req, res) => {
    const fromUsername = requireValidUsername(req.body.fromUsername);
    const toUsername = requireValidUsername(req.body.toUsername);
    res.json(socialService.sendGift(fromUsername, toUsername));
  }));

  router.get('/users', asyncHandler((req, res) => {
    res.json(socialService.listUsers());
  }));

  router.get('/leaderboard', asyncHandler((req, res) => {
    res.json(socialService.getLeaderboard());
  }));

  router.get('/achievements/:username', asyncHandler((req, res) => {
    res.json(socialService.getAchievements(req.params.username));
  }));

  return router;
}

module.exports = { createSocialRoutes };
