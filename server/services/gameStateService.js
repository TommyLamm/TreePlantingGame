const { migrateUser } = require('../data/userRepository');
const {
    COMPANIONS,
    PRESTIGE_UPGRADES,
    EVENT_REWARDS,
    WEATHER_TYPES,
    WEATHER_MODIFIERS,
} = require('../config/gameData');

function createGameStateService({
    repository,
    achievementService,
    now = Date.now,
    random = Math.random,
    logger = console,
}) {
    const initializedAt = now();
    let weather = {
        type: 'sunny',
        changedAt: initializedAt,
        nextChangeAt: initializedAt + (2 + random() * 2) * 3600000,
    };

    function updateWeather() {
        const currentTime = now();
        if (currentTime >= weather.nextChangeAt) {
            const newType = WEATHER_TYPES[Math.floor(random() * WEATHER_TYPES.length)];
            weather = {
                type: newType,
                changedAt: currentTime,
                nextChangeAt: currentTime + (2 + random() * 2) * 3600000,
            };
            logger.log(`[Weather] Changed to ${newType}`);
        }
    }

    function getSeason() {
        const month = new Date(now()).getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'autumn';
        return 'winter';
    }

    function formatLocalDate(timestamp) {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function getTodayStr() {
        return formatLocalDate(now());
    }

    function getCompanionBonuses(user) {
        const bonuses = { xpMult: 1, coinMult: 1, eventXpMult: 1 };
        if (!user.companion) return bonuses;
        const companion = COMPANIONS.find(item => item.id === user.companion);
        if (!companion) return bonuses;

        switch (companion.bonus.type) {
            case 'xp': bonuses.xpMult += companion.bonus.value; break;
            case 'coins': bonuses.coinMult += companion.bonus.value; break;
            case 'eventXp': bonuses.eventXpMult += companion.bonus.value; break;
            case 'allBonus':
                bonuses.xpMult += companion.bonus.value;
                bonuses.coinMult += companion.bonus.value;
                bonuses.eventXpMult += companion.bonus.value;
                break;
        }
        return bonuses;
    }

    function getPrestigeBonuses(user) {
        const bonuses = { xpMult: 1, coinMult: 1, eventFreqReduction: 0, startLevel: 1, comboCapBonus: 0 };
        const upgrades = user.prestigeUpgrades || {};
        for (const upgrade of PRESTIGE_UPGRADES) {
            const level = upgrades[upgrade.id] || 0;
            if (level <= 0) continue;
            switch (upgrade.id) {
                case 'xpBoost': bonuses.xpMult += level * upgrade.effectPerLevel; break;
                case 'coinBoost': bonuses.coinMult += level * upgrade.effectPerLevel; break;
                case 'eventFreq': bonuses.eventFreqReduction += level * upgrade.effectPerLevel; break;
                case 'startLevel': bonuses.startLevel = 1 + level * upgrade.effectPerLevel; break;
                case 'comboBonus': bonuses.comboCapBonus += level * upgrade.effectPerLevel; break;
            }
        }
        return bonuses;
    }

    function checkDailyLogin(user, currentTime) {
        const today = formatLocalDate(currentTime);
        if (user.lastLoginDate === today) return false;

        const yesterday = new Date(currentTime);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatLocalDate(yesterday.getTime());

        if (user.lastLoginDate === yesterdayStr) {
            user.loginStreak += 1;
        } else {
            user.loginStreak = 1;
        }

        user.lastLoginDate = today;
        user.dailyRewardClaimed = false;
        if (user.loginStreak > (user.maxLoginStreak || 0)) {
            user.maxLoginStreak = user.loginStreak;
        }
        return true;
    }

    function updateUserState(user) {
        const currentTime = now();
        const beforeMigration = JSON.stringify(user);
        migrateUser(user, currentTime);
        let changed = JSON.stringify(user) !== beforeMigration;

        if (checkDailyLogin(user, currentTime)) changed = true;

        const dt = currentTime - user.lastTick;
        const speedMultiplier = user.isDemoMode ? 600 : 1;

        if (dt > 0 && dt <= 15000) {
            user.playTime += dt;
            changed = true;
        }

        if (dt > 15000) {
            const offlineDt = dt;
            const weatherModifier = WEATHER_MODIFIERS[weather.type] || { xpMult: 1, coinMult: 1 };
            const companionBonus = getCompanionBonuses(user);
            const prestigeBonus = getPrestigeBonuses(user);
            const xpBuffMultiplier = user.inventory.xpBuff ? 1.5 : 1;

            const totalXpMultiplier = xpBuffMultiplier * weatherModifier.xpMult * companionBonus.xpMult * prestigeBonus.xpMult;
            const totalCoinMultiplier = weatherModifier.coinMult * companionBonus.coinMult * prestigeBonus.coinMult;

            const offlineXp = (offlineDt / 3600000) * speedMultiplier * 1 * totalXpMultiplier;
            const offlineCoins = (offlineDt / 3600000) * speedMultiplier * 50 * totalCoinMultiplier;

            user.lastOfflineXp = Math.floor(offlineXp * 10) / 10;
            user.lastOfflineCoins = Math.floor(offlineCoins);
            changed = true;
        } else {
            if (user.lastOfflineXp !== 0 || user.lastOfflineCoins !== 0) changed = true;
            user.lastOfflineXp = 0;
            user.lastOfflineCoins = 0;
        }

        const previousXp = user.xp;
        const previousLevel = user.level;
        const previousCoins = user.coins;

        updateWeather();

        const weatherModifier = WEATHER_MODIFIERS[weather.type] || { xpMult: 1, coinMult: 1 };
        const companionBonus = getCompanionBonuses(user);
        const prestigeBonus = getPrestigeBonuses(user);
        const goldenHourActive = currentTime < (user.goldenHourUntil || 0);
        const goldenHourMultiplier = goldenHourActive ? 2 : 1;

        const xpBuffMultiplier = user.inventory.xpBuff ? 1.5 : 1;
        const totalXpMultiplier = xpBuffMultiplier * weatherModifier.xpMult * companionBonus.xpMult * prestigeBonus.xpMult * goldenHourMultiplier;
        const totalCoinMultiplier = weatherModifier.coinMult * companionBonus.coinMult * prestigeBonus.coinMult;

        const xpGained = (dt / 3600000) * speedMultiplier * 1 * totalXpMultiplier;
        const coinsGained = (dt / 3600000) * speedMultiplier * 50 * totalCoinMultiplier;

        if (user.level < 100) {
            user.xp += xpGained;
            user.coins += coinsGained;
            user.totalXpEarned = (user.totalXpEarned || 0) + xpGained;
            user.totalCoinsEarned = (user.totalCoinsEarned || 0) + coinsGained;

            const requiredXp = Math.floor(10 + Math.pow(user.level, 1.6));
            if (user.xp >= requiredXp) {
                user.xp -= requiredXp;
                user.level++;
                user.justLeveledUp = true;
            }
        }

        user.lastTick = currentTime;

        if (user.xp !== previousXp || user.level !== previousLevel || user.coins !== previousCoins) {
            changed = true;
        }

        const prestigeEventReduction = prestigeBonus.eventFreqReduction || 0;
        const baseEventInterval = 10 * 60000;
        const eventIntervalMs = Math.max(60000, baseEventInterval - prestigeEventReduction) / speedMultiplier;

        if (!user.activeEvent && user.level < 100) {
            const timeSinceEvent = currentTime - user.lastEventTime;

            if (timeSinceEvent >= eventIntervalMs) {
                const events = ['WATER', 'PEST', 'FERTILIZE', 'PRUNE', 'SUNLIGHT', 'STORM'];
                user.activeEvent = events[Math.floor(random() * events.length)];
                user.eventSpawnedAt = currentTime;
                changed = true;
                logger.log(`[Game Logic] Spawned ${user.activeEvent}`);
            }
        } else if (user.activeEvent === 'WATER' && user.inventory?.autoWater) {
            const timeSinceEventSpawn = currentTime - (user.eventSpawnedAt || user.lastEventTime);
            const resolveTimeMs = 5000 / speedMultiplier;
            if (timeSinceEventSpawn >= resolveTimeMs) {
                const rewards = EVENT_REWARDS.WATER;
                const comboMultiplier = 1 + Math.min(user.combo || 0, 10) * 0.1;
                const xpMultiplier = totalXpMultiplier * companionBonus.eventXpMult * comboMultiplier;
                const reward = (Math.floor(random() * (rewards.xpMax - rewards.xpMin + 1)) + rewards.xpMin) * xpMultiplier;
                const coinReward = Math.floor(random() * (rewards.coinMax - rewards.coinMin + 1)) + rewards.coinMin;

                user.activeEvent = null;
                user.eventSpawnedAt = null;
                user.lastEventResolved = true;
                user.xp += reward;
                user.coins += coinReward;
                user.totalXpEarned = (user.totalXpEarned || 0) + reward;
                user.totalCoinsEarned = (user.totalCoinsEarned || 0) + coinReward;
                user.interactionCount++;
                user.totalEventsResolved = (user.totalEventsResolved || 0) + 1;
                user.combo = (user.combo || 0) + 1;
                if (user.combo > (user.maxCombo || 0)) user.maxCombo = user.combo;

                const requiredXp = Math.floor(10 + Math.pow(user.level, 1.6));
                if (user.xp >= requiredXp && user.level < 100) {
                    user.xp -= requiredXp;
                    user.level++;
                    user.justLeveledUp = true;
                }

                user.lastReward = Math.floor(reward * 10) / 10;
                user.lastEventTime = currentTime;
                changed = true;
                logger.log(`[Game Logic] Auto-resolved WATER (combo: ${user.combo})`);
            }
        }

        if (user.activeEvent === 'STORM' && user.eventSpawnedAt) {
            const stormTimeout = (2 * 60000) / speedMultiplier;
            if (currentTime - user.eventSpawnedAt >= stormTimeout) {
                user.xp = Math.max(0, user.xp - 10);
                user.activeEvent = null;
                user.eventSpawnedAt = null;
                user.lastEventTime = currentTime;
                user.combo = 0;
                user.stormPenalty = true;
                changed = true;
                logger.log('[Game Logic] STORM penalty — user lost 10 XP');
            }
        }

        if (achievementService.checkAchievements(user)) {
            changed = true;
        }

        if (changed) {
            repository.markDirty();
        }
    }

    function getWeather() {
        updateWeather();
        return {
            type: weather.type,
            season: getSeason(),
            changedAt: weather.changedAt,
            nextChangeAt: weather.nextChangeAt,
        };
    }

    function toGameResponse(user, { dailyReward = false } = {}) {
        const currentWeather = getWeather();
        const response = {
            ...user,
            weather: currentWeather.type,
            season: currentWeather.season,
        };
        if (dailyReward) response.dailyRewardAvailable = !user.dailyRewardClaimed;
        return response;
    }

    function heartbeat(user) {
        updateUserState(user);
        const response = toGameResponse(user, { dailyReward: true });
        let clearedTransient = false;

        if (user.justLeveledUp) {
            user.justLeveledUp = false;
            clearedTransient = true;
        }
        if (user.newAchievements) {
            delete user.newAchievements;
            clearedTransient = true;
        }
        if (user.stormPenalty) {
            delete user.stormPenalty;
            clearedTransient = true;
        }

        if (clearedTransient) repository.markDirty();
        return response;
    }

    return {
        heartbeat,
        updateUserState,
        getCompanionBonuses,
        getPrestigeBonuses,
        getWeather,
        getSeason,
        getTodayStr,
        toGameResponse,
    };
}

module.exports = { createGameStateService };
