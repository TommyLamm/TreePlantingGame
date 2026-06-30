const { HttpError } = require('../http/errors');

function createSocialService({ repository, gameStateService }) {
  function getGarden(username) {
    const user = repository.getUser(username);
    if (!user) throw new HttpError(404, 'User not found');

    return {
      username,
      level: user.level || 1,
      generation: user.generation || 0,
      treeSkin: user.inventory?.treeSkin || 'default',
      companion: user.companion || null,
      achievements: user.achievements || [],
      joinDate: user.joinDate,
    };
  }

  function sendGift(fromUsername, toUsername) {
    if (fromUsername === toUsername) {
      throw new HttpError(400, 'Cannot gift yourself');
    }

    const sender = repository.getUser(fromUsername);
    if (!sender) throw new HttpError(404, 'Sender not found');
    const receiver = repository.getUser(toUsername);
    if (!receiver) throw new HttpError(404, 'Recipient not found');

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

  return { getGarden, sendGift, listUsers, getLeaderboard, getAchievements };
}

module.exports = { createSocialService };
