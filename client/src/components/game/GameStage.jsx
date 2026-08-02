import React, { memo } from 'react';
import { Droplets, Bug, Shovel, Scissors, SunMedium, CloudLightning } from '../Icons';
import { TreeVisual } from '../TreeVisual';
import { CompanionSprite } from '../CompanionSprite';

const MemoizedTree = memo(TreeVisual);
const BURST_LABEL_KEYS = {
    WATER: 'burstWater',
    PEST: 'burstPest',
    FERTILIZE: 'burstFertilize',
    PRUNE: 'burstPrune',
    SUNLIGHT: 'burstSunlight',
    STORM: 'burstStorm',
};

export function GameStage({ actionBursts, shakeAnim, game, isDay, t, onShakeTree }) {
    return (
        <>
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
                    <div className="action-burst-label">{t(BURST_LABEL_KEYS[burst.type])}</div>
                </div>
            ))}

            <div
                className={`flex-1 w-full min-h-0 relative z-10 mb-4 cursor-pointer transition-transform ${shakeAnim ? 'animate-wiggle' : ''}`}
                role="button"
                tabIndex="0"
                aria-label={t('shakeTree')}
                onClick={onShakeTree}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onShakeTree();
                    }
                }}
            >
                <MemoizedTree
                    level={game.level}
                    eventType={game.activeEvent}
                    skin={game.inventory?.treeSkin}
                    season={game.season}
                    weather={game.weather}
                    t={t}
                />
                <CompanionSprite companion={game.companion} isDay={isDay} t={t} />
            </div>
        </>
    );
}
