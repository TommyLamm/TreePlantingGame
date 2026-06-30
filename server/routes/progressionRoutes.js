const express = require('express');
const { asyncHandler } = require('../http/errors');
const { requireValidUsername, requireExistingUser } = require('../http/userContext');

function createProgressionRoutes({ repository, progressionService }) {
  const router = express.Router();

  router.post('/action', asyncHandler(async (req, res) => {
    const { action } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(await progressionService.resolveAction(user, action, username));
  }));

  router.post('/prestige', asyncHandler(async (req, res) => {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(await progressionService.prestige(user));
  }));

  router.post('/prestige/upgrade', asyncHandler(async (req, res) => {
    const { upgradeId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(await progressionService.upgradePrestige(user, upgradeId));
  }));

  return router;
}

module.exports = { createProgressionRoutes };
