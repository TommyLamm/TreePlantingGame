import React, { useEffect, useRef, useState } from 'react';
import {
    BookOpen,
    Calendar,
    CloudCheck,
    CloudOff,
    Coins,
    Gamepad,
    Paw,
    Recycle,
    ShoppingCart,
    StatsIcon,
    SunMedium,
    Trophy,
    User,
    Volume2,
    VolumeX,
    Zap,
} from '../Icons';
import { WeatherDisplay } from '../WeatherDisplay';

export function GameHeader({
    game,
    isDay,
    t,
    serverStatus,
    goldenHourActive,
    companionAssetId,
    isMuted,
    currentUser,
    onCycleLang,
    onOpenModal,
    onToggleCollection,
    onOpenLeaderboard,
    onToggleMute,
    onToggleDemoState,
}) {
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const toolRegionRef = useRef(null);
    const moreButtonRef = useRef(null);

    useEffect(() => {
        if (!isMoreOpen) return undefined;

        const closeOnOutsidePress = (event) => {
            if (!toolRegionRef.current?.contains(event.target)) setIsMoreOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setIsMoreOpen(false);
        };

        document.addEventListener('pointerdown', closeOnOutsidePress);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsidePress);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isMoreOpen]);

    const runMenuAction = (action) => {
        setIsMoreOpen(false);
        moreButtonRef.current?.focus({ preventScroll: true });
        action(moreButtonRef.current);
    };

    return (
        <header className="game-hud" aria-label={t('gameStatusTools')}>
            <div className="hud-environment">
                <WeatherDisplay weather={game.weather} season={game.season} isDay={isDay} t={t} />
            </div>

            <div className="hud-resources" aria-label={t('playerResources')}>
                <div
                    className={`connection-badge connection-${serverStatus}`}
                    title={serverStatus === 'connected' ? t('online') : t('offline')}
                >
                    {serverStatus === 'connected' ? <CloudCheck size={18} /> : <CloudOff size={18} />}
                </div>
                {game.combo > 0 && (
                    <div className="resource-badge resource-combo">
                        <Zap size={16} />
                        <span>×{game.combo}</span>
                    </div>
                )}
                {goldenHourActive && (
                    <div className="resource-badge resource-golden">
                        <SunMedium size={16} />
                        <span>2×</span>
                    </div>
                )}
                <div className="resource-badge resource-coins">
                    <Coins size={16} />
                    <span>{Math.floor(game.coins)}</span>
                </div>
            </div>

            <div className="hud-tool-region" ref={toolRegionRef}>
                <nav
                    className={`hud-tools ${isDay ? 'hud-tools-day' : 'hud-tools-night'}`}
                    aria-label={t('gameTools')}
                    title={`${currentUser} · ${game.isDemoMode ? t('rateDemo') : t('rateNormal')}`}
                >
                    <button type="button" onClick={() => onOpenModal('store')} className="hud-tool-button">
                        <ShoppingCart size={18} />
                        <span className="hud-tool-label">{t('store')}</span>
                    </button>
                    <button type="button" onClick={onToggleCollection} className="hud-tool-button">
                        <BookOpen size={18} />
                        <span className="hud-tool-label">{t('collection')}</span>
                    </button>
                    <button type="button" onClick={() => onOpenModal('companions')} className="hud-tool-button">
                        <Paw size={18} />
                        <span className="hud-tool-label">{t('companions')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpenModal('dailyReward')}
                        className={`hud-tool-button ${game.dailyRewardAvailable ? 'hud-tool-ready' : ''}`}
                    >
                        <Calendar size={18} />
                        <span className="hud-tool-label">{t('reward')}</span>
                        {game.dailyRewardAvailable && <span className="hud-notification-dot" aria-hidden="true" />}
                    </button>
                    <button
                        ref={moreButtonRef}
                        type="button"
                        onClick={() => setIsMoreOpen(open => !open)}
                        className={`hud-tool-button hud-more-button ${isMoreOpen ? 'hud-tool-active' : ''}`}
                        aria-expanded={isMoreOpen}
                        aria-controls="hud-more-menu"
                    >
                        <span className="hud-more-glyph" aria-hidden="true">•••</span>
                        <span className="hud-tool-label">{t('more')}</span>
                    </button>
                </nav>

                {isMoreOpen && (
                    <div
                        id="hud-more-menu"
                        className={`hud-more-menu ${isDay ? 'hud-more-menu-day' : 'hud-more-menu-night'}`}
                        role="menu"
                        aria-label={t('more')}
                    >
                        <button type="button" role="menuitem" className="hud-menu-item" onClick={() => runMenuAction(trigger => onOpenModal('profile', trigger))}>
                            {game.profileData?.avatar
                                ? <img src={game.profileData.avatar} alt="" className="hud-profile-avatar" />
                                : <User size={18} />}
                            <span>{t('profile')}</span>
                        </button>
                        <button type="button" role="menuitem" className="hud-menu-item" onClick={() => runMenuAction(onOpenLeaderboard)}>
                            <Trophy size={18} />
                            <span>{t('leaderboard')}</span>
                        </button>
                        <button type="button" role="menuitem" className="hud-menu-item" onClick={() => runMenuAction(trigger => onOpenModal('prestige', trigger))}>
                            <Recycle size={18} />
                            <span>{t('prestige')}</span>
                        </button>
                        <button type="button" role="menuitem" className="hud-menu-item" onClick={() => runMenuAction(trigger => onOpenModal('miniGames', trigger))}>
                            <Gamepad size={18} />
                            <span>{t('miniGames')}</span>
                        </button>
                        <button type="button" role="menuitem" className="hud-menu-item" onClick={() => runMenuAction(trigger => onOpenModal('stats', trigger))}>
                            <StatsIcon size={18} />
                            <span>{t('stats')}</span>
                        </button>
                        <div className="hud-menu-divider" aria-hidden="true" />
                        <button type="button" role="menuitem" className="hud-menu-item" onClick={() => runMenuAction(onCycleLang)}>
                            <span className="hud-menu-text-icon">{t('langName')}</span>
                            <span>{t('language')}</span>
                        </button>
                        <button type="button" role="menuitem" className="hud-menu-item" onClick={() => runMenuAction(onToggleMute)}>
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            <span>{isMuted ? t('soundOn') : t('mute')}</span>
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            className="hud-menu-item"
                            onClick={() => runMenuAction(onToggleDemoState)}
                        >
                            <span className="hud-menu-text-icon">{game.isDemoMode ? '2×' : '1×'}</span>
                            <span>{game.isDemoMode ? t('switchRealTime') : t('switchTimeWarp')}</span>
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
