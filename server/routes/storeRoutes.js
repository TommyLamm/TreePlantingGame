const express = require('express');
const { asyncHandler } = require('../http/errors');
const { requireValidUsername, requireExistingUser } = require('../http/userContext');

function createStoreRoutes({ repository, rewardService }) {
  const router = express.Router();

  router.post('/store/buy', asyncHandler((req, res) => {
    const { itemId, type } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.buyItem(user, itemId, type));
  }));

  router.post('/store/equip', asyncHandler((req, res) => {
    const { itemId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.equipItem(user, itemId));
  }));

  router.post('/daily-reward/claim', asyncHandler((req, res) => {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.claimDailyReward(user));
  }));

  router.post('/companion/buy', asyncHandler((req, res) => {
    const { companionId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.buyCompanion(user, companionId));
  }));

  router.post('/companion/equip', asyncHandler((req, res) => {
    const { companionId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.equipCompanion(user, companionId));
  }));

  router.post('/shake', asyncHandler((req, res) => {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.shakeTree(user));
  }));

  router.post('/minigame/reward', asyncHandler((req, res) => {
    const { gameType, score } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.claimMinigameReward(user, gameType, score));
  }));

  return router;
}

module.exports = { createStoreRoutes };
