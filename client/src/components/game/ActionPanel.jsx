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

    const eventMessage = localActiveEvent === 'STORM'
        ? t('stormWarning').replace(/^⚡\uFE0F?\s*/u, '')
        : t('action');

    return (
        <section
            className={`game-status-panel ${isDay ? 'status-panel-day' : 'status-panel-night'}`}
            aria-label={t('status')}
        >
            <div className="status-summary">
                <strong className="status-level">
                    {t('level')} {game.level}
                    {game.level === MAX_LEVEL && <span className="status-max">{t('max')}</span>}
                    {game.generation > 0 && <span className="status-generation">G{game.generation}</span>}
                </strong>
                <span className="status-xp">{Math.floor(game.xp)} / {xpRequired} XP</span>
                {game.combo > 0 && (
                    <span className="status-combo">
                        <Zap size={14} />
                        ×{game.combo}
                    </span>
                )}
            </div>

            <div
                className="status-progress"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={Math.round(progress)}
            >
                <span
                    className={goldenHourActive ? 'progress-fill progress-fill-golden' : 'progress-fill'}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {localActiveEvent && (
                <div className={`event-actions event-${localActiveEvent.toLowerCase()}`}>
                    <p className="event-label">
                        <Zap size={14} />
                        {eventMessage}
                    </p>
                    <div className="event-action-buttons">
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
            )}
        </section>
    );
}
