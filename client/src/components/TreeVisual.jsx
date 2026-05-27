import React, { useState, useEffect, useMemo } from 'react';
import { MAX_LEVEL } from '../constants';
import { CloudRain, Bug, Sparkles } from './Icons';

// Seeded pseudo-random for deterministic tree shapes
function seededRandom(seed) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

export const TreeVisual = ({ level, eventType, skin, isStatic = false }) => {
    const safeLevel = Number(level) || 1;
    const centerX = 150;
    const baseY = 390;

    // 1. Stage Calculation (7 stages for levels 1-100)
    let stage = 1;
    if (safeLevel >= 5 && safeLevel <= 11) stage = 2;
    else if (safeLevel >= 12 && safeLevel <= 25) stage = 3;
    else if (safeLevel >= 26 && safeLevel <= 45) stage = 4;
    else if (safeLevel >= 46 && safeLevel <= 65) stage = 5;
    else if (safeLevel >= 66 && safeLevel <= 85) stage = 6;
    else if (safeLevel >= 86) stage = 7;

    // 2. Trunk & Geometry — layers capped at 6 max
    const trunkBaseWidth = 14;
    let trunkHeightFactor, trunkWidthFactor, numLayers, maxSpread, fHeightFactor;

    if (stage === 1) {
        trunkHeightFactor = 0;
        trunkWidthFactor = 0;
        numLayers = 0;
        maxSpread = 0;
        fHeightFactor = 0;
    } else if (stage === 2) {
        trunkHeightFactor = 10 + (safeLevel - 4) * 5;
        trunkWidthFactor = 1 + (safeLevel - 4) * 0.5;
        numLayers = 2;
        maxSpread = 40 + (safeLevel - 4) * 3;
        fHeightFactor = 0.4;
    } else if (stage === 3) {
        trunkHeightFactor = 45 + (safeLevel - 11) * 6;
        trunkWidthFactor = 4.5 + (safeLevel - 11) * 0.6;
        numLayers = 3;
        maxSpread = 65 + (safeLevel - 11) * 3;
        fHeightFactor = 0.5;
    } else if (stage === 4) {
        trunkHeightFactor = 130 + (safeLevel - 25) * 4;
        trunkWidthFactor = 13 + (safeLevel - 25) * 0.5;
        numLayers = 4;
        maxSpread = 110 + (safeLevel - 25) * 2;
        fHeightFactor = 0.55;
    } else if (stage === 5) {
        trunkHeightFactor = 210 + (safeLevel - 45) * 3;
        trunkWidthFactor = 23 + (safeLevel - 45) * 0.4;
        numLayers = 5;
        maxSpread = 150 + (safeLevel - 45) * 1.5;
        fHeightFactor = 0.55;
    } else if (stage === 6) {
        trunkHeightFactor = 270 + (safeLevel - 65) * 2;
        trunkWidthFactor = 31 + (safeLevel - 65) * 0.3;
        numLayers = 5;
        maxSpread = 180 + (safeLevel - 65) * 1;
        fHeightFactor = 0.5;
    } else {
        trunkHeightFactor = 310 + (safeLevel - 85) * 1.5;
        trunkWidthFactor = 37 + (safeLevel - 85) * 0.2;
        numLayers = 6;
        maxSpread = 200 + (safeLevel - 85) * 0.8;
        fHeightFactor = 0.48;
    }

    const trunkHeight = stage === 1 ? 0 : 50 + trunkHeightFactor;
    const trunkWidth = stage === 1 ? 0 : trunkBaseWidth + trunkWidthFactor;
    const treeTopY = baseY - trunkHeight;

    const foliageBottomY = stage === 1 ? baseY : treeTopY + trunkHeight * fHeightFactor;
    const foliageTopY = stage === 1 ? baseY - 30 : treeTopY - 50 - (stage * 18);
    const fHeight = stage === 1 ? 0 : foliageBottomY - foliageTopY;

    // 3. Dynamic viewBox
    const absoluteTop = stage === 1 ? baseY - 80 : foliageTopY - 40;
    const vbY = Math.min(-50, absoluteTop - 80 - stage * 10);
    const vbH = 450 - vbY;
    const vbW = Math.max(300, 300 + maxSpread * 2);
    const vbX = centerX - (vbW / 2);
    const scale = vbH / 500;

    const [prevLevel, setPrevLevel] = useState(safeLevel);
    const [levelUpAnim, setLevelUpAnim] = useState(false);

    useEffect(() => {
        if (safeLevel > prevLevel) {
            setLevelUpAnim(true);
            const timer = setTimeout(() => setLevelUpAnim(false), 1000);
            setPrevLevel(safeLevel);
            return () => clearTimeout(timer);
        }
    }, [safeLevel, prevLevel]);

    // --- COLORS ---
    const isMax = safeLevel === MAX_LEVEL;
    const trunkColorMain = isMax ? '#4E342E' : '#5D4037';
    const trunkColorDark = '#3E2723';
    const trunkColorLight = isMax ? '#795548' : '#8D6E63';

    let fBase = isMax ? '#0B3B17' : (safeLevel > 7 ? '#14451C' : '#1B5E20');
    let fMid = isMax ? '#185220' : (safeLevel > 7 ? '#1B5E20' : '#2E7D32');
    let fHigh = isMax ? '#2A7233' : (safeLevel > 7 ? '#2E7D32' : '#4CAF50');
    let fShadow = isMax ? '#051A0A' : (safeLevel > 7 ? '#0A260F' : '#0F3314');
    let fEdge = isMax ? '#3D8B47' : (safeLevel > 7 ? '#388E3C' : '#66BB6A');

    if (skin === 'cherry') {
        fBase = '#C2185B';
        fMid = '#E91E63';
        fHigh = '#F06292';
        fShadow = '#880E4F';
        fEdge = '#F8BBD0';
    }

    // Generate a natural wavy pine layer path
    const generatePineLayerPath = useMemo(() => {
        return (cx, cy, layerWidth, layerHeight, seed, droopFactor = 0.15) => {
            const rng = seededRandom(seed);
            const tipY = cy - layerHeight;
            const baseLeftX = cx - layerWidth / 2;
            const baseRightX = cx + layerWidth / 2;
            const droopY = cy + layerHeight * droopFactor;

            const numWavesPerSide = Math.max(3, Math.min(6, 3 + Math.floor(layerWidth / 40)));
            let path = `M${cx} ${tipY}`;

            for (let i = 1; i <= numWavesPerSide; i++) {
                const t = i / numWavesPerSide;
                const x = cx + (baseRightX - cx) * t;
                const y = tipY + (droopY - tipY) * t;
                const bumpX = (rng() - 0.5) * layerWidth * 0.08;
                const bumpY = (rng() - 0.5) * layerHeight * 0.12;
                const cpX = x - layerWidth / (numWavesPerSide * 2) + bumpX;
                const cpY = y - layerHeight * 0.06 + bumpY;
                path += ` Q${cpX.toFixed(1)} ${cpY.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
            }

            path += ` Q${cx + layerWidth * 0.15} ${droopY + layerHeight * 0.08} ${cx} ${droopY - layerHeight * 0.02}`;
            path += ` Q${cx - layerWidth * 0.15} ${droopY + layerHeight * 0.08} ${baseLeftX.toFixed(1)} ${droopY.toFixed(1)}`;

            for (let i = numWavesPerSide; i >= 1; i--) {
                const t = i / numWavesPerSide;
                const x = cx + (baseLeftX - cx) * t;
                const y = tipY + (droopY - tipY) * t;
                const bumpX = (rng() - 0.5) * layerWidth * 0.08;
                const bumpY = (rng() - 0.5) * layerHeight * 0.12;
                const cpX = x + layerWidth / (numWavesPerSide * 2) + bumpX;
                const cpY = y + layerHeight * 0.06 + bumpY;
                path += ` Q${cpX.toFixed(1)} ${cpY.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
            }

            path += ' Z';
            return path;
        };
    }, []);

    // Pine Layer Component
    const PineLayer = ({ cx, cy, width, height, delay = 0, seed = 1, isTop = false, layerIndex = 0 }) => {
        const path = generatePineLayerPath(cx, cy, width, height, seed, isTop ? 0.05 : 0.18);
        const shadowPath = generatePineLayerPath(cx + 2, cy + 3, width * 0.95, height * 0.9, seed + 100, isTop ? 0.05 : 0.18);

        return (
            <g className={isStatic ? '' : "animate-bounce-slow"} style={isStatic ? {} : { animationDelay: `${delay}ms` }}>
                <path d={shadowPath} fill={fShadow} opacity="0.3" filter={isStatic ? "" : "blur(3px)"} />
                <path d={path} fill={`url(#foliageGradient-${safeLevel}-${layerIndex})`} />
                <path d={path} fill="none" stroke={fEdge} strokeWidth="1.5" opacity="0.25"
                    strokeDasharray={isTop ? "6 10" : "8 14"} />
                <path d={path} fill={`url(#innerShadow-${safeLevel})`} opacity="0.4" />
                {!isStatic && (
                    <g opacity="0.15">
                        {Array.from({ length: Math.min(8, Math.floor(width / 20)) }, (_, i) => {
                            const rng = seededRandom(seed * 100 + i);
                            const nx = cx - width * 0.35 + rng() * width * 0.7;
                            const ny = cy - height * 0.2 - rng() * height * 0.6;
                            const angle = -60 + rng() * 120;
                            const len = 6 + rng() * 8;
                            return (
                                <line key={i}
                                    x1={nx} y1={ny}
                                    x2={nx + Math.cos(angle * Math.PI / 180) * len}
                                    y2={ny + Math.sin(angle * Math.PI / 180) * len}
                                    stroke={fShadow} strokeWidth="1" strokeLinecap="round" />
                            );
                        })}
                    </g>
                )}
            </g>
        );
    };

    // Branch tips between layers
    const BranchTips = ({ cx, cy, spread, seed }) => {
        const rng = seededRandom(seed);
        const tips = [];
        const count = Math.min(4, 2 + Math.floor(spread / 50));
        for (let i = 0; i < count; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const x = cx + side * (spread * 0.3 + rng() * spread * 0.25);
            const y = cy + rng() * 8 - 4;
            const len = 8 + rng() * 14;
            const droop = 3 + rng() * 5;
            tips.push(
                <path key={i}
                    d={`M${x} ${y} Q${x + side * len * 0.6} ${y + droop * 0.5} ${x + side * len} ${y + droop}`}
                    stroke={trunkColorMain} strokeWidth={1.5 + rng()} fill="none" strokeLinecap="round"
                    opacity="0.7" />
            );
        }
        return <g>{tips}</g>;
    };

    const Grass = ({ cx, cy, height, color = "#33691E" }) => (
        <g>
            <path d={`M${cx} ${cy} Q${cx - 3} ${cy - height * 0.6} ${cx - 2} ${cy - height}`}
                stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d={`M${cx + 2} ${cy} Q${cx + 4} ${cy - height * 0.5} ${cx + 5} ${cy - height * 0.85}`}
                stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
        </g>
    );

    // --- REFERENCE OBJECTS (fixed real-world size) ---
    // Person: ~25px tall (constant)
    const PersonRef = ({ x, y, personScale = 1 }) => (
        <g transform={`translate(${x}, ${y})`} opacity="0.6">
            {/* Head */}
            <circle cx={0} cy={-22 * personScale} r={3.5 * personScale} fill="#8D6E63" />
            {/* Body */}
            <path d={`M0 ${-18.5 * personScale} L0 ${-8 * personScale}`}
                stroke="#5D4037" strokeWidth={2.5 * personScale} strokeLinecap="round" />
            {/* Arms */}
            <path d={`M0 ${-15 * personScale} L${-5 * personScale} ${-10 * personScale}`}
                stroke="#5D4037" strokeWidth={1.5 * personScale} strokeLinecap="round" />
            <path d={`M0 ${-15 * personScale} L${5 * personScale} ${-10 * personScale}`}
                stroke="#5D4037" strokeWidth={1.5 * personScale} strokeLinecap="round" />
            {/* Legs */}
            <path d={`M0 ${-8 * personScale} L${-4 * personScale} 0`}
                stroke="#3E2723" strokeWidth={2 * personScale} strokeLinecap="round" />
            <path d={`M0 ${-8 * personScale} L${4 * personScale} 0`}
                stroke="#3E2723" strokeWidth={2 * personScale} strokeLinecap="round" />
        </g>
    );

    // Fence: fixed height ~18px
    const FenceRef = ({ x, y, posts = 3 }) => (
        <g opacity="0.5">
            {Array.from({ length: posts }, (_, i) => {
                const px = x + i * 12;
                return (
                    <g key={i}>
                        <rect x={px - 1.5} y={y - 18} width={3} height={18}
                            fill="#8D6E63" rx="1" />
                        <polygon points={`${px - 2.5},${y - 18} ${px},${y - 22} ${px + 2.5},${y - 18}`}
                            fill="#A1887F" />
                    </g>
                );
            })}
            {/* Horizontal rails */}
            <rect x={x - 1} y={y - 14} width={(posts - 1) * 12 + 2} height={2}
                fill="#A1887F" rx="1" />
            <rect x={x - 1} y={y - 7} width={(posts - 1) * 12 + 2} height={2}
                fill="#A1887F" rx="1" />
        </g>
    );

    // Bird silhouette
    const Bird = ({ x, y, size = 6, delay = 0 }) => (
        <g className={isStatic ? '' : "animate-float"}
            style={isStatic ? {} : { animationDelay: `${delay}ms` }}>
            <path d={`M${x - size} ${y + size * 0.3} Q${x - size * 0.3} ${y - size * 0.4} ${x} ${y}
                       Q${x + size * 0.3} ${y - size * 0.4} ${x + size} ${y + size * 0.3}`}
                stroke="#37474F" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
        </g>
    );

    // Cloud
    const Cloud = ({ x, y, w = 40, opacity: op = 0.2 }) => (
        <g opacity={op}>
            <ellipse cx={x} cy={y} rx={w * 0.5} ry={w * 0.18} fill="#B0BEC5" />
            <ellipse cx={x - w * 0.2} cy={y - w * 0.08} rx={w * 0.3} ry={w * 0.15} fill="#CFD8DC" />
            <ellipse cx={x + w * 0.15} cy={y - w * 0.1} rx={w * 0.35} ry={w * 0.17} fill="#CFD8DC" />
        </g>
    );

    // Small house
    const HouseRef = ({ x, y, houseScale = 1 }) => (
        <g transform={`translate(${x}, ${y})`} opacity="0.55">
            {/* House body */}
            <rect x={-12 * houseScale} y={-18 * houseScale} width={24 * houseScale} height={18 * houseScale}
                fill="#BCAAA4" stroke="#795548" strokeWidth={0.8 * houseScale} />
            {/* Roof */}
            <polygon points={`${-15 * houseScale},${-18 * houseScale} 0,${-30 * houseScale} ${15 * houseScale},${-18 * houseScale}`}
                fill="#D84315" stroke="#BF360C" strokeWidth={0.6 * houseScale} />
            {/* Door */}
            <rect x={-3 * houseScale} y={-10 * houseScale} width={6 * houseScale} height={10 * houseScale}
                fill="#5D4037" rx={1 * houseScale} />
            {/* Window */}
            <rect x={-10 * houseScale} y={-15 * houseScale} width={5 * houseScale} height={5 * houseScale}
                fill="#BBDEFB" stroke="#795548" strokeWidth={0.5 * houseScale} />
            <rect x={5 * houseScale} y={-15 * houseScale} width={5 * houseScale} height={5 * houseScale}
                fill="#BBDEFB" stroke="#795548" strokeWidth={0.5 * houseScale} />
            {/* Chimney */}
            <rect x={6 * houseScale} y={-28 * houseScale} width={4 * houseScale} height={8 * houseScale}
                fill="#795548" />
        </g>
    );

    // Rock
    const Rock = ({ x, y, size = 8 }) => (
        <g opacity="0.45">
            <ellipse cx={x} cy={y} rx={size} ry={size * 0.55} fill="#78909C" />
            <ellipse cx={x - size * 0.15} cy={y - size * 0.15} rx={size * 0.7} ry={size * 0.4} fill="#90A4AE" />
        </g>
    );

    // --- SPROUT STAGE (Level 1-4) ---
    if (stage === 1) {
        const sScale = 1 + (safeLevel - 1) * 0.3;
        const stemHeight = 35 * sScale;
        const leafSize = 20 * sScale;

        return (
            <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMax meet"
                className={`absolute inset-0 w-full h-full transition-all duration-1000 ${isStatic ? '' : 'drop-shadow-2xl'}`}>
                <defs>
                    <radialGradient id={`seedGradient-${safeLevel}`} cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#A5D6A7" />
                        <stop offset="50%" stopColor="#66BB6A" />
                        <stop offset="100%" stopColor="#2E7D32" />
                    </radialGradient>
                    <linearGradient id={`stemGrad-${safeLevel}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#66BB6A" />
                        <stop offset="100%" stopColor="#33691E" />
                    </linearGradient>
                    {!isStatic && (
                        <radialGradient id={`glowGradient-${safeLevel}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#FFF59D" stopOpacity="1" />
                            <stop offset="100%" stopColor="#FFF59D" stopOpacity="0" />
                        </radialGradient>
                    )}
                </defs>

                {/* Ground */}
                <ellipse cx={centerX} cy={baseY} rx={50 + safeLevel * 5} ry={10} fill="#2E7D32" opacity="0.3" filter={isStatic ? "" : "blur(4px)"} />
                <ellipse cx={centerX} cy={baseY} rx={25 + safeLevel * 3} ry={5} fill="#1B5E20" opacity="0.4" />

                {/* Grass */}
                <Grass cx={centerX - 30} cy={baseY + 2} height={14} />
                <Grass cx={centerX + 22} cy={baseY} height={11} color="#2E7D32" />
                <Grass cx={centerX - 12} cy={baseY + 4} height={9} />
                <Grass cx={centerX + 35} cy={baseY + 3} height={10} color="#388E3C" />

                {/* Reference: small rocks */}
                <Rock x={centerX - 45} y={baseY + 2} size={5} />
                <Rock x={centerX + 40} y={baseY + 3} size={4} />

                {!isStatic && levelUpAnim && (
                    <circle cx={centerX} cy={baseY - 25} r={60}
                        fill={`url(#glowGradient-${safeLevel})`} opacity="0.6" className="animate-pulse" />
                )}

                <g className={isStatic ? '' : `animate-sway ${levelUpAnim ? 'animate-level-up-bounce' : ''}`}
                    style={{ transformOrigin: `${centerX}px ${baseY}px` }}>
                    <path d={`M${centerX} ${baseY}
                              C${centerX - 2 * sScale} ${baseY - stemHeight * 0.3}
                               ${centerX + 3 * sScale} ${baseY - stemHeight * 0.6}
                               ${centerX} ${baseY - stemHeight}`}
                        stroke={`url(#stemGrad-${safeLevel})`} strokeWidth={2.5 * sScale}
                        fill="none" strokeLinecap="round" />
                    <path d={`M${centerX} ${baseY - stemHeight * 0.85}
                              C${centerX - leafSize * 0.8} ${baseY - stemHeight * 0.75}
                               ${centerX - leafSize * 1.1} ${baseY - stemHeight * 1.2}
                               ${centerX - leafSize * 0.1} ${baseY - stemHeight * 1.4}
                              C${centerX - leafSize * 0.3} ${baseY - stemHeight * 1.1}
                               ${centerX - leafSize * 0.1} ${baseY - stemHeight * 0.95}
                               ${centerX} ${baseY - stemHeight * 0.85}`}
                        fill={`url(#seedGradient-${safeLevel})`}
                        filter={isStatic ? "" : "drop-shadow(1px 2px 2px rgba(0,0,0,0.2))"} />
                    <path d={`M${centerX} ${baseY - stemHeight * 0.85}
                              Q${centerX - leafSize * 0.4} ${baseY - stemHeight * 1.05}
                               ${centerX - leafSize * 0.3} ${baseY - stemHeight * 1.25}`}
                        stroke="#1B5E20" strokeWidth={0.6 * sScale} fill="none" opacity="0.4" />
                    <path d={`M${centerX} ${baseY - stemHeight * 0.85}
                              C${centerX + leafSize * 0.8} ${baseY - stemHeight * 0.75}
                               ${centerX + leafSize * 1.1} ${baseY - stemHeight * 1.2}
                               ${centerX + leafSize * 0.1} ${baseY - stemHeight * 1.4}
                              C${centerX + leafSize * 0.3} ${baseY - stemHeight * 1.1}
                               ${centerX + leafSize * 0.1} ${baseY - stemHeight * 0.95}
                               ${centerX} ${baseY - stemHeight * 0.85}`}
                        fill={`url(#seedGradient-${safeLevel})`}
                        filter={isStatic ? "" : "drop-shadow(-1px 2px 2px rgba(0,0,0,0.2))"} />
                    <path d={`M${centerX} ${baseY - stemHeight * 0.85}
                              Q${centerX + leafSize * 0.4} ${baseY - stemHeight * 1.05}
                               ${centerX + leafSize * 0.3} ${baseY - stemHeight * 1.25}`}
                        stroke="#1B5E20" strokeWidth={0.6 * sScale} fill="none" opacity="0.4" />
                    {safeLevel >= 3 && (
                        <ellipse cx={centerX} cy={baseY - stemHeight * 1.05} rx={3 * sScale} ry={5 * sScale}
                            fill="#A5D6A7" opacity="0.7" />
                    )}
                </g>
            </svg>
        );
    }

    // --- TREE STAGES (Level 5+) ---
    return (
        <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMax meet"
            className={`absolute inset-0 w-full h-full transition-all duration-1000 ${eventType && !isStatic ? 'animate-pulse' : ''}`}>
            <defs>
                <filter id={`softShadow-${safeLevel}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
                    <feOffset dx="0" dy="5" result="offsetblur" />
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.3" />
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {!isStatic && (
                    <>
                        <filter id={`barkTexture-${safeLevel}`}>
                            <feTurbulence type="fractalNoise" baseFrequency="0.08 0.03" numOctaves="3" result="noise" />
                            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   1 0 0 0 0" in="noise" result="alphaNoise" />
                            <feComposite in="SourceGraphic" in2="alphaNoise" operator="in" result="textured" />
                            <feBlend mode="multiply" in="SourceGraphic" in2="textured" />
                        </filter>
                        {isMax && (
                            <filter id={`glow-${safeLevel}`}>
                                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                        )}
                    </>
                )}

                <linearGradient id={`trunkGradient3D-${safeLevel}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1a0f0d" />
                    <stop offset="12%" stopColor={trunkColorDark} />
                    <stop offset="35%" stopColor={trunkColorMain} />
                    <stop offset="48%" stopColor={trunkColorLight} />
                    <stop offset="65%" stopColor={trunkColorMain} />
                    <stop offset="88%" stopColor={trunkColorDark} />
                    <stop offset="100%" stopColor="#1a0f0d" />
                </linearGradient>

                {Array.from({ length: numLayers }, (_, i) => {
                    const angle = 30 + i * 20;
                    return (
                        <linearGradient key={`fg-${i}`} id={`foliageGradient-${safeLevel}-${i}`}
                            x1="0%" y1="0%" x2="30%" y2="100%"
                            gradientTransform={`rotate(${angle})`}>
                            <stop offset="0%" stopColor={fHigh} />
                            <stop offset="30%" stopColor={fMid} />
                            <stop offset="70%" stopColor={fBase} />
                            <stop offset="100%" stopColor={fShadow} />
                        </linearGradient>
                    );
                })}

                <linearGradient id={`innerShadow-${safeLevel}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="60%" stopColor="transparent" />
                    <stop offset="100%" stopColor={fShadow} />
                </linearGradient>

                {!isStatic && (
                    <radialGradient id={`glowGradient-${safeLevel}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FFF59D" stopOpacity="1" />
                        <stop offset="100%" stopColor="#FFF59D" stopOpacity="0" />
                    </radialGradient>
                )}
            </defs>

            {/* Ground shadow */}
            <ellipse cx={centerX} cy={baseY} rx={55 + stage * 18} ry={14} fill="#1B5E20" opacity="0.5" filter={isStatic ? "" : "blur(5px)"} />
            <ellipse cx={centerX} cy={baseY} rx={30 + stage * 10} ry={7} fill="#000" opacity="0.25" filter={isStatic ? "" : "blur(3px)"} />

            {/* Grass tufts */}
            <g opacity="0.8">
                <Grass cx={centerX - 45} cy={baseY + 3} height={14} />
                <Grass cx={centerX + 38} cy={baseY + 1} height={11} color="#2E7D32" />
                <Grass cx={centerX - 22} cy={baseY + 6} height={16} />
                <Grass cx={centerX + 22} cy={baseY + 5} height={9} color="#388E3C" />
                {stage >= 3 && <Grass cx={centerX - 65} cy={baseY - 2} height={10} />}
                {stage >= 3 && <Grass cx={centerX + 58} cy={baseY - 1} height={13} color="#33691E" />}
            </g>

            {/* ===== REFERENCE OBJECTS — fixed real-world size ===== */}

            {/* Person standing next to tree (always visible from stage 2+) */}
            {stage >= 2 && (
                <PersonRef x={centerX + maxSpread + 25} y={baseY} />
            )}

            {/* Fence (stage 3+) */}
            {stage >= 3 && (
                <FenceRef x={centerX - maxSpread - 50} y={baseY} posts={3} />
            )}

            {/* Small house in the distance (stage 4+) */}
            {stage >= 4 && (
                <HouseRef x={centerX + maxSpread + 55} y={baseY} houseScale={1} />
            )}

            {/* Rocks at base */}
            {stage >= 3 && (
                <>
                    <Rock x={centerX - maxSpread - 15} y={baseY + 2} size={7} />
                    <Rock x={centerX + maxSpread + 10} y={baseY + 4} size={5} />
                </>
            )}

            {/* Second person for scale (stage 5+, tree is getting huge) */}
            {stage >= 5 && (
                <PersonRef x={centerX - maxSpread - 20} y={baseY} />
            )}

            {/* Birds flying at various heights */}
            {stage >= 3 && !isStatic && (
                <>
                    <Bird x={centerX + maxSpread * 0.6} y={foliageTopY - 30} size={7} delay={0} />
                    {stage >= 4 && <Bird x={centerX - maxSpread * 0.4} y={foliageTopY + fHeight * 0.2} size={5} delay={2000} />}
                    {stage >= 5 && <Bird x={centerX + maxSpread * 0.3} y={foliageTopY - 60} size={8} delay={4000} />}
                    {stage >= 6 && <Bird x={centerX - maxSpread * 0.6} y={foliageTopY + 10} size={6} delay={6000} />}
                </>
            )}

            {/* Clouds (stage 4+) — fixed size, positioned near treetop */}
            {stage >= 4 && (
                <>
                    <Cloud x={centerX - maxSpread * 0.7} y={foliageTopY + fHeight * 0.15} w={45} opacity={0.15} />
                    {stage >= 5 && <Cloud x={centerX + maxSpread * 0.8} y={foliageTopY - 10} w={55} opacity={0.18} />}
                    {stage >= 6 && <Cloud x={centerX - maxSpread * 0.3} y={foliageTopY - 40} w={50} opacity={0.15} />}
                    {stage >= 7 && <Cloud x={centerX + maxSpread * 0.4} y={foliageTopY - 70} w={60} opacity={0.2} />}
                </>
            )}

            {/* Level-up glow */}
            {levelUpAnim && (
                <circle cx={centerX} cy={treeTopY + trunkHeight / 2}
                    r={100 + stage * 30}
                    fill={`url(#glowGradient-${safeLevel})`}
                    opacity="0.5" className="animate-ping-slow" />
            )}

            <g className={isStatic ? '' : `animate-sway ${levelUpAnim ? 'animate-level-up-bounce' : ''}`}
                style={{ transformOrigin: `${centerX}px ${baseY}px` }}>

                {/* Roots */}
                {stage >= 3 && (
                    <>
                        <path d={`M${centerX - trunkWidth / 2 + 2} ${baseY}
                                  Q${centerX - 18 - stage * 6} ${baseY + 8}
                                   ${centerX - 28 - stage * 10} ${baseY + 3}`}
                            stroke={`url(#trunkGradient3D-${safeLevel})`}
                            strokeWidth={trunkWidth * 0.35} fill="none" strokeLinecap="round"
                            filter={isStatic ? "" : `url(#barkTexture-${safeLevel})`} />
                        <path d={`M${centerX - trunkWidth / 2 + 4} ${baseY - 2}
                                  Q${centerX - 15 - stage * 3} ${baseY + 12}
                                   ${centerX - 20 - stage * 6} ${baseY + 8}`}
                            stroke={trunkColorDark}
                            strokeWidth={trunkWidth * 0.2} fill="none" strokeLinecap="round" opacity="0.7" />
                    </>
                )}
                {stage >= 4 && (
                    <>
                        <path d={`M${centerX + trunkWidth / 2 - 2} ${baseY}
                                  Q${centerX + 18 + stage * 6} ${baseY + 8}
                                   ${centerX + 28 + stage * 10} ${baseY + 3}`}
                            stroke={`url(#trunkGradient3D-${safeLevel})`}
                            strokeWidth={trunkWidth * 0.35} fill="none" strokeLinecap="round"
                            filter={isStatic ? "" : `url(#barkTexture-${safeLevel})`} />
                        <path d={`M${centerX + trunkWidth / 2 - 4} ${baseY - 2}
                                  Q${centerX + 15 + stage * 3} ${baseY + 12}
                                   ${centerX + 20 + stage * 6} ${baseY + 8}`}
                            stroke={trunkColorDark}
                            strokeWidth={trunkWidth * 0.2} fill="none" strokeLinecap="round" opacity="0.7" />
                    </>
                )}

                {/* Main Trunk */}
                <g filter={isStatic ? "" : `url(#barkTexture-${safeLevel})`}>
                    <path d={`M${centerX - trunkWidth / 2} ${baseY}
                              L${centerX - trunkWidth * 0.18} ${foliageTopY + 15}
                              L${centerX + trunkWidth * 0.18} ${foliageTopY + 15}
                              L${centerX + trunkWidth / 2} ${baseY}
                              Z`}
                        fill={`url(#trunkGradient3D-${safeLevel})`} />
                    <ellipse cx={centerX} cy={baseY} rx={trunkWidth / 2} ry={trunkWidth / 6}
                        fill={`url(#trunkGradient3D-${safeLevel})`} />
                </g>

                {/* Bark detail */}
                {!isStatic && stage >= 3 && (
                    <g opacity="0.2">
                        {Array.from({ length: Math.min(8, Math.floor(trunkHeight / 25)) }, (_, i) => {
                            const y = baseY - 15 - i * (trunkHeight * 0.7 / 8);
                            const widthAtY = trunkWidth * (1 - (i / 10) * 0.6);
                            return (
                                <line key={`bark-${i}`}
                                    x1={centerX - widthAtY * 0.3} y1={y}
                                    x2={centerX + widthAtY * 0.25} y2={y - 3}
                                    stroke={trunkColorDark} strokeWidth="1.5" />
                            );
                        })}
                    </g>
                )}

                {/* Moss */}
                {stage >= 4 && !isStatic && (
                    <g opacity="0.4">
                        <ellipse cx={centerX - trunkWidth * 0.3} cy={baseY - 15} rx={4} ry={6} fill="#558B2F" />
                        <ellipse cx={centerX - trunkWidth * 0.25} cy={baseY - 20} rx={3} ry={4} fill="#689F38" />
                    </g>
                )}

                {/* Foliage layers */}
                <g filter={isMax ? `url(#glow-${safeLevel})` : `url(#softShadow-${safeLevel})`}>
                    {(() => {
                        const layers = [];

                        for (let i = 0; i < numLayers; i++) {
                            const layerFactor = numLayers > 1 ? i / (numLayers - 1) : 0.5;
                            const tierY = foliageBottomY - layerFactor * fHeight;
                            const isTopLayer = (i === numLayers - 1);

                            const layerWidth = maxSpread * (1 - layerFactor * 0.75) * 2;
                            const layerHeight = (fHeight / numLayers) * (isTopLayer ? 1.4 : 1.2);

                            if (i > 0 && i < numLayers && stage >= 3) {
                                layers.push(
                                    <BranchTips key={`bt-${i}`}
                                        cx={centerX} cy={tierY + layerHeight * 0.3}
                                        spread={layerWidth * 0.5} seed={safeLevel * 100 + i * 37} />
                                );
                            }

                            layers.push(
                                <PineLayer key={`layer-${i}`}
                                    cx={centerX} cy={tierY}
                                    width={layerWidth} height={layerHeight}
                                    delay={(i * 300) % 2000}
                                    seed={safeLevel * 50 + i * 17}
                                    isTop={isTopLayer}
                                    layerIndex={i} />
                            );
                        }

                        // Pine cones
                        if (stage >= 3) {
                            const numCones = Math.min(5, Math.floor((safeLevel - 10) / 4));
                            for (let i = 0; i < numCones; i++) {
                                const rng = seededRandom(safeLevel * 200 + i * 43);
                                const layerFactor = 0.1 + rng() * 0.5;
                                const cy = foliageBottomY - layerFactor * fHeight;
                                const tierSpread = maxSpread * (1 - layerFactor * 0.75);
                                const side = i % 2 === 0 ? -1 : 1;
                                const cx = centerX + side * (tierSpread * 0.7 + rng() * tierSpread * 0.2);

                                layers.push(
                                    <g key={`cone-${i}`} transform={`translate(${cx}, ${cy})`}
                                        className={isStatic ? '' : "animate-bounce-slow"}
                                        style={isStatic ? {} : { animationDelay: `${(i * 400) % 3000}ms` }}>
                                        <ellipse cx="0" cy="2" rx="4" ry="7" fill="#5D4037" transform="rotate(15)" />
                                        <ellipse cx="0" cy="2" rx="3" ry="6" fill="#795548" transform="rotate(15)" />
                                        <path d="M-2 0 Q0 -1 2 0 Q0 1 -2 0" fill="#8D6E63" opacity="0.6" />
                                        <path d="M-2 3 Q0 2 2 3 Q0 4 -2 3" fill="#8D6E63" opacity="0.5" />
                                        <path d="M0 -5 Q1 -8 3 -9" stroke="#33691E" fill="none"
                                            strokeWidth="1.2" strokeLinecap="round" />
                                    </g>
                                );
                            }
                        }

                        // Cherry blossoms
                        if (skin === 'cherry' && stage >= 3) {
                            const numBlossoms = Math.min(10, safeLevel - 8);
                            for (let i = 0; i < numBlossoms; i++) {
                                const rng = seededRandom(safeLevel * 300 + i * 29);
                                const layerFactor = rng() * 0.8;
                                const cy = foliageBottomY - layerFactor * fHeight - rng() * 15;
                                const tierSpread = maxSpread * (1 - layerFactor * 0.75);
                                const cx = centerX + (rng() - 0.5) * tierSpread * 1.6;
                                const size = 3 + rng() * 3;

                                layers.push(
                                    <g key={`blossom-${i}`} transform={`translate(${cx}, ${cy})`}
                                        className={isStatic ? '' : "animate-pulse-slow"}
                                        style={isStatic ? {} : { animationDelay: `${(i * 350) % 4000}ms` }}>
                                        {[0, 72, 144, 216, 288].map((angle, pi) => (
                                            <ellipse key={pi} cx={0} cy={-size}
                                                rx={size * 0.4} ry={size * 0.7}
                                                fill="#F8BBD0" opacity="0.8"
                                                transform={`rotate(${angle})`} />
                                        ))}
                                        <circle cx="0" cy="0" r={size * 0.25} fill="#FFE082" />
                                    </g>
                                );
                            }
                        }

                        return layers;
                    })()}
                </g>

                {/* Star on top for max level */}
                {isMax && !isStatic && (
                    <g transform={`translate(${centerX}, ${foliageTopY - 20})`} className="animate-pulse-slow">
                        <polygon points="0,-10 3,-3 10,-3 5,2 7,10 0,6 -7,10 -5,2 -10,-3 -3,-3"
                            fill="#FFD54F" stroke="#FFA000" strokeWidth="0.5" opacity="0.9" />
                    </g>
                )}
            </g>

            {/* Event overlays */}
            {eventType === 'WATER' && (
                <g transform={`translate(${centerX + 30 * scale}, ${treeTopY + trunkHeight * 0.2})`}>
                    <CloudRain size={48 * scale} color="#4FC3F7" className={isStatic ? '' : "animate-bounce"} />
                </g>
            )}
            {eventType === 'PEST' && (
                <g transform={`translate(${centerX - 40 * scale}, ${treeTopY + trunkHeight * 0.5})`}>
                    <Bug size={40 * scale} color="#E53935" className={isStatic ? '' : "animate-pulse"} />
                </g>
            )}
            {eventType === 'FERTILIZE' && (
                <g transform={`translate(${centerX - 20 * scale}, ${baseY - 40 * scale})`}>
                    <Sparkles size={40 * scale} color="#FFB74D" className={isStatic ? '' : "animate-spin-slow"} />
                </g>
            )}
        </svg>
    );
};
