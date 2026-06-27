const shared = require('../../shared/game-data.json');

module.exports = {
    STORE_ITEMS: shared.storeItems,
    COMPANIONS: shared.companions,
    PRESTIGE_UPGRADES: shared.prestigeUpgrades,
    DAILY_REWARDS: shared.dailyRewards.map(({ day, coins, xp }) => ({ day, coins, xp })),
};
