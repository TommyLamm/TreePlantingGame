import React, { useState, useEffect, useReducer, useMemo, useCallback, memo } from 'react';
import { MAX_LEVEL, ACHIEVEMENT_DEFS } from './constants';
import { gameReducer, initialGameState } from './state/gameReducer';
import { useGameActions } from './hooks/useGameActions';
import { useGameModals } from './hooks/useGameModals';
import { useGameSession } from './hooks/useGameSession';
import { audio } from './utils/audio';
import { createTranslator } from './utils/i18n';
import { Zap, Droplets, Bug, Shovel, Scissors, SunMedium, CloudLightning } from './components/Icons';
import { TreeVisual } from './components/TreeVisual';
import { ActionButton } from './components/ActionButton';
import { LoginScreen } from './components/LoginScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { AchievementToast } from './components/AchievementToast';
import { Particles } from './components/Particles';
import { EnvironmentBackdrop } from './components/EnvironmentBackdrop';
import { CompanionSprite } from './components/CompanionSprite';
import { GameModals } from './components/game/GameModals';
import { GameHeader } from './components/game/GameHeader';

// --- Memoized Tree ---
const MemoizedTree = memo(TreeVisual);

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
            <GameModals {...modalProps} />
            <GameHeader {...headerProps} />

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
