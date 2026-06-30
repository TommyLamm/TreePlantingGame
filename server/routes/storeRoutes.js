const express = require('express');
const { asyncHandler } = require('../http/errors');
const { requireValidUsername, requireExistingUser } = require('../http/userContext');

function createStoreRoutes({ repository, rewardService }) {
  const router = express.Router();

  router.post('/store/buy', asyncHandler(async (req, res) => {
    const { itemId, type } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(await rewardService.buyItem(user, itemId, type));
  }));

  router.post('/store/equip', asyncHandler(async (req, res) => {
    const { itemId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(await rewardService.equipItem(user, itemId));
  }));

  router.post('/daily-reward/claim', asyncHandler(async (req, res) => {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(await rewardService.claimDailyReward(user));
  }));

  router.post('/companion/buy', asyncHandler(async (req, res) => {
    const { companionId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(await rewardService.buyCompanion(user, companionId));
  }));

  router.post('/companion/equip', asyncHandler(async (req, res) => {
    const { companionId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(await rewardService.equipCompanion(user, companionId));
  }));

  router.post('/shake', asyncHandler(async (req, res) => {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(await rewardService.shakeTree(user));
  }));

  router.post('/minigame/reward', asyncHandler(async (req, res) => {
    const { gameType, score } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(await rewardService.claimMinigameReward(user, gameType, score));
  }));

  return router;
}

module.exports = { createStoreRoutes };
