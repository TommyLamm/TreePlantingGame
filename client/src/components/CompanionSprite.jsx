import React from 'react';

const companionConfig = {
    butterfly: { className: 'companion-butterfly', label: 'Butterfly companion' },
    squirrel: { className: 'companion-squirrel', label: 'Squirrel companion' },
    bird: { className: 'companion-bird', label: 'Bird companion' },
    owl: { className: 'companion-owl', label: 'Owl companion' },
    deer: { className: 'companion-deer', label: 'Deer companion' },
    phoenix: { className: 'companion-phoenix', label: 'Phoenix companion' },
};

export const CompanionSprite = ({ companion, isDay = true }) => {
    if (!companion) return null;

    const assetId = companionConfig[companion] ? companion : 'butterfly';
    const config = companionConfig[assetId];

    return (
        <div className={`companion-sprite ${config.className} ${isDay ? 'companion-day' : 'companion-night'}`} aria-label={config.label}>
            <div className="companion-glow" />
            <img
                className="companion-art"
                src={`/assets/companions/${assetId}.png`}
                alt=""
                aria-hidden="true"
                draggable="false"
            />
            {companion === 'phoenix' && (
                <div className="companion-embers">
                    <span />
                    <span />
                    <span />
                </div>
            )}
        </div>
    );
};
