import React, { useEffect, useMemo, useState } from 'react';
import { MAX_LEVEL } from '../constants';

const EVENT_ASSETS = {
    WATER: 'droplets',
    PEST: 'bug',
    FERTILIZE: 'shovel',
    PRUNE: 'scissors',
    SUNLIGHT: 'sun-medium',
    STORM: 'cloud-lightning',
};

function getStage(level) {
    const safeLevel = Number(level) || 1;
    if (safeLevel >= 86) return 7;
    if (safeLevel >= 66) return 6;
    if (safeLevel >= 46) return 5;
    if (safeLevel >= 26) return 4;
    if (safeLevel >= 12) return 3;
    if (safeLevel >= 5) return 2;
    return 1;
}

function getSkin(skin) {
    return ['cherry', 'autumn', 'snow', 'golden'].includes(skin) ? skin : 'default';
}

function getSeasonAccent(season, weather, skin) {
    if (weather === 'snowy' || season === 'winter' || skin === 'snow') return 'winter';
    if (skin === 'cherry' || season === 'spring') return 'spring';
    if (skin === 'autumn' || season === 'autumn') return 'autumn';
    return 'summer';
}

export const TreeVisual = ({ level, eventType, skin, season = 'spring', weather = 'sunny', isStatic = false }) => {
    const safeLevel = Number(level) || 1;
    const stage = getStage(safeLevel);
    const assetSkin = getSkin(skin);
    const accent = getSeasonAccent(season, weather, assetSkin);
    const treeSrc = `/assets/trees/${assetSkin}-stage-${stage}.png`;
    const [prevLevel, setPrevLevel] = useState(safeLevel);
    const [levelUpAnim, setLevelUpAnim] = useState(false);

    useEffect(() => {
        if (safeLevel > prevLevel) {
            setLevelUpAnim(true);
            const timer = setTimeout(() => setLevelUpAnim(false), 1000);
            setPrevLevel(safeLevel);
            return () => clearTimeout(timer);
        }
        setPrevLevel(safeLevel);
    }, [safeLevel, prevLevel]);

    const accents = useMemo(() => {
        if (stage < 2) return [];
        return Array.from({ length: Math.min(12, stage + 5) }, (_, i) => ({
            id: i,
            left: 26 + ((i * 17 + stage * 5) % 48),
            top: 16 + ((i * 23 + stage * 3) % 40),
            delay: `${(i * 0.37) % 2.8}s`,
            size: 6 + (i % 4) * 2,
        }));
    }, [stage]);

    const eventAsset = eventType ? EVENT_ASSETS[eventType] : null;

    return (
        <div
            className={[
                'raster-tree-scene',
                `raster-stage-${stage}`,
                `raster-skin-${assetSkin}`,
                `raster-season-${accent}`,
                weather === 'rainy' || weather === 'stormy' ? 'raster-weather-wet' : '',
                isStatic ? 'raster-tree-static' : '',
                levelUpAnim ? 'raster-level-up' : '',
                safeLevel === MAX_LEVEL ? 'raster-max-level' : '',
                eventType ? `raster-event-active-${eventType.toLowerCase()}` : '',
            ].filter(Boolean).join(' ')}
            aria-label={`Tree level ${safeLevel}`}
        >
            <img className="raster-ground-patch" src="/assets/decor/ground-patch.png" alt="" aria-hidden="true" draggable="false" />
            <div className="tree-ground-shadow" aria-hidden="true" />
            <div className="tree-ground-halo" aria-hidden="true" />
            <div className="tree-ground-vegetation" aria-hidden="true" />
            {levelUpAnim && (
                <div className="raster-level-up-ring" aria-hidden="true" />
            )}

            {stage >= 3 && !isStatic && (
                <div className="raster-clouds" aria-hidden="true">
                    <span />
                    <span />
                </div>
            )}

            {stage >= 3 && !isStatic && (
                <div className="raster-birds" aria-hidden="true">
                    <span />
                    <span />
                </div>
            )}

            <div className="raster-tree-wrap">
                {!isStatic && <div className="raster-tree-glow" aria-hidden="true" />}
                <img
                    className="raster-tree-art"
                    src={treeSrc}
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                />
            </div>

            {stage >= 2 && (
                <img className="raster-person raster-person-right" src="/assets/decor/person.png" alt="" aria-hidden="true" draggable="false" />
            )}
            {stage >= 4 && (
                <img className="raster-house" src="/assets/decor/house.png" alt="" aria-hidden="true" draggable="false" />
            )}
            {stage >= 5 && (
                <img className="raster-person raster-person-left" src="/assets/decor/person.png" alt="" aria-hidden="true" draggable="false" />
            )}

            {stage >= 2 && (
                <div className="raster-season-accents" aria-hidden="true">
                    {accents.map((item) => (
                        <span
                            key={item.id}
                            style={{
                                left: `${item.left}%`,
                                top: `${item.top}%`,
                                width: `${item.size}px`,
                                height: `${item.size}px`,
                                animationDelay: item.delay,
                            }}
                        />
                    ))}
                </div>
            )}

            {(weather === 'rainy' || weather === 'stormy') && !isStatic && (
                <div className="raster-rain-drops" aria-hidden="true">
                    {accents.slice(0, 7).map((item) => (
                        <span key={item.id} style={{ left: `${item.left + 3}%`, top: `${item.top + 14}%`, animationDelay: item.delay }} />
                    ))}
                </div>
            )}

            {eventAsset && (
                <div className={`raster-event-overlay raster-event-${eventType.toLowerCase()}`} aria-hidden="true">
                    <img src={`/assets/icons/${eventAsset}.png`} alt="" draggable="false" />
                </div>
            )}
        </div>
    );
};
