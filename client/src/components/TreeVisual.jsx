import React, { useState, useEffect } from 'react';
import { MAX_LEVEL } from '../constants';
import { CloudRain, Bug, Sparkles } from './Icons';

export const TreeVisual = ({ level, eventType, skin, isStatic = false }) => {
    const safeLevel = Number(level) || 1;
    const centerX = 150;
    const baseY = 390;

    // 1. Stage Calculation
    let stage = 1;
    if (safeLevel >= 5 && safeLevel <= 11) stage = 2; // Sapling (1 layer)
    else if (safeLevel >= 12 && safeLevel <= 20) stage = 3; // Young Pine (2-3 layers)
    else if (safeLevel >= 21) stage = 4; // Mature Pine (4-5 layers)

    // 2. Trunk & Geometry Calculation based on Stage
    const trunkBaseWidth = 14;
    let trunkHeightFactor, trunkWidthFactor, numLayers, maxSpread, fHeightFactor;

    if (stage === 1) {
        trunkHeightFactor = 0; // No trunk
        trunkWidthFactor = 0;
        numLayers = 0;
        maxSpread = 0;
        fHeightFactor = 0;
    } else if (stage === 2) {
        trunkHeightFactor = 10 + (safeLevel - 4) * 5; 
        trunkWidthFactor = 1 + (safeLevel - 4) * 0.5;
        numLayers = 1;
        maxSpread = 40 + (safeLevel - 4) * 2;
        fHeightFactor = 0.4;
    } else if (stage === 3) {
        trunkHeightFactor = 45 + (safeLevel - 11) * 8;
        trunkWidthFactor = 4.5 + (safeLevel - 11) * 0.8;
        numLayers = 2 + Math.floor((safeLevel - 12) / 4); // 2 or 3 layers
        maxSpread = 60 + (safeLevel - 11) * 4;
        fHeightFactor = 0.5;
    } else {
        trunkHeightFactor = 117 + (safeLevel - 20) * 12;
        trunkWidthFactor = 11.7 + (safeLevel - 20) * 1;
        numLayers = 4 + Math.floor((safeLevel - 21) / 5); // 4 or 5 layers
        maxSpread = 96 + (safeLevel - 20) * 5;
        fHeightFactor = 0.65;
    }

    const trunkHeight = stage === 1 ? 0 : 50 + trunkHeightFactor;
    const trunkWidth = stage === 1 ? 0 : trunkBaseWidth + trunkWidthFactor;
    const treeTopY = baseY - trunkHeight;

    const foliageBottomY = stage === 1 ? baseY : treeTopY + trunkHeight * fHeightFactor;
    const foliageTopY = stage === 1 ? baseY - 30 : treeTopY - 40 - (stage * 15);
    const fHeight = stage === 1 ? 0 : foliageBottomY - foliageTopY;
    const baseR = stage === 1 ? 0 : 30 + stage * 10;
    const topR = baseR * 0.5;

    // 3. Dynamic viewBox
    const absoluteTop = stage === 1 ? baseY - 50 : foliageTopY - topR - 20;
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

    if (skin === 'cherry') {
        fBase = '#D81B60';
        fMid = '#F06292';
        fHigh = '#F8BBD0';
        fShadow = '#880E4F';
    }

    // Tiered Leaf Blob - Represents a whole "chunk" of pine needles
    const LeafBlob = ({ cx, cy, r, delay=0, seed=1, isTop=false }) => {
        return (
            <g className={isStatic ? '' : "animate-bounce-slow"} style={isStatic ? {} : {animationDelay: `${delay}ms`}}>
                {/* Shadow */}
                <ellipse cx={cx} cy={cy + r*0.3} rx={r*1.1} ry={r*0.7} fill={fShadow} opacity="0.5" filter={isStatic ? "" : "blur(4px)"} />
                
                {/* Main Body */}
                <g filter={isStatic ? "" : `url(#leafTexture-${safeLevel})`}>
                    <ellipse cx={cx} cy={cy} rx={r} ry={r*0.6} fill={`url(#foliageGradient-${safeLevel})`} />
                    {/* Drooping edges (Pine characteristic) */}
                    <circle cx={cx - r*0.7} cy={cy + r*0.3} r={r*0.4} fill={`url(#foliageGradient-${safeLevel})`} />
                    <circle cx={cx + r*0.7} cy={cy + r*0.3} r={r*0.4} fill={`url(#foliageGradient-${safeLevel})`} />
                    {!isTop && <circle cx={cx} cy={cy + r*0.4} r={r*0.5} fill={`url(#foliageGradient-${safeLevel})`} />}
                    {isTop && <path d={`M${cx-r*0.5} ${cy} L${cx} ${cy-r} L${cx+r*0.5} ${cy} Z`} fill={`url(#foliageGradient-${safeLevel})`} />}
                </g>

                {/* Inner shadow/highlight for depth */}
                <path d={`M${cx-r*0.8} ${cy} Q${cx} ${cy+r*0.5} ${cx+r*0.8} ${cy}`} fill="none" stroke={fShadow} strokeWidth={r*0.3} opacity="0.4" filter={isStatic ? "" : "blur(2px)"}/>
                <path d={`M${cx-r*0.6} ${cy-r*0.3} Q${cx} ${cy-r*0.6} ${cx+r*0.6} ${cy-r*0.3}`} fill="none" stroke="#A5D6A7" strokeWidth={r*0.15} opacity="0.2" filter={isStatic ? "" : "blur(1px)"}/>
            </g>
        );
    };

    const Grass = ({ cx, cy, height }) => (
        <path d={`M${cx} ${cy} Q${cx - 5} ${cy - height/2} ${cx + 5} ${cy - height} Q${cx} ${cy - height/2} ${cx + 3} ${cy}`} fill="#33691E" />
    );

    if (stage === 1) {
        // SPROUT STAGE (Level 1-4)
        const sScale = 1 + (safeLevel - 1) * 0.3; // 1.0, 1.3, 1.6, 1.9
        return (
            <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMax meet" className={`absolute inset-0 w-full h-full transition-all duration-1000 ${isStatic ? '' : 'drop-shadow-2xl'}`}>
                 <defs>
                    <radialGradient id={`seedGradient-${safeLevel}`} cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#A5D6A7" />
                        <stop offset="100%" stopColor="#2E7D32" />
                    </radialGradient>
                    {!isStatic && (
                        <radialGradient id={`glowGradient-${safeLevel}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#FFF59D" stopOpacity="1" />
                            <stop offset="100%" stopColor="#FFF59D" stopOpacity="0" />
                        </radialGradient>
                    )}
                 </defs>
                <ellipse cx={centerX} cy={baseY} rx={40 + safeLevel*5} ry={12} fill="#33691E" opacity="0.4" />
                <ellipse cx={centerX} cy={baseY} rx={20 + safeLevel*3} ry={6} fill="#1B5E20" opacity="0.5" />
                
                <Grass cx={centerX-30} cy={baseY+2} height={15} />
                <Grass cx={centerX+20} cy={baseY} height={12} />
                <Grass cx={centerX-15} cy={baseY+5} height={8} />

                {!isStatic && levelUpAnim && (
                    <circle cx={centerX} cy={baseY-20} r={60} fill={`url(#glowGradient-${safeLevel})`} opacity="0.6" className="animate-pulse" />
                )}

                <g className={isStatic ? '' : `animate-sway ${levelUpAnim ? 'animate-level-up-bounce' : ''}`} style={{ transformOrigin: `${centerX}px ${baseY}px` }}>
                    {/* Stem */}
                    <path d={`M${centerX} ${baseY} Q${centerX-5*sScale} ${baseY-20*sScale} ${centerX} ${baseY-40*sScale}`} stroke="#558B2F" strokeWidth={3*sScale} fill="none" strokeLinecap="round" />
                    
                    {/* Left Leaf */}
                    <path d={`M${centerX} ${baseY-35*sScale} Q${centerX-20*sScale} ${baseY-40*sScale} ${centerX-25*sScale} ${baseY-55*sScale} Q${centerX-15*sScale} ${baseY-70*sScale} ${centerX} ${baseY-35*sScale}`} fill={`url(#seedGradient-${safeLevel})`} filter={isStatic ? "" : "drop-shadow(1px 2px 2px rgba(0,0,0,0.2))"} />
                    <path d={`M${centerX} ${baseY-35*sScale} Q${centerX-20*sScale} ${baseY-40*sScale} ${centerX-25*sScale} ${baseY-55*sScale} Q${centerX-15*sScale} ${baseY-70*sScale} ${centerX} ${baseY-35*sScale}`} fill="none" stroke="#2E7D32" strokeWidth={0.5*sScale} /> 
                    
                    {/* Right Leaf */}
                    <path d={`M${centerX} ${baseY-35*sScale} Q${centerX+20*sScale} ${baseY-40*sScale} ${centerX+25*sScale} ${baseY-55*sScale} Q${centerX+15*sScale} ${baseY-70*sScale} ${centerX} ${baseY-35*sScale}`} fill={`url(#seedGradient-${safeLevel})`} filter={isStatic ? "" : "drop-shadow(-1px 2px 2px rgba(0,0,0,0.2))"} />
                    <path d={`M${centerX} ${baseY-35*sScale} Q${centerX+20*sScale} ${baseY-40*sScale} ${centerX+25*sScale} ${baseY-55*sScale} Q${centerX+15*sScale} ${baseY-70*sScale} ${centerX} ${baseY-35*sScale}`} fill="none" stroke="#2E7D32" strokeWidth={0.5*sScale} /> 
                </g>
            </svg>
        );
    }

    return (
        <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMax meet" className={`absolute inset-0 w-full h-full transition-all duration-1000 ${eventType && !isStatic ? 'animate-pulse' : ''}`}>
            <defs>
                <filter id={`softShadow-${safeLevel}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
                    <feOffset dx="0" dy="5" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.3"/>
                    </feComponentTransfer>
                    <feMerge> 
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/> 
                    </feMerge>
                </filter>

                {!isStatic && (
                    <>
                        <filter id={`barkTexture-${safeLevel}`}>
                            <feTurbulence type="fractalNoise" baseFrequency="0.1 0.05" numOctaves="2" result="noise" />
                            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   1 0 0 0 0" in="noise" result="alphaNoise" />
                            <feComposite in="SourceGraphic" in2="alphaNoise" operator="in" result="textured" />
                            <feBlend mode="multiply" in="SourceGraphic" in2="textured" />
                        </filter>

                        <filter id={`leafTexture-${safeLevel}`} x="-20%" y="-20%" width="140%" height="140%">
                            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                            <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                        
                        {isMax && (<filter id={`glow-${safeLevel}`}><feGaussianBlur stdDeviation="6" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>)}
                    </>
                )}

                <linearGradient id={`trunkGradient3D-${safeLevel}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#281815" />
                    <stop offset="15%" stopColor={trunkColorDark} />
                    <stop offset="30%" stopColor={trunkColorMain} />
                    <stop offset="45%" stopColor={trunkColorLight} />
                    <stop offset="70%" stopColor={trunkColorMain} />
                    <stop offset="90%" stopColor={trunkColorDark} />
                    <stop offset="100%" stopColor="#1a0f0d" />
                </linearGradient>

                <radialGradient id={`foliageGradient-${safeLevel}`} cx="40%" cy="30%" r="60%">
                    <stop offset="0%" stopColor={fHigh} />
                    <stop offset="40%" stopColor={fMid} />
                    <stop offset="85%" stopColor={fBase} />
                    <stop offset="100%" stopColor={fShadow} />
                </radialGradient>

                {!isStatic && (
                    <radialGradient id={`glowGradient-${safeLevel}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FFF59D" stopOpacity="1" />
                        <stop offset="100%" stopColor="#FFF59D" stopOpacity="0" />
                    </radialGradient>
                )}
            </defs>

            <ellipse cx={centerX} cy={baseY} rx={60 + stage * 15} ry={15} fill="#1B5E20" opacity="0.6" filter={isStatic ? "" : "blur(4px)"} />
            <ellipse cx={centerX} cy={baseY} rx={30 + stage * 8} ry={8} fill="#000" opacity="0.3" filter={isStatic ? "" : "blur(3px)"} />
            
            <g opacity="0.8">
                <Grass cx={centerX - 40} cy={baseY+5} height={15} />
                <Grass cx={centerX + 35} cy={baseY+2} height={12} />
                <Grass cx={centerX - 20} cy={baseY+10} height={18} />
                <Grass cx={centerX + 20} cy={baseY+8} height={10} />
                {stage >= 3 && <Grass cx={centerX - 60} cy={baseY-5} height={10} />}
                {stage >= 3 && <Grass cx={centerX + 55} cy={baseY-2} height={14} />}
            </g>

            {levelUpAnim && (
                <circle cx={centerX} cy={treeTopY + trunkHeight/2} r={100 + stage*30} fill={`url(#glowGradient-${safeLevel})`} opacity="0.5" className="animate-ping-slow" />
            )}

            <g className={isStatic ? '' : `animate-sway ${levelUpAnim ? 'animate-level-up-bounce' : ''}`} style={{ transformOrigin: `${centerX}px ${baseY}px` }}>
                
                {/* Roots */}
                {stage >= 3 && (
                    <path d={`M${centerX - trunkWidth/2 + 2} ${baseY} Q${centerX - 20 - stage*5} ${baseY+10} ${centerX - 30 - stage*10} ${baseY+5}`} stroke={`url(#trunkGradient3D-${safeLevel})`} strokeWidth={trunkWidth * 0.4} fill="none" strokeLinecap="round" filter={isStatic?"":`url(#barkTexture-${safeLevel})`} />
                )}
                 {stage >= 4 && (
                    <path d={`M${centerX + trunkWidth/2 - 2} ${baseY} Q${centerX + 20 + stage*5} ${baseY+10} ${centerX + 30 + stage*10} ${baseY+5}`} stroke={`url(#trunkGradient3D-${safeLevel})`} strokeWidth={trunkWidth * 0.4} fill="none" strokeLinecap="round" filter={isStatic?"":`url(#barkTexture-${safeLevel})`} />
                )}

                {/* Main Trunk (Straight for Pine Tree) */}
                <g filter={isStatic?"":`url(#barkTexture-${safeLevel})`}>
                    <path d={`M${centerX - trunkWidth/2} ${baseY} 
                              L${centerX - trunkWidth/2 + (stage*0.8)} ${foliageTopY}
                              L${centerX + trunkWidth/2 - (stage*0.8)} ${foliageTopY}
                              L${centerX + trunkWidth/2} ${baseY}
                              Z`} 
                          fill={`url(#trunkGradient3D-${safeLevel})`} />
                    {/* Bottom Cap */}
                    <ellipse cx={centerX} cy={baseY} rx={trunkWidth/2} ry={trunkWidth/6} fill={`url(#trunkGradient3D-${safeLevel})`} />
                </g>

                {/* Tiered Foliage Clusters - Pine Shape */}
                <g filter={isMax ? `url(#glow-${safeLevel})` : `url(#softShadow-${safeLevel})`}>
                    {(() => {
                        const tiers = [];
                        
                        // Render layers from bottom to top (0 is bottom)
                        for (let i = 0; i < numLayers; i++) {
                            const layerFactor = numLayers > 1 ? i / (numLayers - 1) : 0.5; // 0 to 1
                            
                            // Calculate Y position for this tier
                            const tierY = foliageBottomY - layerFactor * fHeight;
                            
                            // Tier width tapers towards top
                            const tierSpread = maxSpread * (1 - layerFactor * 0.8);
                            
                            // Base radius for blobs in this tier
                            const r = baseR * (1 - layerFactor * 0.4);
                            
                            // How many blobs per tier? Bottom needs more, top needs fewer.
                            const blobsInTier = Math.max(1, Math.floor(tierSpread / (r * 0.8)));
                            
                            const isTopLayer = (i === numLayers - 1);
                            
                            // If only 1 blob, center it. Otherwise distribute.
                            if (blobsInTier === 1 || isTopLayer) {
                                tiers.push(<LeafBlob key={`tier-${i}-c`} cx={centerX} cy={tierY - r*0.5} r={r*1.2} delay={(i*200)%2000} seed={i} isTop={isTopLayer} />);
                            } else {
                                // Center blob
                                tiers.push(<LeafBlob key={`tier-${i}-center`} cx={centerX} cy={tierY - r*0.2} r={r} delay={(i*200)%2000} seed={i*10} />);
                                
                                // Side blobs
                                const sideCount = Math.floor(blobsInTier / 2);
                                for(let s=1; s<=sideCount; s++) {
                                    const offset = (s / sideCount) * tierSpread;
                                    // Side blobs droop slightly lower
                                    const sideY = tierY + (offset * 0.3);
                                    const sideR = r * 0.9;
                                    tiers.push(<LeafBlob key={`tier-${i}-L${s}`} cx={centerX - offset} cy={sideY} r={sideR} delay={(i*200 + s*100)%2000} seed={i*10+s} />);
                                    tiers.push(<LeafBlob key={`tier-${i}-R${s}`} cx={centerX + offset} cy={sideY} r={sideR} delay={(i*200 + s*150)%2000} seed={i*20+s} />);
                                }
                            }
                        }
                        
                        // Fruits (Only in Stage 3 and 4)
                        if (stage >= 3) {
                            const numFruits = Math.floor((safeLevel - 10) / 2);
                            for (let i = 0; i < numFruits; i++) {
                                const seed = (i * 37) % 100;
                                const layerFactor = 0.1 + (seed / 100) * 0.7; // Avoid top and absolute bottom
                                
                                const cy = foliageBottomY - layerFactor * fHeight;
                                const tierSpread = maxSpread * (1 - layerFactor * 0.8);
                                
                                const isLeft = (i % 2 === 0);
                                // Place fruit on the outer contour
                                const cx = centerX + (isLeft ? -1 : 1) * (tierSpread - 5 + (seed % 15));
                                
                                tiers.push(
                                    <g key={`fruit-dyn-${i}`} transform={`translate(${cx}, ${cy})`} className={isStatic ? '' : "animate-ping-slow"} style={isStatic ? {} : {animationDelay: `${(i*300)%3000}ms`}}>
                                        <circle cx="0" cy="0" r="6" fill="#E91E63" />
                                        <circle cx="-2" cy="-2" r="2" fill="#F48FB1" />
                                        <path d="M0 -6 Q2 -10 5 -8" stroke="#1B5E20" fill="none" strokeWidth="1.5" />
                                    </g>
                                );
                            }
                        }
                        return tiers;
                    })()}
                </g>
            </g>

            {eventType === 'WATER' && (<g transform={`translate(${centerX + 30 * scale}, ${treeTopY + trunkHeight * 0.2})`}><CloudRain size={48 * scale} color="#4FC3F7" className={isStatic ? '' : "animate-bounce"} /></g>)}
            {eventType === 'PEST' && (<g transform={`translate(${centerX - 40 * scale}, ${treeTopY + trunkHeight * 0.5})`}><Bug size={40 * scale} color="#E53935" className={isStatic ? '' : "animate-pulse"} /></g>)}
            {eventType === 'FERTILIZE' && (<g transform={`translate(${centerX - 20 * scale}, ${baseY - 40 * scale})`}><Sparkles size={40 * scale} color="#FFB74D" className={isStatic ? '' : "animate-spin-slow"} /></g>)}
        </svg>
    );
};
