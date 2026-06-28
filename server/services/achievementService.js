function createAchievementService({ achievements }) {
  function checkAchievements(user) {
    if (!user.achievements) user.achievements = [];
    const newlyUnlocked = achievements
      .filter(item => !user.achievements.includes(item.id) && item.condition(user))
      .map(item => item.id);
    if (newlyUnlocked.length === 0) return false;
    user.achievements.push(...newlyUnlocked);
    user.newAchievements = newlyUnlocked;
    return true;
  }
  return { checkAchievements };
}
module.exports = { createAchievementService };
