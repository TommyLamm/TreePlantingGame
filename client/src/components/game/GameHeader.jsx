import React from 'react';
import { CloudCheck, CloudOff, User, BookOpen, VolumeX, Volume2, Clock, Coins, ShoppingCart, Trophy, Calendar, Paw, Recycle, Gamepad, StatsIcon } from '../Icons';
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
        <>
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
                    <button onClick={onCycleLang} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 font-bold text-[10px]" title={t('langName')}>{t('langName')}</button>
                    <button onClick={() => onOpenModal('profile')} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 overflow-hidden" title={t('profile')}>
                        {game.profileData?.avatar ? <img src={game.profileData.avatar} alt="User" className="w-full h-full object-cover" /> : <User size={16} />}
                    </button>
                    <button onClick={() => onOpenModal('store')} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-amber-500" title={t('store')}><ShoppingCart size={16} /></button>
                    <button onClick={onToggleCollection} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-green-600 dark:text-green-400" title={t('collection')}><BookOpen size={16} /></button>
                    <button onClick={onOpenLeaderboard} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-purple-600 dark:text-purple-400" title={t('leaderboard')}><Trophy size={16} /></button>
                    <button onClick={() => onOpenModal('companions')} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-base" title={t('companions')}>
                        {companionAssetId ? <img src={`/assets/companions/${companionAssetId}.png`} alt="" aria-hidden="true" className="w-6 h-6 object-contain" /> : <Paw size={16} />}
                    </button>
                    <button onClick={() => onOpenModal('prestige')} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-base" title={t('prestige')}><Recycle size={16} /></button>
                    <button onClick={() => onOpenModal('miniGames')} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-base" title={t('miniGames')}><Gamepad size={16} /></button>
                    <button onClick={() => onOpenModal('stats')} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-base" title={t('stats')}><StatsIcon size={16} /></button>
                    <button onClick={() => onOpenModal('dailyReward')} className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all text-base ${game.dailyRewardAvailable ? 'bg-amber-400/80 animate-pulse text-amber-950' : 'hover:bg-black/10 dark:hover:bg-white/10'}`} title={t('dailyReward')}><Calendar size={16} /></button>
                    <button onClick={onToggleMute} className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 text-blue-500" title={t('mute')}>{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
                </div>

                {/* Row 4: Time warp */}
                <button onClick={onToggleDemoState} className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-lg text-[10px] font-bold transition-all ${game.isDemoMode ? 'bg-purple-600 text-white animate-pulse' : (isDay ? 'bg-white/80 text-gray-600 border border-white/50' : 'bg-slate-700/80 text-gray-300 border border-slate-600')}`}><Clock size={12} /> {game.isDemoMode ? t('timeWarp').split('(')[0] : t('realTime')}</button>

                <div className={`text-[9px] text-right px-1 ${isDay ? 'text-gray-500' : 'text-gray-400'}`}>
                    {currentUser}
                    {game.generation > 0 && ` | Gen ${game.generation}`}
                    {companionAssetId && <img src={`/assets/companions/${companionAssetId}.png`} alt="" aria-hidden="true" className="inline-block w-4 h-4 object-contain align-[-3px] ml-1" />}
                    {' | '}{game.isDemoMode ? t('rateDemo') : t('rateNormal')}
                </div>
            </div>
        </>
    );
}
