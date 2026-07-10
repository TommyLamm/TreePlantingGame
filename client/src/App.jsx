import React, { useState, useEffect, useReducer, useMemo, useCallback, memo } from 'react';
import { MAX_LEVEL, ACHIEVEMENT_DEFS } from './constants';
import { gameReducer, initialGameState } from './state/gameReducer';
import { useGameModals } from './hooks/useGameModals';
import { audio } from './utils/audio';
import { api } from './utils/api';
import { createTranslator } from './utils/i18n';
import { CloudCheck, CloudOff, User, BookOpen, VolumeX, Volume2, Clock, Zap, Droplets, Bug, Shovel, Coins, ShoppingCart, Scissors, SunMedium, CloudLightning, Trophy, Calendar, Paw, Recycle, Gamepad, StatsIcon } from './components/Icons';
import { TreeVisual } from './components/TreeVisual';
import { ActionButton } from './components/ActionButton';
import { CollectionModal } from './components/CollectionModal';
import { StoreModal } from './components/StoreModal';
import { ProfileModal } from './components/ProfileModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { LoginScreen } from './components/LoginScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { AchievementToast } from './components/AchievementToast';
import { Particles } from './components/Particles';
import { EnvironmentBackdrop } from './components/EnvironmentBackdrop';
import { CompanionSprite } from './components/CompanionSprite';
// New components
import { WeatherDisplay } from './components/WeatherDisplay';
import { DailyRewardModal } from './components/DailyRewardModal';
import { OfflineEarningsModal } from './components/OfflineEarningsModal';
import { PrestigeModal } from './components/PrestigeModal';
import { StatsModal } from './components/StatsModal';
import { MiniGameModal } from './components/MiniGameModal';
import { CompanionSelect } from './components/CompanionSelect';
import { GardenVisitModal } from './components/GardenVisitModal';

// --- Memoized Tree ---
const MemoizedTree = memo(TreeVisual);

export default function App() {
    const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('zenUser') || null);
    const [serverStatus, setServerStatus] = useState('unknown');
    const [existingUsers, setExistingUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [game, dispatch] = useReducer(gameReducer, initialGameState);

    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('zenMuted');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [lang, setLang] = useState(localStorage.getItem('zenLang') || 'en');
    const [logs, setLogs] = useState([]);

    // OPTIMISTIC UI STATE
    const [localActiveEvent, setLocalActiveEvent] = useState(null);
    const {
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
    } = useGameModals();
    const [firstLoad, setFirstLoad] = useState(true);

    // VISUAL EFFECTS STATE
    const [actionBursts, setActionBursts] = useState([]);
    const [achievementQueue, setAchievementQueue] = useState([]);
    const [shakeAnim, setShakeAnim] = useState(false);

    const xpRequired = Math.max(1, Math.floor(10 + Math.pow(game.level, 1.6)));
    const progress = Math.min(100, (game.xp / xpRequired) * 100);

    const t = useMemo(() => createTranslator(lang), [lang]);

    // Sync audio state on mount
    useEffect(() => {
        audio.setMuted(isMuted);
    }, []);

    // Sync activeEvent to localActiveEvent
    useEffect(() => {
        setLocalActiveEvent(game.activeEvent);
    }, [game.activeEvent]);

    // 1. Initial Fetch
    useEffect(() => {
        api.getUsers()
            .then(users => setExistingUsers(users))
            .catch(() => setServerStatus('offline'))
            .finally(() => {
                if (!currentUser) setIsLoading(false);
            });
    }, []);

    // 2. Polling Loop with Page Visibility optimization
    useEffect(() => {
        if (!currentUser) return;
        let isVisible = true;

        const poll = async () => {
            try {
                const data = await api.heartbeat(currentUser);

                dispatch({ type: 'SYNC_SERVER', data });
                setServerStatus('connected');
                setIsLoading(false);

                if (data.justLeveledUp) {
                    audio.playLevelUp();
                    addLog(t('levelUp', data.level));
                }

                // Handle new achievements
                if (data.newAchievements && data.newAchievements.length > 0) {
                    const achDefs = data.newAchievements
                        .map(id => ACHIEVEMENT_DEFS.find(a => a.id === id))
                        .filter(Boolean);
                    setAchievementQueue(prev => [...prev, ...achDefs]);
                }

                // Storm penalty
                if (data.stormPenalty) {
                    addLog(t('stormPenalty'));
                }

                // Golden hour triggered
                if (data.goldenHourTriggered) {
                    addLog(t('goldenHour'));
                }

                // First load — show offline earnings and/or daily reward
                if (firstLoad) {
                    setFirstLoad(false);
                    // Show offline earnings if significant
                    if ((data.lastOfflineXp || 0) > 0.5 || (data.lastOfflineCoins || 0) > 1) {
                        openModal('offlineEarnings');
                    } else if (data.dailyRewardAvailable) {
                        // Show daily reward prompt
                        openModal('dailyReward');
                    }
                }
            } catch (e) {
                setServerStatus('offline');
                setIsLoading(false);
            }
        };

        const handleVisibility = () => {
            isVisible = !document.hidden;
        };
        document.addEventListener('visibilitychange', handleVisibility);

        poll(); // initial immediate poll
        const interval = setInterval(() => {
            // Poll every 5s when visible, every 30s when hidden
            if (isVisible) poll();
        }, 5000);

        // Background slow poll
        const bgInterval = setInterval(() => {
            if (!isVisible) poll();
        }, 30000);

        return () => {
            clearInterval(interval);
            clearInterval(bgInterval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [currentUser, t]);

    const addLog = useCallback((msg) => {
        setLogs(prev => [msg, ...prev].slice(0, 2));
    }, []);

    // Actions with OPTIMISTIC UI
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
                const achDefs = data.newAchievements
                    .map(id => ACHIEVEMENT_DEFS.find(a => a.id === id))
                    .filter(Boolean);
                setAchievementQueue(prev => [...prev, ...achDefs]);
            }
        } catch (e) {
            console.error(e);
            setLocalActiveEvent(game.activeEvent);
        }
    }, [currentUser, game.activeEvent, t, addLog]);

    const toggleDemoState = useCallback(async () => {
        try {
            const data = await api.toggleWarp(currentUser);
            dispatch({ type: 'SET_DEMO', value: data.isDemoMode });
        } catch (e) { console.error(e); }
    }, [currentUser]);

    const handleLogin = useCallback((name) => {
        if (audio.ctx && audio.ctx.state === 'suspended') {
            audio.ctx.resume();
        }
        setCurrentUser(name);
        localStorage.setItem('zenUser', name);
        setIsLoading(true);
        setFirstLoad(true);
        audio.playClick();
    }, []);

    const handleLogout = useCallback(() => {
        audio.playClick();
        setCurrentUser(null);
        localStorage.removeItem('zenUser');
        setExistingUsers([]);
        dispatch({ type: 'RESET' });
        setLocalActiveEvent(null);
        resetModals();
        setFirstLoad(true);

        api.getUsers().then(users => setExistingUsers(users)).catch(() => {});
    }, []);

    const toggleMute = useCallback(() => {
        const newState = !isMuted;
        setIsMuted(newState);
        localStorage.setItem('zenMuted', JSON.stringify(newState));
        audio.setMuted(newState);
        if (!newState) audio.playClick();
    }, [isMuted]);

    const toggleCollection = useCallback(() => {
        audio.playClick();
        if (visibility.collection) {
            closeModal('collection');
        } else {
            openModal('collection');
        }
    }, [visibility.collection, openModal, closeModal]);

    const cycleLang = useCallback(() => {
        audio.playClick();
        const langs = ['en', 'zh-CN', 'zh-TW'];
        setLang(prev => {
            const nextIdx = (langs.indexOf(prev) + 1) % langs.length;
            const newLang = langs[nextIdx];
            localStorage.setItem('zenLang', newLang);
            return newLang;
        });
    }, []);

    const handleOpenLeaderboard = useCallback(async () => {
        audio.playClick();
        try {
            const data = await api.getLeaderboard();
            setLeaderboardData(data);
        } catch (e) {
            setLeaderboardData([]);
        }
        openModal('leaderboard');
    }, []);

    const isClockDay = new Date().getHours() > 6 && new Date().getHours() < 18;

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

    const handleAchievementDone = useCallback(() => {
        setAchievementQueue(prev => prev.slice(1));
    }, []);

    // --- New handlers ---
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
            addLog(t('coinsEarned', data.coinsEarned));
        } catch (e) { console.error(e); }
    }, [currentUser, t, addLog]);

    const handleOfflineClose = useCallback(() => {
        closeModal('offlineEarnings');
        // After closing offline earnings, show daily reward if available
        if (game.dailyRewardAvailable) {
            setTimeout(() => openModal('dailyReward'), 300);
        }
    }, [game.dailyRewardAvailable]);

    // --- Event action icon mapping ---
    const eventIcons = {
        WATER: <Droplets size={18} />,
        PEST: <Bug size={18} />,
        FERTILIZE: <Shovel size={18} />,
        PRUNE: <Scissors size={18} />,
        SUNLIGHT: <SunMedium size={18} />,
        STORM: <CloudLightning size={18} />,
    };

    const eventLabels = {
        WATER: t('water'),
        PEST: t('pest'),
        FERTILIZE: t('feed'),
        PRUNE: t('prune'),
        SUNLIGHT: t('sunlight'),
        STORM: t('storm'),
    };

    // Golden hour active?
    const goldenHourActive = Date.now() < (game.goldenHourUntil || 0);
    const isDay = isClockDay || goldenHourActive;

    const companionAssetId = game.companion || null;

    // Today's minigame count
    const today = new Date().toISOString().slice(0, 10);
    const gamesRemaining = game.minigameDate === today ? Math.max(0, 3 - (game.minigameCount || 0)) : 3;

    // --- Render ---
    if (!currentUser) {
        if (isLoading) return <LoadingScreen t={t} />;
        return <LoginScreen onLogin={handleLogin} t={t} existingUsers={existingUsers} />;
    }

    if (isLoading) return <LoadingScreen t={t} />;

    return (
        <div className={`game-shell fixed inset-0 flex flex-col items-center font-sans transition-colors duration-1000 ${isDay ? 'bg-gradient-to-b from-blue-200 to-blue-100' : 'bg-gradient-to-b from-indigo-900 to-slate-800 text-white'} overflow-hidden`}>

            <EnvironmentBackdrop
                isDay={isDay}
                weather={game.weather}
                season={game.season}
                goldenHourActive={goldenHourActive}
            />
            <Particles isDay={isDay} weather={game.weather} season={game.season} />

            {/* Achievement Toasts */}
            {achievementQueue.length > 0 && (
                <AchievementToast
                    achievement={achievementQueue[0]}
                    t={t}
                    onDone={handleAchievementDone}
                />
            )}

            {/* --- MODALS --- */}
            {visibility.collection && <CollectionModal currentLevel={game.level} achievements={game.achievements} onClose={toggleCollection} t={t} />}
            {visibility.store && <StoreModal userCoins={game.coins} inventory={game.inventory} onBuy={handleBuy} onEquip={handleEquip} onClose={() => { audio.playClick(); closeModal('store'); }} t={t} />}
            {visibility.profile && (
                <ProfileModal
                    username={currentUser}
                    joinDate={game.joinDate}
                    playTimeMs={game.playTimeMs}
                    interactions={game.interactions}
                    profileData={game.profileData}
                    onSave={handleProfileSave}
                    onClose={() => { audio.playClick(); closeModal('profile'); }}
                    onLogout={handleLogout}
                    t={t}
                />
            )}
            {visibility.leaderboard && (
                <LeaderboardModal
                    data={leaderboardData}
                    currentUser={currentUser}
                    onVisitGarden={handleVisitGarden}
                    onClose={() => { audio.playClick(); closeModal('leaderboard'); }}
                    t={t}
                />
            )}
            {visibility.dailyReward && (
                <DailyRewardModal
                    loginStreak={game.loginStreak}
                    currentDayIndex={((game.loginStreak || 1) - 1) % 7}
                    claimed={game.dailyRewardClaimed}
                    onClaim={handleClaimDailyReward}
                    onClose={() => closeModal('dailyReward')}
                    t={t}
                />
            )}
            {visibility.offlineEarnings && (
                <OfflineEarningsModal
                    xpEarned={game.lastOfflineXp}
                    coinsEarned={game.lastOfflineCoins}
                    timeAwayMs={game.lastOfflineXp > 0 ? (game.lastOfflineXp / 1 * 3600000) : 60000}
                    onClose={handleOfflineClose}
                    t={t}
                />
            )}
            {visibility.prestige && (
                <PrestigeModal
                    currentLevel={game.level}
                    generation={game.generation}
                    prestigePoints={game.prestigePoints}
                    prestigeUpgrades={game.prestigeUpgrades}
                    onPrestige={handlePrestige}
                    onUpgrade={handlePrestigeUpgrade}
                    onClose={() => { audio.playClick(); closeModal('prestige'); }}
                    t={t}
                />
            )}
            {visibility.stats && (
                <StatsModal
                    stats={{
                        level: game.level,
                        generation: game.generation,
                        coins: game.coins,
                        totalXpEarned: game.totalXpEarned,
                        totalCoinsEarned: game.totalCoinsEarned,
                        totalEventsResolved: game.totalEventsResolved,
                        interactionCount: game.interactions,
                        maxCombo: game.maxCombo,
                        maxLoginStreak: game.maxLoginStreak,
                        playTimeMs: game.playTimeMs,
                        joinDate: game.joinDate,
                        companion: companionEmoji,
                        achievements: game.achievements,
                    }}
                    onClose={() => { audio.playClick(); closeModal('stats'); }}
                    t={t}
                />
            )}
            {visibility.miniGames && (
                <MiniGameModal
                    gamesRemaining={gamesRemaining}
                    onReward={handleMinigameReward}
                    onClose={() => { audio.playClick(); closeModal('miniGames'); }}
                    t={t}
                />
            )}
            {visibility.companions && (
                <CompanionSelect
                    unlockedCompanions={game.unlockedCompanions}
                    equippedCompanion={game.companion}
                    userCoins={game.coins}
                    userLevel={game.level}
                    generation={game.generation}
                    onBuy={handleBuyCompanion}
                    onEquip={handleEquipCompanion}
                    onClose={() => { audio.playClick(); closeModal('companions'); }}
                    t={t}
                />
            )}
            {visibility.gardenVisit && (
                <GardenVisitModal
                    visitData={gardenVisitData}
                    currentUser={currentUser}
                    onGift={handleSendGift}
                    giftError={giftError}
                    onClose={() => { audio.playClick(); closeModal('gardenVisit'); }}
                    t={t}
                />
            )}

            {/* Top toolbar */}
            <div className="top-hud-weather absolute top-3 left-3 z-30">
                <WeatherDisplay weather={game.weather} season={game.season} isDay={isDay} t={t} />
            </div>

            <div className="top-hud-actions absolute top-3 right-3 flex flex-col gap-2 z-30 items-end">
                {/* Row 1: Status + coins + combo */}
                <div className="flex gap-1.5 items-center">
                    <div title={serverStatus === 'connected' ? "Online" : "Offline"} className={`flex items-center justify-center w-8 h-8 rounded-full shadow-lg transition-all ${serverStatus === 'connected' ? 'bg-white text-green-500' : 'bg-red-100 text-red-500'}`}>{serverStatus === 'connected' ? <CloudCheck size={16} /> : <CloudOff size={16} />}</div>

                    {game.combo > 0 && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full shadow-lg font-bold text-xs bg-orange-500 text-white animate-pulse">
                            🔥 ×{game.combo}
                        </div>
                    )}

                    {goldenHourActive && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full shadow-lg font-bold text-xs bg-yellow-400 text-yellow-900 animate-pulse">
                            ☀️ 2×
                        </div>
                    )}

                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full shadow-lg font-bold text-xs border ${isDay ? 'bg-white text-yellow-600 border-yellow-100' : 'bg-slate-700 text-yellow-400 border-slate-600'}`}>
                        <Coins size={14} />
                        <span>{Math.floor(game.coins)}</span>
                    </div>
                </div>

                {/* Unified Menu Glass Panel */}
                <div className={`top-hud-menu flex flex-wrap gap-1 p-1 rounded-2xl glass-panel border ${isDay ? 'bg-white/70 border-white/40 text-gray-700' : 'bg-slate-800/60 border-slate-700/40 text-gray-200'} max-w-[210px] sm:max-w-none justify-end`}>
                    <button onClick={cycleLang} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 font-bold text-[10px]" title={t('langName')}>{t('langName')}</button>
                    <button onClick={() => { audio.playClick(); openModal('profile'); }} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 overflow-hidden" title={t('profile')}>
                        {game.profileData?.avatar ? <img src={game.profileData.avatar} alt="User" className="w-full h-full object-cover" /> : <User size={16} />}
                    </button>
                    <button onClick={() => { audio.playClick(); openModal('store'); }} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-amber-500" title={t('store')}><ShoppingCart size={16} /></button>
                    <button onClick={toggleCollection} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-green-600 dark:text-green-400" title={t('collection')}><BookOpen size={16} /></button>
                    <button onClick={handleOpenLeaderboard} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-purple-600 dark:text-purple-400" title={t('leaderboard')}><Trophy size={16} /></button>
                    <button onClick={() => { audio.playClick(); openModal('companions'); }} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-base" title={t('companions')}>
                        {companionAssetId ? <img src={`/assets/companions/${companionAssetId}.png`} alt="" aria-hidden="true" className="w-6 h-6 object-contain" /> : <Paw size={16} />}
                    </button>
                    <button onClick={() => { audio.playClick(); openModal('prestige'); }} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-base" title={t('prestige')}><Recycle size={16} /></button>
                    <button onClick={() => { audio.playClick(); openModal('miniGames'); }} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-base" title={t('miniGames')}><Gamepad size={16} /></button>
                    <button onClick={() => { audio.playClick(); openModal('stats'); }} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-base" title={t('stats')}><StatsIcon size={16} /></button>
                    <button onClick={() => { audio.playClick(); openModal('dailyReward'); }} className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all text-base ${game.dailyRewardAvailable ? 'bg-amber-400/80 animate-pulse text-amber-950' : 'hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('dailyReward')}><Calendar size={16} /></button>
                    <button onClick={toggleMute} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-blue-500" title={t('mute')}>{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
                </div>

                {/* Row 4: Time warp */}
                <button onClick={toggleDemoState} className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-lg text-[10px] font-bold transition-all ${game.isDemoMode ? 'bg-purple-600 text-white animate-pulse' : (isDay ? 'bg-white/80 text-gray-600 border border-white/50' : 'bg-slate-700/80 text-gray-300 border border-slate-600')}`}><Clock size={12} /> {game.isDemoMode ? t('timeWarp').split('(')[0] : t('realTime')}</button>

                <div className={`text-[9px] text-right px-1 ${isDay ? 'text-gray-500' : 'text-gray-400'}`}>
                    {currentUser}
                    {game.generation > 0 && ` | Gen ${game.generation}`}
                    {companionAssetId && <img src={`/assets/companions/${companionAssetId}.png`} alt="" aria-hidden="true" className="inline-block w-4 h-4 object-contain align-[-3px] ml-1" />}
                    {' | '}{game.isDemoMode ? t('rateDemo') : t('rateNormal')}
                </div>
            </div>

            <div className="game-main-panel w-full max-w-md flex-1 flex flex-col relative z-10 pb-6 pt-16 px-4">
                {/* Visual Action Bursts */}
                {actionBursts.map(burst => (
                    <div key={burst.id} className={`absolute z-40 pointer-events-none animate-burst action-burst action-burst-${burst.type.toLowerCase()}`} style={{ left: burst.x, top: burst.y, transform: 'translate(-50%, -50%)' }}>
                        {burst.type === 'WATER' && <Droplets size={32} className="text-blue-400 drop-shadow-md" />}
                        {burst.type === 'PEST' && <Bug size={32} className="text-red-400 drop-shadow-md" />}
                        {burst.type === 'FERTILIZE' && <Shovel size={32} className="text-yellow-400 drop-shadow-md" />}
                        {burst.type === 'PRUNE' && <Scissors size={32} className="text-green-400 drop-shadow-md" />}
                        {burst.type === 'SUNLIGHT' && <SunMedium size={32} className="text-orange-400 drop-shadow-md" />}
                        {burst.type === 'STORM' && <CloudLightning size={32} className="text-purple-400 drop-shadow-md" />}
                        <div className="action-burst-particles" aria-hidden="true">
                            {Array.from({ length: 6 }, (_, i) => (
                                <span key={i} style={{ '--burst-angle': `${i * 60}deg`, '--burst-distance': `${22 + i * 4}px` }} />
                            ))}
                        </div>
                        <div className="text-[11px] font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center mt-1 whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            {burst.type === 'WATER' && '💧 Splash!'}
                            {burst.type === 'PEST' && '🐛 Shoo!'}
                            {burst.type === 'FERTILIZE' && '🍂 Nourish!'}
                            {burst.type === 'PRUNE' && '✂️ Trim!'}
                            {burst.type === 'SUNLIGHT' && '✨ Warmth!'}
                            {burst.type === 'STORM' && '⚡ Charge!'}
                        </div>
                    </div>
                ))}

                <div className={`flex-1 w-full min-h-0 relative z-10 mb-4 cursor-pointer transition-transform ${shakeAnim ? 'animate-wiggle' : ''}`} onClick={handleShakeTree}>
                    <MemoizedTree
                        level={game.level}
                        eventType={game.activeEvent}
                        skin={game.inventory?.treeSkin}
                        season={game.season}
                        weather={game.weather}
                    />
                    <CompanionSprite companion={game.companion} isDay={isDay} />
                </div>

                {/* Bottom panel */}
                <div className={`w-full flex-shrink-0 glass-panel p-4 z-20 ${isDay ? 'glass-panel-day' : 'glass-panel-night'}`}>
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${isDay ? 'text-gray-400' : 'text-gray-500'}`}>{t('status')}</span>
                            <div className={`text-3xl font-bold flex items-baseline gap-1 ${isDay ? 'text-gray-800' : 'text-white'}`}>
                                {t('level')} {game.level}
                                {game.level === MAX_LEVEL && <span className="text-sm text-yellow-500 ml-2">{t('max')}</span>}
                                {game.generation > 0 && <span className="text-sm text-purple-400 ml-1">G{game.generation}</span>}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-sm font-mono ${isDay ? 'text-gray-500' : 'text-gray-400'}`}>{Math.floor(game.xp)} / {xpRequired} XP</div>
                            {game.combo > 0 && <div className="text-xs text-orange-500 font-bold">🔥 {t('combo')} ×{game.combo}</div>}
                        </div>
                    </div>
                    <div className={`w-full h-4 rounded-full overflow-hidden mb-4 relative ${isDay ? 'bg-gray-200' : 'bg-slate-700'}`}>
                        <div className={`h-full transition-all duration-500 ease-out ${goldenHourActive ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${progress}%` }} />
                        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,rgba(255,255,255,1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,1)_50%,rgba(255,255,255,1)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"></div>
                    </div>
                    <div className="h-24 w-full">
                        {localActiveEvent ? (
                            <div className={`rounded-xl p-2 h-full animate-in slide-in-from-bottom-2 flex flex-col justify-between border ${
                                localActiveEvent === 'STORM'
                                    ? (isDay ? 'bg-purple-50 border-purple-200' : 'bg-purple-900/30 border-purple-700/50')
                                    : (isDay ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/30 border-amber-700/50')
                            }`}>
                                <p className={`text-xs font-bold flex items-center gap-2 ${
                                    localActiveEvent === 'STORM'
                                        ? (isDay ? 'text-purple-800' : 'text-purple-300')
                                        : (isDay ? 'text-amber-800' : 'text-amber-300')
                                }`}>
                                    <Zap size={14} />
                                    {localActiveEvent === 'STORM' ? t('stormWarning') : t('action')}
                                </p>
                                <div className="flex gap-1.5 justify-center flex-wrap">
                                    {Object.entries(eventIcons).map(([key, icon]) => (
                                        <ActionButton
                                            key={key}
                                            icon={icon}
                                            label={eventLabels[key]}
                                            isActive={localActiveEvent === key}
                                            onClick={() => handleAction(key)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={`h-full flex items-center justify-center text-xs italic border-2 border-dashed rounded-xl ${isDay ? 'text-gray-400 border-gray-200' : 'text-gray-500 border-slate-700'}`}>{t('peaceful')}</div>
                        )}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-2 w-full px-4 pointer-events-none flex flex-col-reverse items-center gap-1 z-30 h-12 justify-end">
                {logs.map((log, i) => (<div key={i} className={`text-[10px] text-center text-white/95 bg-black/50 rounded-full px-3 py-1 backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 shadow-sm transition-all max-w-[90%] truncate ${i === 0 ? 'scale-100 opacity-100' : 'scale-90 opacity-60'}`}>{log}</div>))}
            </div>
        </div>
    );
};
