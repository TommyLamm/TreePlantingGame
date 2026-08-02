const { HttpError } = require('../http/errors');

const isValidCoinBalance = value => typeof value === 'number'
  && Number.isFinite(value)
  && value >= 0;

const isValidXpBalance = value => typeof value === 'number'
  && Number.isFinite(value)
  && value >= 0;

const HELP_REWARD_COINS = 50;
const HELP_REWARD_XP = 10;
const MAX_HELPERS_PER_DAY = 10;

function createSocialService({ repository, gameStateService }) {
  function getGarden(username) {
    const user = repository.getUser(username);
    if (!user) throw new HttpError(404, 'User not found');

    const result = {
      username,
      level: user.level || 1,
      generation: user.generation || 0,
      treeSkin: user.inventory?.treeSkin || 'default',
      companion: user.companion || null,
      achievements: user.achievements || [],
      joinDate: user.joinDate,
    };

    if (user.gardenHelp && Array.isArray(user.gardenHelp.helpers)) {
      result.helpers = user.gardenHelp.helpers;
      result.helpCount = user.gardenHelp.helpers.length;
    }

    return result;
  }

  function sendGift(fromUsername, toUsername) {
    if (fromUsername === toUsername) {
      throw new HttpError(400, 'Cannot gift yourself');
    }

    const sender = repository.getUser(fromUsername);
    if (!sender) throw new HttpError(404, 'Sender not found');
    const receiver = repository.getUser(toUsername);
    if (!receiver) throw new HttpError(404, 'Recipient not found');
    if (!isValidCoinBalance(sender.coins)
      || !isValidCoinBalance(receiver.coins)
      || !isValidCoinBalance(receiver.totalCoinsEarned)) {
      throw new HttpError(400, 'Invalid coin balance');
    }

    const today = gameStateService.getTodayStr();
    if (sender.lastGiftDate === today) {
      throw new HttpError(400, 'Already sent a gift today');
    }

    const giftAmount = 50;
    if (sender.coins < giftAmount) {
      throw new HttpError(400, 'Not enough coins');
    }

    sender.coins -= giftAmount;
    receiver.coins += giftAmount;
    receiver.totalCoinsEarned = (receiver.totalCoinsEarned || 0) + giftAmount;
    sender.lastGiftDate = today;

    repository.markDirty();
    return { success: true, amount: giftAmount, senderCoins: Math.floor(sender.coins) };
  }

  function helpGarden(helperUsername, ownerUsername) {
    if (helperUsername === ownerUsername) {
      throw new HttpError(400, 'Cannot help your own garden');
    }

    const helper = repository.getUser(helperUsername);
    if (!helper) throw new HttpError(404, 'Helper not found');
    const owner = repository.getUser(ownerUsername);
    if (!owner) throw new HttpError(404, 'Owner not found');

    if (!isValidCoinBalance(helper.coins)
      || !isValidCoinBalance(owner.coins)
      || !isValidCoinBalance(helper.totalCoinsEarned)
      || !isValidCoinBalance(owner.totalCoinsEarned)) {
      throw new HttpError(400, 'Invalid coin balance');
    }

    if (!isValidXpBalance(helper.xp) || !isValidXpBalance(owner.xp)) {
      throw new HttpError(400, 'Invalid XP balance');
    }

    const today = gameStateService.getTodayStr();

    if (helper.lastGardenHelpDate === today) {
      throw new HttpError(400, 'Already helped a garden today');
    }

    const gardenHelp = owner.gardenHelp || { date: null, helpers: [] };
    if (gardenHelp.date !== today) {
      gardenHelp.date = today;
      gardenHelp.helpers = [];
    }

    if (gardenHelp.helpers.length >= MAX_HELPERS_PER_DAY) {
      throw new HttpError(400, 'Garden help is full for today');
    }

    if (gardenHelp.helpers.includes(helperUsername)) {
      throw new HttpError(400, 'Already helped this garden today');
    }

    helper.coins += HELP_REWARD_COINS;
    helper.xp += HELP_REWARD_XP;
    helper.totalCoinsEarned = (helper.totalCoinsEarned || 0) + HELP_REWARD_COINS;
    helper.totalXpEarned = (helper.totalXpEarned || 0) + HELP_REWARD_XP;
    helper.lastGardenHelpDate = today;

    gardenHelp.helpers.push(helperUsername);
    owner.gardenHelp = gardenHelp;

    repository.markDirty();
    return {
      success: true,
      reward: { coins: HELP_REWARD_COINS, xp: HELP_REWARD_XP },
      ownerHelpCount: gardenHelp.helpers.length,
    };
  }

  function listUsers() {
    return repository.listNames();
  }

  function getLeaderboard() {
    return repository.entries()
      .filter(([name]) => name !== 'Admin')
      .map(([name, data]) => ({
        username: name,
        level: data.level || 1,
        xp: data.xp || 0,
        treeSkin: data.inventory?.treeSkin || 'default',
        generation: data.generation || 0,
        companion: data.companion || null,
      }))
      .sort((a, b) => {
        if (b.generation !== a.generation) return b.generation - a.generation;
        if (b.level !== a.level) return b.level - a.level;
        return b.xp - a.xp;
      })
      .slice(0, 20);
  }

  function getAchievements(username) {
    const user = repository.getUser(username);
    if (!user) throw new HttpError(404, 'User not found');
    return { achievements: user.achievements || [] };
  }

  return { getGarden, sendGift, helpGarden, listUsers, getLeaderboard, getAchievements };
}

module.exports = { createSocialService };
