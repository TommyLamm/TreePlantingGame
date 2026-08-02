import { useState, useCallback, useRef } from 'react';

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
  const returnFocusRef = useRef(null);

  const openModal = useCallback((name, opener) => {
    if (typeof document !== 'undefined') {
      returnFocusRef.current = opener instanceof HTMLElement ? opener : document.activeElement;
    }
    setVisibility(current => ({ ...current, [name]: true }));
  }, []);
  const closeModal = useCallback(name => {
    const opener = returnFocusRef.current;
    setVisibility(current => ({ ...current, [name]: false }));
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        if (!document.querySelector('.game-modals-layer') && opener instanceof HTMLElement && opener.isConnected) {
          opener.focus({ preventScroll: true });
        }
      });
    }
  }, []);
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
    returnFocusRef,
  };
}
