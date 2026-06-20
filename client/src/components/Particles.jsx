import React, { useMemo } from 'react';

function hashSeed(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function seededRandom(seed) {
    let s = seed || 1;
    return () => {
        s = Math.imul(1664525, s) + 1013904223;
        return ((s >>> 0) / 4294967296);
    };
}

function makeItems(kind, count, rng, options = {}) {
    const topMin = options.topMin ?? -25;
    const topMax = options.topMax ?? 105;
    const durationMin = options.durationMin ?? 10;
    const durationMax = options.durationMax ?? 18;
    const sizeMin = options.sizeMin ?? 8;
    const sizeMax = options.sizeMax ?? 18;

    return Array.from({ length: count }, (_, id) => {
        const left = rng() * 100;
        const drift = (rng() - 0.5) * (options.drift ?? 120);
        const spin = (rng() - 0.5) * (options.spin ?? 90);

        return {
            id: `${kind}-${id}`,
            kind,
            left: `${left}%`,
            top: `${topMin + rng() * (topMax - topMin)}%`,
            duration: `${durationMin + rng() * (durationMax - durationMin)}s`,
            delay: `${rng() * (options.delayMax ?? 8)}s`,
            size: sizeMin + rng() * (sizeMax - sizeMin),
            opacity: (options.opacityMin ?? 0.35) + rng() * ((options.opacityMax ?? 0.8) - (options.opacityMin ?? 0.35)),
            drift: `${drift}px`,
            driftEnd: `${drift * 1.45}px`,
            driftBack: `${drift * -0.35}px`,
            spin: `${spin}deg`,
        };
    });
}

function particleStyle(p) {
    return {
        left: p.left,
        top: p.top,
        width: `${p.size}px`,
        height: `${p.size}px`,
        '--particle-opacity': p.opacity,
        animationDuration: p.duration,
        animationDelay: p.delay,
        '--drift-x': p.drift,
        '--drift-end-x': p.driftEnd,
        '--drift-back-x': p.driftBack,
        '--spin-angle': p.spin,
        '--leaf-height': `${p.size * 0.62}px`,
    };
}

function getSeasonAsset(season, weather) {
    if (weather === 'snowy' || season === 'winter') return 'snow';
    if (season === 'spring') return 'petal';
    if (season === 'autumn') return 'leaf autumn-leaf';
    if (season === 'summer') return 'mote pollen-mote';
    return 'leaf';
}

export const Particles = ({ isDay, weather = 'sunny', season = 'spring' }) => {
    const { seasonal, fireflies, rain, clouds, glints, butterflies } = useMemo(() => {
        const rng = seededRandom(hashSeed(`${isDay}-${weather}-${season}`));
        const isWet = weather === 'rainy' || weather === 'stormy';
        const isSnowy = weather === 'snowy' || season === 'winter';
        const isCalmNight = !isDay && !isWet && !isSnowy;

        return {
            seasonal: makeItems('seasonal', isWet ? 6 : (isSnowy ? 22 : (isDay ? 14 : 8)), rng, {
                topMin: isSnowy ? -40 : -25,
                topMax: isSnowy ? 80 : -5,
                durationMin: isSnowy ? 12 : 10,
                durationMax: isSnowy ? 24 : 17,
                sizeMin: isSnowy ? 3 : 10,
                sizeMax: isSnowy ? 7 : 22,
                drift: isSnowy ? 90 : 150,
                opacityMin: isSnowy ? 0.45 : 0.3,
                opacityMax: isSnowy ? 0.9 : 0.72,
            }),
            fireflies: isCalmNight ? makeItems('firefly', 18, rng, {
                topMin: 12,
                topMax: 88,
                durationMin: 7,
                durationMax: 15,
                sizeMin: 2,
                sizeMax: 5,
                drift: 80,
                opacityMin: 0.45,
                opacityMax: 0.95,
            }) : [],
            rain: isWet ? makeItems('rain', weather === 'stormy' ? 26 : 24, rng, {
                topMin: -30,
                topMax: 10,
                durationMin: weather === 'stormy' ? 0.85 : 1.25,
                durationMax: weather === 'stormy' ? 1.6 : 2.4,
                sizeMin: weather === 'stormy' ? 22 : 16,
                sizeMax: weather === 'stormy' ? 36 : 28,
                drift: weather === 'stormy' ? 80 : 40,
                delayMax: 3,
                opacityMin: 0.28,
                opacityMax: 0.62,
            }) : [],
            clouds: ['cloudy', 'rainy', 'stormy', 'snowy'].includes(weather)
                ? makeItems('cloud', 3, rng, {
                    topMin: 5,
                    topMax: 33,
                    durationMin: 32,
                    durationMax: 58,
                    sizeMin: weather === 'stormy' ? 120 : 90,
                    sizeMax: weather === 'stormy' ? 190 : 155,
                    drift: 220,
                    opacityMin: weather === 'stormy' ? 0.22 : 0.16,
                    opacityMax: weather === 'stormy' ? 0.42 : 0.32,
                }) : [],
            glints: isDay && weather === 'sunny' ? makeItems('glint', 6, rng, {
                topMin: 5,
                topMax: 70,
                durationMin: 5,
                durationMax: 11,
                sizeMin: 5,
                sizeMax: 12,
                drift: 40,
                opacityMin: 0.25,
                opacityMax: 0.65,
            }) : [],
            butterflies: isDay && season === 'spring' ? makeItems('butterfly', 4, rng, {
                topMin: 25,
                topMax: 65,
                durationMin: 12,
                durationMax: 22,
                sizeMin: 12,
                sizeMax: 18,
                drift: 180,
                opacityMin: 0.5,
                opacityMax: 0.8,
            }) : [],
        };
    }, [isDay, weather, season]);

    const seasonalClass = getSeasonAsset(season, weather);

    return (
        <div className={`ambient-scene ${isDay ? 'ambient-day' : 'ambient-night'} ambient-${weather} season-${season}`}>
            <div className="ambient-horizon" />

            {clouds.map((p) => (
                <div key={p.id} className="ambient-particle cloud-bank" style={particleStyle(p)} />
            ))}

            {glints.map((p) => (
                <div key={p.id} className="ambient-particle sun-glint" style={particleStyle(p)} />
            ))}

            {seasonal.map((p) => (
                <div key={p.id} className={`ambient-particle ${seasonalClass}`} style={particleStyle(p)} />
            ))}

            {rain.map((p) => (
                <div key={p.id} className="ambient-particle rain-streak" style={particleStyle(p)} />
            ))}

            {fireflies.map((p) => (
                <div key={p.id} className="ambient-particle firefly" style={particleStyle(p)} />
            ))}

            {butterflies.map((p) => (
                <div key={p.id} className="ambient-particle butterfly" style={particleStyle(p)}>
                    <span />
                </div>
            ))}
        </div>
    );
};
