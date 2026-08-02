const express = require('express');
const { asyncHandler } = require('../http/errors');
const { requireValidUsername } = require('../http/userContext');

function createSocialRoutes({ socialService }) {
  const router = express.Router();

  router.get('/garden/:username', asyncHandler(async (req, res) => {
    res.json(await socialService.getGarden(req.params.username));
  }));

  router.post('/garden/help', asyncHandler(async (req, res) => {
    const helperUsername = requireValidUsername(req.body.helperUsername);
    const ownerUsername = requireValidUsername(req.body.ownerUsername);
    res.json(await socialService.helpGarden(helperUsername, ownerUsername));
  }));

  router.post('/gift', asyncHandler(async (req, res) => {
    const fromUsername = requireValidUsername(req.body.fromUsername);
    const toUsername = requireValidUsername(req.body.toUsername);
    res.json(await socialService.sendGift(fromUsername, toUsername));
  }));

  router.get('/users', asyncHandler(async (req, res) => {
    res.json(await socialService.listUsers());
  }));

  router.get('/leaderboard', asyncHandler(async (req, res) => {
    res.json(await socialService.getLeaderboard());
  }));

  router.get('/achievements/:username', asyncHandler(async (req, res) => {
    res.json(await socialService.getAchievements(req.params.username));
  }));

  return router;
}

module.exports = { createSocialRoutes };
