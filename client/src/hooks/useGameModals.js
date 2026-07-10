import { useState, useCallback } from 'react';

const initialVisibility = {
  collection: false,
  store: false,
  profile: false,
  leaderboard: false,
  dailyReward: false,
  offlineEarnings: false,
  prestige: false,
  stats: false,
  miniGames: false,
  companions: false,
  gardenVisit: false,
};

export function useGameModals() {
  const [visibility, setVisibility] = useState(initialVisibility);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [gardenVisitData, setGardenVisitData] = useState(null);
  const [giftError, setGiftError] = useState(null);

  const openModal = useCallback(name =>
    setVisibility(current => ({ ...current, [name]: true })), []);
  const closeModal = useCallback(name =>
    setVisibility(current => ({ ...current, [name]: false })), []);
  const resetModals = useCallback(() => setVisibility(initialVisibility), []);

  return {
    visibility,
    openModal,
    closeModal,
    resetModals,
    leaderboardData,
    setLeaderboardData,
    gardenVisitData,
    setGardenVisitData,
    giftError,
    setGiftError,
  };
}
