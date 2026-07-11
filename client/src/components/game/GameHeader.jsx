import React from 'react';
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
    return (
        <header className="game-hud" aria-label="Game status and tools">
            <div className="hud-environment">
                <WeatherDisplay weather={game.weather} season={game.season} isDay={isDay} t={t} />
            </div>

            <div className="hud-resources" aria-label="Player resources">
                <div
                    className={`connection-badge connection-${serverStatus}`}
                    title={serverStatus === 'connected' ? 'Online' : 'Offline'}
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

            <nav
                className="hud-tools"
                aria-label="Game tools"
                title={`${currentUser} · ${game.isDemoMode ? t('rateDemo') : t('rateNormal')}`}
            >
                <button type="button" onClick={onCycleLang} className="hud-tool-button hud-language" title={t('langName')}>
                    {t('langName')}
                </button>
                <button type="button" onClick={() => onOpenModal('profile')} className="hud-tool-button" title={t('profile')}>
                    {game.profileData?.avatar
                        ? <img src={game.profileData.avatar} alt="" className="hud-profile-avatar" />
                        : <User size={18} />}
                </button>
                <button type="button" onClick={() => onOpenModal('store')} className="hud-tool-button" title={t('store')}>
                    <ShoppingCart size={18} />
                </button>
                <button type="button" onClick={onToggleCollection} className="hud-tool-button" title={t('collection')}>
                    <BookOpen size={18} />
                </button>
                <button type="button" onClick={onOpenLeaderboard} className="hud-tool-button" title={t('leaderboard')}>
                    <Trophy size={18} />
                </button>
                <button type="button" onClick={() => onOpenModal('companions')} className="hud-tool-button" title={t('companions')}>
                    {companionAssetId
                        ? <img src={`/assets/companions/${companionAssetId}.png`} alt="" className="hud-companion-avatar" />
                        : <Paw size={18} />}
                </button>
                <button type="button" onClick={() => onOpenModal('prestige')} className="hud-tool-button" title={t('prestige')}>
                    <Recycle size={18} />
                </button>
                <button type="button" onClick={() => onOpenModal('miniGames')} className="hud-tool-button" title={t('miniGames')}>
                    <Gamepad size={18} />
                </button>
                <button type="button" onClick={() => onOpenModal('stats')} className="hud-tool-button" title={t('stats')}>
                    <StatsIcon size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => onOpenModal('dailyReward')}
                    className={`hud-tool-button ${game.dailyRewardAvailable ? 'hud-tool-ready' : ''}`}
                    title={t('dailyReward')}
                >
                    <Calendar size={18} />
                </button>
                <button type="button" onClick={onToggleMute} className="hud-tool-button" title={t('mute')}>
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button
                    type="button"
                    onClick={onToggleDemoState}
                    className={`hud-tool-button hud-time-rate ${game.isDemoMode ? 'hud-tool-active' : ''}`}
                    title={game.isDemoMode ? t('timeWarp') : t('realTime')}
                >
                    {game.isDemoMode ? '2×' : '1×'}
                </button>
            </nav>
        </header>
    );
}
