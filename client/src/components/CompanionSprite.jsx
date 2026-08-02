import React from 'react';

const companionConfig = {
    butterfly: { className: 'companion-butterfly', nameKey: 'companionButterfly' },
    squirrel: { className: 'companion-squirrel', nameKey: 'companionSquirrel' },
    bird: { className: 'companion-bird', nameKey: 'companionBird' },
    owl: { className: 'companion-owl', nameKey: 'companionOwl' },
    deer: { className: 'companion-deer', nameKey: 'companionDeer' },
    phoenix: { className: 'companion-phoenix', nameKey: 'companionPhoenix' },
};

export const CompanionSprite = ({ companion, isDay = true, t }) => {
    if (!companion) return null;

    const assetId = companionConfig[companion] ? companion : 'butterfly';
    const config = companionConfig[assetId];

    return (
        <div className={`scene-companion-layer companion-sprite ${config.className} ${isDay ? 'companion-day' : 'companion-night'}`} aria-label={t('companionLabel', t(config.nameKey))}>
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
