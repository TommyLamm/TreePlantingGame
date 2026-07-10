import React from 'react';
import { MAX_LEVEL } from '../../constants';
import { Zap, Droplets, Bug, Shovel, Scissors, SunMedium, CloudLightning } from '../Icons';
import { ActionButton } from '../ActionButton';

export function ActionPanel({
    game, isDay, goldenHourActive, localActiveEvent,
    xpRequired, progress, t, onAction,
}) {
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

    return (
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
                                    onClick={() => onAction(key)}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={`h-full flex items-center justify-center text-xs italic border-2 border-dashed rounded-xl ${isDay ? 'text-gray-400 border-gray-200' : 'text-gray-500 border-slate-700'}`}>{t('peaceful')}</div>
                )}
            </div>
        </div>
    );
}
