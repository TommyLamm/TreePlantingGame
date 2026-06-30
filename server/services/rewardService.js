const { STORE_ITEMS, COMPANIONS, DAILY_REWARDS } = require('../config/gameData');
const { HttpError } = require('../http/errors');

const isValidCoinBalance = value => typeof value === 'number'
  && Number.isFinite(value)
  && value >= 0;

function createRewardService({
  repository,
  gameStateService,
  achievementService,
  now = Date.now,
  random = Math.random,
}) {
  function buyItem(user, itemId, type) {
    if (!isValidCoinBalance(user.coins)) {
      throw new HttpError(400, 'Invalid coin balance');
    }
    gameStateService.updateUserState(user);

    const storeItem = STORE_ITEMS.find(item => item.id === itemId && item.type === type);
    if (!storeItem) throw new HttpError(400, 'Item not found');
    const price = storeItem.price;

    if (user.coins < price) throw new HttpError(400, 'Not enough coins');

    user.coins -= price;
    if (type === 'buff' && itemId === 'xpBuff') user.inventory.xpBuff = true;
    if (type === 'auto' && itemId === 'autoWater') user.inventory.autoWater = true;
    if (type === 'skin') {
      if (!user.inventory.unlockedSkins) user.inventory.unlockedSkins = ['default'];
      if (!user.inventory.unlockedSkins.includes(itemId)) {
        user.inventory.unlockedSkins.push(itemId);
      }
      user.inventory.treeSkin = itemId;
    }

    achievementService.checkAchievements(user);
    repository.markDirty();
    return user;
  }

  function equipItem(user, itemId) {
    gameStateService.updateUserState(user);

    if (user.inventory?.unlockedSkins?.includes(itemId) || itemId === 'default') {
      user.inventory.treeSkin = itemId;
      repository.markDirty();
    }
    return user;
  }

  function claimDailyReward(user) {
    gameStateService.updateUserState(user);

    if (user.dailyRewardClaimed) {
      throw new HttpError(400, 'Already claimed today');
    }

    const dayIndex = ((user.loginStreak || 1) - 1) % 7;
    const reward = DAILY_REWARDS[dayIndex];

    user.coins += reward.coins;
    user.totalCoinsEarned = (user.totalCoinsEarned || 0) + reward.coins;
    if (reward.xp > 0) {
      user.xp += reward.xp;
      user.totalXpEarned = (user.totalXpEarned || 0) + reward.xp;
    }
    user.dailyRewardClaimed = true;

    achievementService.checkAchievements(user);
    repository.markDirty();
    return { ...user, claimedReward: reward, dayIndex };
  }

  function buyCompanion(user, companionId) {
    if (!isValidCoinBalance(user.coins)) {
      throw new HttpError(400, 'Invalid coin balance');
    }
    gameStateService.updateUserState(user);

    const comp = COMPANIONS.find(item => item.id === companionId);
    if (!comp) throw new HttpError(400, 'Companion not found');
    if (comp.prestigeOnly && (user.generation || 0) < 1) {
      throw new HttpError(400, 'Requires at least 1 prestige');
    }
    if (user.level < comp.unlockLevel) {
      throw new HttpError(400, `Requires level ${comp.unlockLevel}`);
    }
    if ((user.unlockedCompanions || []).includes(companionId)) {
      throw new HttpError(400, 'Already owned');
    }
    if (user.coins < comp.price) {
      throw new HttpError(400, 'Not enough coins');
    }

    user.coins -= comp.price;
    if (!user.unlockedCompanions) user.unlockedCompanions = [];
    user.unlockedCompanions.push(companionId);
    user.companion = companionId;

    achievementService.checkAchievements(user);
    repository.markDirty();
    return user;
  }

  function equipCompanion(user, companionId) {
    gameStateService.updateUserState(user);

    if (companionId === null) {
      user.companion = null;
      repository.markDirty();
      return user;
    }

    if (!(user.unlockedCompanions || []).includes(companionId)) {
      throw new HttpError(400, 'Companion not owned');
    }

    user.companion = companionId;
    repository.markDirty();
    return user;
  }

  function shakeTree(user) {
    gameStateService.updateUserState(user);

    const currentTime = now();
    const cooldown = 30000;
    if (currentTime - (user.lastShakeTime || 0) < cooldown) {
      return { coins: 0, cooldown: true, remainingMs: cooldown - (currentTime - user.lastShakeTime) };
    }

    user.lastShakeTime = currentTime;
    let droppedCoins = 0;
    if (random() < 0.3) {
      droppedCoins = Math.floor(random() * 5) + 1;
      user.coins += droppedCoins;
      user.totalCoinsEarned = (user.totalCoinsEarned || 0) + droppedCoins;
    }

    repository.markDirty();
    return { coins: droppedCoins, cooldown: false };
  }

  function claimMinigameReward(user, gameType, score) {
    if (gameType !== 'memory' && gameType !== 'water') {
      throw new HttpError(400, 'Invalid mini-game');
    }
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
      throw new HttpError(400, 'Invalid score');
    }
    gameStateService.updateUserState(user);

    const today = gameStateService.getTodayStr();
    if (user.minigameDate !== today) {
      user.minigameDate = today;
      user.minigameCount = 0;
    }

    if (user.minigameCount >= 3) {
      throw new HttpError(400, 'Max 3 mini-games per day');
    }

    const coinsEarned = Math.min(Math.floor(score * 5), 200);
    user.coins += coinsEarned;
    user.totalCoinsEarned = (user.totalCoinsEarned || 0) + coinsEarned;
    user.minigameCount++;

    repository.markDirty();
    return { coinsEarned, gamesRemaining: 3 - user.minigameCount };
  }

  return {
    buyItem,
    equipItem,
    claimDailyReward,
    buyCompanion,
    equipCompanion,
    shakeTree,
    claimMinigameReward,
  };
}

module.exports = { createRewardService };
