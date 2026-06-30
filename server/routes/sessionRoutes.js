const express = require('express');
const { HttpError, asyncHandler } = require('../http/errors');
const { requireValidUsername, requireExistingUser } = require('../http/userContext');

function createSessionRoutes({ repository, gameStateService, progressionService }) {
  const router = express.Router();

  router.post('/heartbeat', asyncHandler((req, res) => {
    const { username } = req.body;
    if (!username) throw new HttpError(400, 'Username required');
    requireValidUsername(username, 'Invalid username. 2-16 chars, letters/numbers/underscore/Chinese only.');
    const user = repository.ensureUser(username, username === 'Admin');
    res.json(gameStateService.heartbeat(user));
  }));

  router.post('/toggle-warp', asyncHandler((req, res) => {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(progressionService.toggleWarp(user));
  }));

  router.post('/profile/update', asyncHandler((req, res) => {
    const { profile } = req.body;
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(progressionService.updateProfile(user, profile));
  }));

  return router;
}

module.exports = { createSessionRoutes };
