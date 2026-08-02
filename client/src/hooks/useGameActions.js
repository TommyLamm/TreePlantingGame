import { useCallback, useEffect, useState } from 'react';

import { api } from '../utils/api.js';
import { audio } from '../utils/audio.js';

export function useGameActions({
  currentUser,
  game,
  dispatch,
  t,
  modals,
  addLog,
  enqueueAchievements,
}) {
  const [localActiveEvent, setLocalActiveEvent] = useState(null);
  const [actionBursts, setActionBursts] = useState([]);
  const [shakeAnim, setShakeAnim] = useState(false);
  const {
    visibility,
    openModal,
    closeModal,
    setLeaderboardData,
    setGardenVisitData,
    setGiftError,
  } = modals;

  useEffect(() => {
    setLocalActiveEvent(game.activeEvent);
  }, [game.activeEvent]);

  const handleAction = useCallback(async (actionType) => {
    setLocalActiveEvent(null);

    // Spawn visual burst effect immediately
    const burstId = Date.now();
    let burstX = '50%';
    let burstY = '50%';
    if (actionType === 'WATER') { burstX = '38%'; burstY = '68%'; }
    else if (actionType === 'PEST') { burstX = '42%'; burstY = '45%'; }
    else if (actionType === 'FERTILIZE') { burstX = '50%'; burstY = '72%'; }
    else if (actionType === 'PRUNE') { burstX = '58%'; burstY = '48%'; }
    else if (actionType === 'SUNLIGHT') { burstX = '64%'; burstY = '30%'; }
    else if (actionType === 'STORM') { burstX = '46%'; burstY = '28%'; }

    setActionBursts(prev => [...prev, { id: burstId, type: actionType, x: burstX, y: burstY }]);
    setTimeout(() => {
      setActionBursts(prev => prev.filter(b => b.id !== burstId));
    }, 1500);

    try {
      const data = await api.sendAction(currentUser, actionType);

      if (data.lastEventResolved) {
        audio.playLevelUp();
        addLog(t('resolved', Math.floor(data.lastReward)));
        if ((data.combo || 0) > 1) {
          addLog(t('comboX', data.combo));
        }
        // Golden hour notification
        if (actionType === 'SUNLIGHT') {
          addLog(t('goldenHour'));
        }
      } else {
        audio.playClick();
        addLog(t('fail'));
        if ((data.combo || 0) === 0) {
          addLog(t('comboBreak'));
        }
      }
      // Sync final state
      dispatch({ type: 'SYNC_SERVER', data });

      // Handle new achievements
      if (data.newAchievements && data.newAchievements.length > 0) {
        enqueueAchievements(data.newAchievements);
      }
    } catch (e) {
      console.error(e);
      setLocalActiveEvent(game.activeEvent);
    }
  }, [currentUser, game.activeEvent, t, addLog, enqueueAchievements]);

  const toggleDemoState = useCallback(async () => {
    try {
      const data = await api.toggleWarp(currentUser);
      dispatch({ type: 'SET_DEMO', value: data.isDemoMode });
    } catch (e) { console.error(e); }
  }, [currentUser]);

  const toggleCollection = useCallback(() => {
    audio.playClick();
    if (visibility.collection) {
      closeModal('collection');
    } else {
      openModal('collection');
    }
  }, [visibility.collection, openModal, closeModal]);

  const handleOpenLeaderboard = useCallback(async (opener) => {
    audio.playClick();
    try {
      const data = await api.getLeaderboard();
      setLeaderboardData(data);
    } catch (e) {
      setLeaderboardData([]);
    }
    openModal('leaderboard', opener);
  }, []);

  const handleBuy = useCallback(async (itemId, price, type) => {
    try {
      const data = await api.buyItem(currentUser, itemId, type);
      dispatch({ type: 'SET_COINS', value: Number(data.coins) });
      dispatch({ type: 'SET_INVENTORY', value: data.inventory });
      audio.playLevelUp();
    } catch (e) {
      addLog(t('notEnoughCoins'));
    }
  }, [currentUser, t, addLog]);

  const handleEquip = useCallback(async (itemId) => {
    try {
      const data = await api.equipItem(currentUser, itemId);
      dispatch({ type: 'SET_INVENTORY', value: data.inventory });
      audio.playClick();
    } catch (e) { console.error(e); }
  }, [currentUser]);

  const handleProfileSave = useCallback(async (updatedProfile) => {
    try {
      const data = await api.updateProfile(currentUser, updatedProfile);
      dispatch({ type: 'SET_PROFILE', value: data.profile });
      addLog(t('profileSaved'));
    } catch (e) { console.error(e); }
  }, [currentUser, t, addLog]);

  const handleClaimDailyReward = useCallback(async () => {
    try {
      const data = await api.claimDailyReward(currentUser);
      dispatch({ type: 'SYNC_SERVER', data });
      addLog(t('dailyRewardClaimed', data.claimedReward?.coins || 0));
    } catch (e) { console.error(e); }
  }, [currentUser, t, addLog]);

  const handlePrestige = useCallback(async () => {
    try {
      const data = await api.prestige(currentUser);
      dispatch({ type: 'SYNC_SERVER', data });
      addLog(t('generationFull', data.generation));
    } catch (e) { console.error(e); }
  }, [currentUser, t, addLog]);

  const handlePrestigeUpgrade = useCallback(async (upgradeId) => {
    try {
      const data = await api.prestigeUpgrade(currentUser, upgradeId);
      dispatch({ type: 'SYNC_SERVER', data });
    } catch (e) { console.error(e); }
  }, [currentUser]);

  const handleBuyCompanion = useCallback(async (companionId) => {
    try {
      const data = await api.buyCompanion(currentUser, companionId);
      dispatch({ type: 'SYNC_SERVER', data });
      audio.playLevelUp();
    } catch (e) { addLog(t('notEnoughCoins')); }
  }, [currentUser, t, addLog]);

  const handleEquipCompanion = useCallback(async (companionId) => {
    try {
      const data = await api.equipCompanion(currentUser, companionId);
      dispatch({ type: 'SYNC_SERVER', data });
      audio.playClick();
    } catch (e) { console.error(e); }
  }, [currentUser]);

  const handleShakeTree = useCallback(async () => {
    setShakeAnim(true);
    setTimeout(() => setShakeAnim(false), 500);
    try {
      const data = await api.shakeTree(currentUser);
      if (data.cooldown) {
        addLog(t('shakeCooldown'));
      } else if (data.coins > 0) {
        addLog(t('shakeCoins', data.coins));
        audio.playLevelUp();
      } else {
        addLog(t('shakeNothing'));
      }
    } catch (e) { console.error(e); }
  }, [currentUser, t, addLog]);

  const handleVisitGarden = useCallback(async (username) => {
    try {
      const data = await api.visitGarden(username);
      setGardenVisitData(data);
      setGiftError(null);
      openModal('gardenVisit');
      closeModal('leaderboard');
    } catch (e) { console.error(e); }
  }, []);

  const handleSendGift = useCallback(async (toUsername) => {
    try {
      await api.sendGift(currentUser, toUsername);
      addLog(t('giftSent'));
      setGiftError(null);
    } catch (e) {
      setGiftError(e.message);
    }
  }, [currentUser, t, addLog]);

  const handleMinigameReward = useCallback(async (gameType, score) => {
    try {
      const data = await api.claimMinigameReward(currentUser, gameType, score);
      dispatch({ type: "APPLY_MINIGAME_REWARD", data });
      addLog(t("coinsEarned", data.coinsEarned));
      if (data.xpEarned > 0) {
        addLog(t("xpEarned", data.xpEarned));
      }
      if (data.bonus) {
        addLog(t("minigameBonus"));
      }
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [currentUser, t, addLog, dispatch]);

  const handleOfflineClose = useCallback(() => {
    closeModal('offlineEarnings');
    // After closing offline earnings, show daily reward if available
    if (game.dailyRewardAvailable) {
      setTimeout(() => openModal('dailyReward'), 300);
    }
  }, [game.dailyRewardAvailable]);

  return {
    localActiveEvent,
    actionBursts,
    shakeAnim,
    handleAction,
    toggleDemoState,
    toggleCollection,
    handleOpenLeaderboard,
    handleBuy,
    handleEquip,
    handleProfileSave,
    handleClaimDailyReward,
    handlePrestige,
    handlePrestigeUpgrade,
    handleBuyCompanion,
    handleEquipCompanion,
    handleShakeTree,
    handleVisitGarden,
    handleSendGift,
    handleMinigameReward,
    handleOfflineClose,
  };
}
