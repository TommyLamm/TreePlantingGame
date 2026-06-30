const express = require('express');
const { asyncHandler } = require('../http/errors');
const { requireValidUsername, requireExistingUser } = require('../http/userContext');

function createProgressionRoutes({ repository, progressionService }) {
  const router = express.Router();

  router.post('/action', asyncHandler((req, res) => {
    const { action } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(progressionService.resolveAction(user, action, username));
  }));

  router.post('/prestige', asyncHandler((req, res) => {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(progressionService.prestige(user));
  }));

  router.post('/prestige/upgrade', asyncHandler((req, res) => {
    const { upgradeId } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(progressionService.upgradePrestige(user, upgradeId));
  }));

  return router;
}

module.exports = { createProgressionRoutes };
