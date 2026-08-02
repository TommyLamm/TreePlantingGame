const { EVENT_REWARDS, PRESTIGE_UPGRADES, WEATHER_MODIFIERS } = require('../config/gameData');
const { HttpError } = require('../http/errors');

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isValidBirthday(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function validateProfile(profile) {
  if (!isPlainObject(profile)) throw new HttpError(400, 'Invalid profile');

  if (profile.avatar !== undefined) {
    if (profile.avatar !== null && typeof profile.avatar !== 'string') {
      throw new HttpError(400, 'Invalid avatar');
    }
    if (typeof profile.avatar === 'string' && profile.avatar.length > 700000) {
      throw new HttpError(400, 'Avatar too large. Must be under 500KB.');
    }
  }
  if (profile.signature !== undefined
    && (typeof profile.signature !== 'string' || profile.signature.length > 50)) {
    throw new HttpError(400, 'Invalid signature');
  }
  if (profile.birthday !== undefined && !isValidBirthday(profile.birthday)) {
    throw new HttpError(400, 'Invalid birthday');
  }
}

function createProgressionService({
  repository,
  gameStateService,
  achievementService,
  now = Date.now,
  random = Math.random,
  logger = console,
}) {
  function clearResponseTransients(user, names) {
    for (const name of names) {
      if (name === 'justLeveledUp') {
        if (user.justLeveledUp) user.justLeveledUp = false;
      } else if (user[name]) {
        delete user[name];
      }
    }
  }

  function toggleWarp(user) {
    gameStateService.updateUserState(user);
    user.isDemoMode = !user.isDemoMode;
    repository.markDirty();

    const responseUser = gameStateService.toGameResponse(user);
    clearResponseTransients(user, ['justLeveledUp', 'newAchievements']);
    return responseUser;
  }

  function resolveAction(user, action, username) {
    gameStateService.updateUserState(user);

    if (user.activeEvent === action) {
      const rewards = EVENT_REWARDS[action] || { xpMin: 3, xpMax: 15, coinMin: 10, coinMax: 30 };
      const companionBonus = gameStateService.getCompanionBonuses(user);
      const prestigeBonus = gameStateService.getPrestigeBonuses(user);
      const comboCapBase = 10;
      const comboCap = comboCapBase + (prestigeBonus.comboCapBonus || 0);
      const comboMult = 1 + Math.min((user.combo || 0), comboCap) * 0.1;
      const goldenHourActive = now() < (user.goldenHourUntil || 0);
      const goldenHourMult = goldenHourActive ? 2 : 1;
      const xpBuffMult = user.inventory?.xpBuff ? 1.5 : 1;

      // Apply weather multiplier to manual event rewards (graceful fallback for mocks)
      const weatherModifier = (gameStateService.getWeather ? WEATHER_MODIFIERS[gameStateService.getWeather().type] : null) || { xpMult: 1, coinMult: 1 };

      const totalEventXpMult = xpBuffMult * companionBonus.eventXpMult * companionBonus.xpMult * prestigeBonus.xpMult * comboMult * goldenHourMult * weatherModifier.xpMult;
      const reward = (Math.floor(random() * (rewards.xpMax - rewards.xpMin + 1)) + rewards.xpMin) * totalEventXpMult;
      const coinReward = Math.floor((Math.floor(random() * (rewards.coinMax - rewards.coinMin + 1)) + rewards.coinMin) * companionBonus.coinMult * prestigeBonus.coinMult * weatherModifier.coinMult);

      const reqXp = Math.floor(10 + Math.pow(user.level, 1.6));
      user.xp += reward;
      user.coins += coinReward;
      user.totalXpEarned = (user.totalXpEarned || 0) + reward;
      user.totalCoinsEarned = (user.totalCoinsEarned || 0) + coinReward;
      user.interactionCount++;
      user.totalEventsResolved = (user.totalEventsResolved || 0) + 1;

      user.combo = (user.combo || 0) + 1;
      if (user.combo > (user.maxCombo || 0)) user.maxCombo = user.combo;

      if (user.xp >= reqXp && user.level < 100) {
        user.xp -= reqXp;
        user.level++;
        user.justLeveledUp = true;
      }

      if (action === 'SUNLIGHT') {
        user.goldenHourUntil = now() + 5 * 60 * 1000;
        user.goldenHourTriggered = true;
      }

      user.activeEvent = null;
      user.eventSpawnedAt = null;
      user.lastEventResolved = true;
      user.lastReward = Math.floor(reward * 10) / 10;
      user.lastCoinReward = coinReward;
      user.lastEventTime = now();

      achievementService.checkAchievements(user);
      logger.log(`[Game Logic] ${username} solved ${action}. Combo: ${user.combo}`);
    } else {
      user.lastEventResolved = false;
      user.combo = 0;
    }

    repository.markDirty();
    const responseUser = gameStateService.toGameResponse(user);
    clearResponseTransients(user, ['justLeveledUp', 'newAchievements', 'goldenHourTriggered']);
    return responseUser;
  }

  function updateProfile(user, profile) {
    if (profile !== undefined) validateProfile(profile);
    gameStateService.updateUserState(user);

    if (profile !== undefined) {
      if (profile.avatar !== undefined) {
        user.profile.avatar = profile.avatar;
      }
      if (profile.birthday !== undefined) user.profile.birthday = profile.birthday;
      if (profile.signature !== undefined) user.profile.signature = profile.signature;
    }

    repository.markDirty();
    return user;
  }

  function prestige(user) {
    gameStateService.updateUserState(user);

    if (user.level < 50) {
      throw new HttpError(400, 'Must be at least level 50 to prestige');
    }

    const pointsEarned = Math.floor(user.level / 10);
    const startLevel = gameStateService.getPrestigeBonuses(user).startLevel || 1;

    user.generation = (user.generation || 0) + 1;
    user.prestigePoints = (user.prestigePoints || 0) + pointsEarned;
    user.xp = 0;
    user.level = startLevel;
    user.activeEvent = null;
    user.eventSpawnedAt = null;
    user.lastEventTime = now();
    user.combo = 0;
    user.goldenHourUntil = 0;

    achievementService.checkAchievements(user);
    repository.markDirty();
    return { ...user, pointsEarned };
  }

  function upgradePrestige(user, upgradeId) {
    gameStateService.updateUserState(user);

    const upg = PRESTIGE_UPGRADES.find(item => item.id === upgradeId);
    if (!upg) throw new HttpError(400, 'Upgrade not found');

    const currentLevel = (user.prestigeUpgrades || {})[upgradeId] || 0;
    if (currentLevel >= upg.maxLevel) {
      throw new HttpError(400, 'Already at max level');
    }

    const cost = upg.costPerLevel;
    if ((user.prestigePoints || 0) < cost) {
      throw new HttpError(400, 'Not enough prestige points');
    }

    user.prestigePoints -= cost;
    if (!user.prestigeUpgrades) user.prestigeUpgrades = {};
    user.prestigeUpgrades[upgradeId] = currentLevel + 1;

    repository.markDirty();
    return user;
  }

  return { toggleWarp, resolveAction, updateProfile, prestige, upgradePrestige };
}

module.exports = { createProgressionService };