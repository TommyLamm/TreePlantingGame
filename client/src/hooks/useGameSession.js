import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../utils/api.js';
import { audio } from '../utils/audio.js';

const VISIBLE_POLL_DELAY = 5000;
const HIDDEN_POLL_DELAY = 30000;

export function useLatest(value) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function createHeartbeatScheduler({
  poll,
  isHidden,
  queueTask = task => queueMicrotask(task),
  setTimer = (task, delay) => setTimeout(task, delay),
  clearTimer = timerId => clearTimeout(timerId),
}) {
  let stopped = true;
  let inFlight = false;
  let timerId = null;
  let initialTaskVersion = 0;
  let timerVersion = 0;

  const cancelPendingTimer = () => {
    timerVersion += 1;
    if (timerId !== null) {
      clearTimer(timerId);
      timerId = null;
    }
  };

  const scheduleNext = () => {
    if (stopped || inFlight) return;

    cancelPendingTimer();
    const scheduledTimerVersion = timerVersion;
    const delay = isHidden() ? HIDDEN_POLL_DELAY : VISIBLE_POLL_DELAY;
    timerId = setTimer(() => {
      if (stopped || scheduledTimerVersion !== timerVersion) return;
      timerId = null;
      runPoll();
    }, delay);
  };

  const settlePoll = () => {
    inFlight = false;
    scheduleNext();
  };

  const runPoll = () => {
    if (stopped || inFlight) return;
    inFlight = true;

    let result;
    try {
      result = poll();
    } catch (error) {
      result = Promise.reject(error);
    }
    Promise.resolve(result).then(settlePoll, settlePoll);
  };

  return {
    start() {
      stopped = false;
      const scheduledTaskVersion = ++initialTaskVersion;
      queueTask(() => {
        if (stopped || scheduledTaskVersion !== initialTaskVersion) return;
        runPoll();
      });
    },
    reschedule() {
      if (stopped) return;
      cancelPendingTimer();
      scheduleNext();
    },
    stop() {
      stopped = true;
      initialTaskVersion += 1;
      cancelPendingTimer();
    },
  };
}

export function useGameSession({
  dispatch,
  t,
  addLog,
  enqueueAchievements,
  onFirstOfflineEarnings,
  onFirstDailyReward,
  resetUi,
}) {
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem('zenUser') || null,
  );
  const [serverStatus, setServerStatus] = useState('unknown');
  const [existingUsers, setExistingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const firstLoadRef = useRef(true);
  const currentUserRef = useRef(currentUser);
  const sessionVersionRef = useRef(0);
  const mountedRef = useRef(false);
  const initialUsersRequestRef = useRef(null);
  const heartbeatCallbacksRef = useLatest({
    t,
    addLog,
    enqueueAchievements,
    onFirstOfflineEarnings,
    onFirstDailyReward,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const requestVersion = sessionVersionRef.current;
    const canUpdate = () => (
      active
      && mountedRef.current
      && requestVersion === sessionVersionRef.current
    );

    if (!initialUsersRequestRef.current) {
      initialUsersRequestRef.current = api.getUsers();
    }

    initialUsersRequestRef.current
      .then(users => {
        if (canUpdate()) setExistingUsers(users);
      })
      .catch(() => {
        if (canUpdate()) setServerStatus('offline');
      })
      .finally(() => {
        if (canUpdate() && !currentUserRef.current) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return undefined;

    let active = true;
    const requestVersion = sessionVersionRef.current;
    const canUpdate = () => (
      active
      && mountedRef.current
      && requestVersion === sessionVersionRef.current
      && currentUserRef.current === currentUser
    );

    const poll = async () => {
      try {
        const data = await api.heartbeat(currentUser);
        if (!canUpdate()) return;
        const callbacks = heartbeatCallbacksRef.current;

        dispatch({ type: 'SYNC_SERVER', data });
        setServerStatus('connected');
        setIsLoading(false);

        if (data.justLeveledUp) {
          audio.playLevelUp();
          callbacks.addLog(callbacks.t('levelUp', data.level));
        }

        if (data.newAchievements && data.newAchievements.length > 0) {
          callbacks.enqueueAchievements(data.newAchievements);
        }

        if (data.stormPenalty) {
          callbacks.addLog(callbacks.t('stormPenalty'));
        }

        if (data.goldenHourTriggered) {
          callbacks.addLog(callbacks.t('goldenHour'));
        }

        if (firstLoadRef.current) {
          firstLoadRef.current = false;
          if ((data.lastOfflineXp || 0) > 0.5 || (data.lastOfflineCoins || 0) > 1) {
            callbacks.onFirstOfflineEarnings();
          } else if (data.dailyRewardAvailable) {
            callbacks.onFirstDailyReward();
          }
        }
      } catch (error) {
        if (!canUpdate()) return;
        setServerStatus('offline');
        setIsLoading(false);
      }
    };

    const scheduler = createHeartbeatScheduler({
      poll,
      isHidden: () => document.hidden,
    });
    const handleVisibility = () => scheduler.reschedule();
    document.addEventListener('visibilitychange', handleVisibility);
    scheduler.start();

    return () => {
      active = false;
      scheduler.stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser, dispatch]);

  const handleLogin = useCallback(name => {
    if (audio.ctx && audio.ctx.state === 'suspended') {
      audio.ctx.resume();
    }
    localStorage.setItem('zenUser', name);
    setIsLoading(true);
    firstLoadRef.current = true;
    sessionVersionRef.current += 1;
    currentUserRef.current = name;
    setCurrentUser(name);
    audio.playClick();
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('zenUser');
    sessionVersionRef.current += 1;
    currentUserRef.current = null;
    setCurrentUser(null);
    setExistingUsers([]);
    dispatch({ type: 'RESET' });
    resetUi();
    firstLoadRef.current = true;
    audio.playClick();

    const requestVersion = sessionVersionRef.current;
    api.getUsers()
      .then(users => {
        if (
          mountedRef.current
          && requestVersion === sessionVersionRef.current
          && currentUserRef.current === null
        ) {
          setExistingUsers(users);
        }
      })
      .catch(() => {});
  }, [dispatch, resetUi]);

  return {
    currentUser,
    serverStatus,
    existingUsers,
    isLoading,
    handleLogin,
    handleLogout,
  };
}
