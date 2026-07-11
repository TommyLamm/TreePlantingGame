import { useState, useEffect, useReducer, useMemo, useCallback } from 'react';
import { ACHIEVEMENT_DEFS } from './constants';
import { gameReducer, initialGameState } from './state/gameReducer';
import { useGameActions } from './hooks/useGameActions';
import { useGameModals } from './hooks/useGameModals';
import { useGameSession } from './hooks/useGameSession';
import { audio } from './utils/audio';
import { createTranslator } from './utils/i18n';
import { LoginScreen } from './components/LoginScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { AchievementToast } from './components/AchievementToast';
import { Particles } from './components/Particles';
import { EnvironmentBackdrop } from './components/EnvironmentBackdrop';
import { GameModals } from './components/game/GameModals';
import { GameHeader } from './components/game/GameHeader';
import { GameStage } from './components/game/GameStage';
import { ActionPanel } from './components/game/ActionPanel';

export default function App() {
    const [game, dispatch] = useReducer(gameReducer, initialGameState);

    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('zenMuted');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [lang, setLang] = useState(localStorage.getItem('zenLang') || 'en');
    const [logs, setLogs] = useState([]);
    const [achievementQueue, setAchievementQueue] = useState([]);

    const modals = useGameModals();
    const {
        visibility,
        openModal,
        closeModal,
        resetModals,
        leaderboardData,
        gardenVisitData,
        giftError,
    } = modals;

    const xpRequired = Math.max(1, Math.floor(10 + Math.pow(game.level, 1.6)));
    const progress = Math.min(100, (game.xp / xpRequired) * 100);

    const t = useMemo(() => createTranslator(lang), [lang]);

    const addLog = useCallback(message => {
        setLogs(current => [message, ...current].slice(0, 2));
    }, []);
    const enqueueAchievements = useCallback(ids => {
        const definitions = ids
            .map(id => ACHIEVEMENT_DEFS.find(item => item.id === id))
            .filter(Boolean);
        setAchievementQueue(current => [...current, ...definitions]);
    }, []);
    const resetUi = useCallback(() => {
        resetModals();
    }, [resetModals]);
    const onFirstOfflineEarnings = useCallback(() => {
        openModal('offlineEarnings');
    }, [openModal]);
    const onFirstDailyReward = useCallback(() => {
        openModal('dailyReward');
    }, [openModal]);
    const {
        currentUser,
        serverStatus,
        existingUsers,
        isLoading,
        handleLogin,
        handleLogout,
    } = useGameSession({
        dispatch,
        t,
        addLog,
        enqueueAchievements,
        onFirstOfflineEarnings,
        onFirstDailyReward,
        resetUi,
    });
    const {
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
    } = useGameActions({
        currentUser,
        game,
        dispatch,
        t,
        modals,
        addLog,
        enqueueAchievements,
    });

    // Sync audio state on mount
    useEffect(() => {
        audio.setMuted(isMuted);
    }, []);

    const toggleMute = useCallback(() => {
        const newState = !isMuted;
        setIsMuted(newState);
        localStorage.setItem('zenMuted', JSON.stringify(newState));
        audio.setMuted(newState);
        if (!newState) audio.playClick();
    }, [isMuted]);

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

    const handleOpenModal = useCallback(name => {
        audio.playClick();
        openModal(name);
    }, [openModal]);

    const handleModalClose = useCallback(name => {
        if (name !== 'dailyReward') audio.playClick();
        closeModal(name);
    }, [closeModal]);

    const isClockDay = new Date().getHours() > 6 && new Date().getHours() < 18;

    const handleAchievementDone = useCallback(() => {
        setAchievementQueue(prev => prev.slice(1));
    }, []);

    // Golden hour active?
    const goldenHourActive = Date.now() < (game.goldenHourUntil || 0);
    const isDay = isClockDay || goldenHourActive;

    const companionAssetId = game.companion || null;

    // Today's minigame count
    const today = new Date().toISOString().slice(0, 10);
    const gamesRemaining = game.minigameDate === today ? Math.max(0, 3 - (game.minigameCount || 0)) : 3;

    const modalProps = {
        visibility,
        game,
        currentUser,
        t,
        leaderboardData,
        gardenVisitData,
        giftError,
        gamesRemaining,
        onClose: handleModalClose,
        onLogout: handleLogout,
        onBuy: handleBuy,
        onEquip: handleEquip,
        onProfileSave: handleProfileSave,
        onVisitGarden: handleVisitGarden,
        onGift: handleSendGift,
        onClaimDailyReward: handleClaimDailyReward,
        onOfflineClose: handleOfflineClose,
        onPrestige: handlePrestige,
        onPrestigeUpgrade: handlePrestigeUpgrade,
        onMinigameReward: handleMinigameReward,
        onBuyCompanion: handleBuyCompanion,
        onEquipCompanion: handleEquipCompanion,
    };

    const headerProps = {
        game,
        currentUser,
        serverStatus,
        isDay,
        goldenHourActive,
        companionAssetId,
        isMuted,
        t,
        onCycleLang: cycleLang,
        onOpenModal: handleOpenModal,
        onToggleCollection: toggleCollection,
        onOpenLeaderboard: handleOpenLeaderboard,
        onToggleMute: toggleMute,
        onToggleDemoState: toggleDemoState,
    };

    // --- Render ---
    if (!currentUser) {
        if (isLoading) return <LoadingScreen t={t} />;
        return <LoginScreen onLogin={handleLogin} t={t} existingUsers={existingUsers} />;
    }

    if (isLoading) return <LoadingScreen t={t} />;

    return (
        <div className={`game-shell game-typography fixed inset-0 flex flex-col items-center transition-colors duration-1000 ${isDay ? 'bg-gradient-to-b from-blue-200 to-blue-100' : 'bg-gradient-to-b from-indigo-900 to-slate-800 text-white'} overflow-hidden`}>

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
            <GameModals {...modalProps} />
            <GameHeader {...headerProps} />

            <div className="game-main-panel w-full max-w-md flex-1 flex flex-col relative z-10 pb-6 pt-16 px-4">
                <GameStage
                    actionBursts={actionBursts}
                    shakeAnim={shakeAnim}
                    game={game}
                    isDay={isDay}
                    onShakeTree={handleShakeTree}
                />
                <ActionPanel
                    game={game}
                    isDay={isDay}
                    goldenHourActive={goldenHourActive}
                    localActiveEvent={localActiveEvent}
                    xpRequired={xpRequired}
                    progress={progress}
                    t={t}
                    onAction={handleAction}
                />
            </div>
            <div className="absolute bottom-2 w-full px-4 pointer-events-none flex flex-col-reverse items-center gap-1 z-30 h-12 justify-end">
                {logs.map((log, i) => (<div key={i} className={`text-[10px] text-center text-white/95 bg-black/50 rounded-full px-3 py-1 backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 shadow-sm transition-all max-w-[90%] truncate ${i === 0 ? 'scale-100 opacity-100' : 'scale-90 opacity-60'}`}>{log}</div>))}
            </div>
        </div>
    );
};
