import React, { useState, useEffect } from 'react';
import { MAX_LEVEL } from '../constants';
import { CloudRain, Bug, Sparkles } from './Icons';

export const TreeVisual = ({ level, eventType }) => {
    const safeLevel = Number(level) || 1;
    const trunkBaseWidth = 14;
    const trunkHeightFactor = 16; 
    
    const trunkHeight = 100 + (safeLevel * trunkHeightFactor);
    const trunkWidth = trunkBaseWidth + (safeLevel * 2.5);
    const treeTopY = 390 - trunkHeight; 
    const centerX = 150;

    // Calculate dynamic viewBox
    // Find the absolute top of the highest leaf blob
    const absoluteTop = treeTopY - 15 - (55 + safeLevel * 2);
    
    // Ensure massive padding above the highest point so it never clips, even with filters.
    // At least -50 so the ground doesn't shift up at level 1.
    const vbY = Math.min(-50, absoluteTop - 150 - safeLevel * 3); 
    const vbH = 450 - vbY; 
    
    // Expand width dynamically to accommodate wider foliage at high levels
    const vbW = Math.max(300, 300 + safeLevel * 8); 
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
    const trunkColorMain = isMax ? '#5D4037' : '#795548';
    const trunkColorDark = '#3E2723';
    const trunkColorLight = isMax ? '#8D6E63' : '#A1887F';
    
    // Foliage colors (Base, Mid, Highlight)
    const fBase = isMax ? '#F57F17' : (safeLevel > 7 ? '#1B5E20' : '#2E7D32'); 
    const fMid = isMax ? '#FBC02D' : (safeLevel > 7 ? '#2E7D32' : '#4CAF50');
    const fHigh = isMax ? '#FFF9C4' : (safeLevel > 7 ? '#66BB6A' : '#81C784');
    const fShadow = isMax ? '#E65100' : (safeLevel > 7 ? '#003300' : '#1B5E20');

    // Helper component for 3D "Blob" leaves with organic edge
    const LeafBlob = ({ cx, cy, r, delay=0, seed=1 }) => {
        // Create organic cluster by overlapping multiple circles
        return (
            <g className="animate-bounce-slow" style={{animationDelay: `${delay}ms`}}>
                {/* Deep Ambient Occlusion Shadow */}
                <circle cx={cx} cy={cy + r*0.25} r={r*0.95} fill={fShadow} opacity="0.4" filter="blur(3px)" />
                
                {/* Main foliage with displacement texture */}
                <g filter="url(#leafTexture)">
                    <circle cx={cx} cy={cy} r={r} fill={`url(#foliageGradient-${safeLevel})`} />
                    {/* Extra small bumps for irregularity */}
                    <circle cx={cx - r*0.4} cy={cy + r*0.2} r={r*0.6} fill={`url(#foliageGradient-${safeLevel})`} />
                    <circle cx={cx + r*0.5} cy={cy - r*0.1} r={r*0.5} fill={`url(#foliageGradient-${safeLevel})`} />
                    <circle cx={cx + r*0.2} cy={cy + r*0.4} r={r*0.55} fill={`url(#foliageGradient-${safeLevel})`} />
                </g>

                {/* Inner shadow for volume */}
                <path d={`M${cx-r} ${cy} A${r} ${r} 0 0 0 ${cx+r} ${cy} A${r} ${r*0.6} 0 0 1 ${cx-r} ${cy}`} fill={fShadow} opacity="0.3" filter="blur(2px)"/>

                {/* Rim light / Specular Highlight */}
                <path d={`M${cx-r*0.9} ${cy-r*0.2} A${r} ${r} 0 0 1 ${cx+r*0.5} ${cy-r*0.9} A${r*0.8} ${r*0.8} 0 0 0 ${cx-r*0.9} ${cy-r*0.2}`} fill="white" opacity="0.2" filter="blur(1px)"/>
                
                {/* Stray Leaves for detail */}
                <circle cx={cx - r*0.8} cy={cy - r*0.7} r={r*0.15} fill={fMid} />
                <circle cx={cx + r*0.9} cy={cy + r*0.3} r={r*0.1} fill={fBase} />
            </g>
        );
    };

    // Helper for grass blades
    const Grass = ({ cx, cy, height }) => (
        <path d={`M${cx} ${cy} Q${cx - 5} ${cy - height/2} ${cx + 5} ${cy - height} Q${cx} ${cy - height/2} ${cx + 3} ${cy}`} fill="#33691E" />
    );

    if (safeLevel === 1) {
        return (
            <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full drop-shadow-2xl transition-all duration-1000">
                 <defs>
                    <radialGradient id="seedGradient" cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#A5D6A7" />
                        <stop offset="100%" stopColor="#2E7D32" />
                    </radialGradient>
                    <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FFF59D" stopOpacity="1" />
                        <stop offset="100%" stopColor="#FFF59D" stopOpacity="0" />
                    </radialGradient>
                 </defs>
                 {/* Ground mound */}
                <ellipse cx="100" cy="170" rx="50" ry="15" fill="#33691E" opacity="0.3" />
                <ellipse cx="100" cy="170" rx="30" ry="8" fill="#1B5E20" opacity="0.4" />
                
                {/* Grass details */}
                <Grass cx={70} cy={172} height={15} />
                <Grass cx={120} cy={170} height={12} />
                <Grass cx={85} cy={175} height={8} />

                {/* Level Up Glow */}
                {levelUpAnim && (
                    <circle cx="100" cy="150" r="80" fill="url(#glowGradient)" opacity="0.6" className="animate-pulse" />
                )}

                {/* Sprout */}
                <g className={`animate-sway ${levelUpAnim ? 'animate-level-up-bounce' : ''}`} style={{ transformOrigin: '100px 170px' }}>
                    <path d="M100 170 Q95 150 100 130" stroke="#558B2F" strokeWidth="4" fill="none" strokeLinecap="round" />
                    <path d="M100 130 Q80 110 65 115" stroke="#66BB6A" strokeWidth="0" fill="none" /> {/* Guide */}
                    
                    {/* Left Leaf 3D */}
                    <path d="M100 135 Q80 130 75 115 Q85 100 100 135" fill="url(#seedGradient)" filter="drop-shadow(1px 2px 2px rgba(0,0,0,0.2))" />
                    <path d="M100 135 Q80 130 75 115 Q85 100 100 135" fill="none" stroke="#2E7D32" strokeWidth="0.5" /> {/* Vein */}
                    
                    {/* Right Leaf 3D */}
                    <path d="M100 135 Q120 130 125 115 Q115 100 100 135" fill="url(#seedGradient)" filter="drop-shadow(-1px 2px 2px rgba(0,0,0,0.2))" />
                    <path d="M100 135 Q120 130 125 115 Q115 100 100 135" fill="none" stroke="#2E7D32" strokeWidth="0.5" /> {/* Vein */}
                </g>
            </svg>
        );
    }

    return (
        <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMax meet" className={`absolute inset-0 w-full h-full transition-all duration-1000 ${eventType ? 'animate-pulse' : ''}`}>
            <defs>
                <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
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

                {/* Bark Texture Filter */}
                <filter id="barkTexture">
                    <feTurbulence type="fractalNoise" baseFrequency="0.1 0.02" numOctaves="3" result="noise" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   1 0 0 0 0" in="noise" result="alphaNoise" />
                    <feComposite in="SourceGraphic" in2="alphaNoise" operator="in" result="textured" />
                    <feBlend mode="multiply" in="SourceGraphic" in2="textured" />
                </filter>

                {/* Foliage Edge Breakup Filter */}
                <filter id="leafTexture" x="-20%" y="-20%" width="140%" height="140%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
                </filter>

                {/* 3D Cylindrical Trunk Gradient */}
                <linearGradient id="trunkGradient3D" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#281815" />
                    <stop offset="15%" stopColor={trunkColorDark} />
                    <stop offset="30%" stopColor={trunkColorMain} />
                    <stop offset="45%" stopColor={trunkColorLight} /> {/* Highlight */}
                    <stop offset="70%" stopColor={trunkColorMain} />
                    <stop offset="90%" stopColor={trunkColorDark} />
                    <stop offset="100%" stopColor="#1a0f0d" />
                </linearGradient>

                {/* 3D Spherical Foliage Gradient */}
                <radialGradient id={`foliageGradient-${safeLevel}`} cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor={fHigh} />
                    <stop offset="40%" stopColor={fMid} />
                    <stop offset="85%" stopColor={fBase} />
                    <stop offset="100%" stopColor={fShadow} />
                </radialGradient>

                <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFF59D" stopOpacity="1" />
                    <stop offset="100%" stopColor="#FFF59D" stopOpacity="0" />
                </radialGradient>
                
                {/* Max Level Glow */}
                 {isMax && (<filter id="glow"><feGaussianBlur stdDeviation="6" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>)}
            </defs>

            {/* Ground Plane (Perspective) */}
            <ellipse cx={centerX} cy="390" rx={80 + safeLevel * 6} ry={20} fill="#1B5E20" opacity="0.6" filter="blur(4px)" />
            <ellipse cx={centerX} cy="390" rx={40 + safeLevel * 3} ry={10} fill="#000" opacity="0.3" filter="blur(3px)" />
            
            {/* Ground grass details */}
            <g opacity="0.8">
                <Grass cx={centerX - 40} cy={395} height={15} />
                <Grass cx={centerX + 35} cy={392} height={12} />
                <Grass cx={centerX - 20} cy={400} height={18} />
                <Grass cx={centerX + 20} cy={398} height={10} />
                {safeLevel > 3 && <Grass cx={centerX - 60} cy={385} height={10} />}
                {safeLevel > 3 && <Grass cx={centerX + 55} cy={388} height={14} />}
            </g>

            {/* Level Up Glow Aura */}
            {levelUpAnim && (
                <circle cx={centerX} cy={treeTopY + trunkHeight/2} r={150 + safeLevel*5} fill="url(#glowGradient)" opacity="0.5" className="animate-ping-slow" />
            )}

            <g className={`animate-sway ${levelUpAnim ? 'animate-level-up-bounce' : ''}`} style={{ transformOrigin: `${centerX}px 390px` }}>
                {/* Background Roots (3D) */}
                {safeLevel >= 4 && (
                    <path d={`M${centerX - trunkWidth/2 + 5} 390 Q${centerX - 30 - safeLevel} 400 ${centerX - 50 - safeLevel*2} 395`} stroke="url(#trunkGradient3D)" strokeWidth={trunkWidth * 0.4} fill="none" strokeLinecap="round" filter="url(#barkTexture)" />
                )}
                 {safeLevel >= 5 && (
                    <path d={`M${centerX + trunkWidth/2 - 5} 390 Q${centerX + 30 + safeLevel} 400 ${centerX + 50 + safeLevel*2} 395`} stroke="url(#trunkGradient3D)" strokeWidth={trunkWidth * 0.4} fill="none" strokeLinecap="round" filter="url(#barkTexture)" />
                )}

                {/* Main Trunk with Organic Curves and Texture */}
                <g filter="url(#barkTexture)">
                    <path d={`M${centerX - trunkWidth/2} 390 
                              C${centerX - trunkWidth/2 - 5} ${390 - trunkHeight*0.3} ${centerX - trunkWidth/2 + (safeLevel*0.4)} ${treeTopY + trunkHeight*0.3} ${centerX - trunkWidth/2 + (safeLevel * 0.8)} ${treeTopY}
                              L${centerX + trunkWidth/2 - (safeLevel * 0.8)} ${treeTopY}
                              C${centerX + trunkWidth/2 - (safeLevel*0.4)} ${treeTopY + trunkHeight*0.3} ${centerX + trunkWidth/2 + 5} ${390 - trunkHeight*0.3} ${centerX + trunkWidth/2} 390
                              Z`} 
                          fill="url(#trunkGradient3D)" />
                    {/* Bottom Cap */}
                    <ellipse cx={centerX} cy="390" rx={trunkWidth/2} ry={trunkWidth/6} fill="url(#trunkGradient3D)" />
                </g>

                {/* Vines on trunk for higher levels */}
                {safeLevel >= 6 && (
                    <path d={`M${centerX - trunkWidth/2 + 2} 390 Q${centerX + trunkWidth/2} ${390 - trunkHeight*0.25} ${centerX - trunkWidth/2 + 4} ${390 - trunkHeight*0.5} T${centerX} ${390 - trunkHeight*0.8}`} stroke="#33691E" strokeWidth="2" fill="none" opacity="0.8" />
                )}
                {safeLevel >= 8 && (
                    <path d={`M${centerX + trunkWidth/2 - 2} 390 Q${centerX - trunkWidth/2} ${390 - trunkHeight*0.3} ${centerX + trunkWidth/2 - 3} ${390 - trunkHeight*0.6} T${centerX + trunkWidth*0.2} ${390 - trunkHeight*0.9}`} stroke="#558B2F" strokeWidth="1.5" fill="none" opacity="0.7" />
                )}

                {/* Branches - Organic Curves */}
                <g filter="url(#barkTexture)">
                    {safeLevel >= 2 && (
                         <path d={`M${centerX} ${treeTopY + trunkHeight*0.15} C${centerX - trunkWidth} ${treeTopY + trunkHeight*0.1} ${centerX - 30} ${treeTopY + 10} ${centerX - 45 - safeLevel*1.5} ${treeTopY - 15}`} stroke="url(#trunkGradient3D)" strokeWidth={trunkWidth * 0.35} fill="none" strokeLinecap="round" />
                    )}
                    {safeLevel >= 3 && (
                         <path d={`M${centerX} ${treeTopY + trunkHeight*0.2} C${centerX + trunkWidth} ${treeTopY + trunkHeight*0.1} ${centerX + 35} ${treeTopY + 5} ${centerX + 50 + safeLevel*1.5} ${treeTopY - 20}`} stroke="url(#trunkGradient3D)" strokeWidth={trunkWidth * 0.35} fill="none" strokeLinecap="round" />
                    )}
                    {safeLevel >= 5 && (
                         <path d={`M${centerX - trunkWidth*0.2} ${treeTopY + trunkHeight*0.3} Q${centerX - 60} ${treeTopY + 20} ${centerX - 70 - safeLevel} ${treeTopY + 10}`} stroke="url(#trunkGradient3D)" strokeWidth={trunkWidth * 0.25} fill="none" strokeLinecap="round" />
                    )}
                    {safeLevel >= 7 && (
                         <path d={`M${centerX + trunkWidth*0.2} ${treeTopY + trunkHeight*0.4} Q${centerX + 70} ${treeTopY + 30} ${centerX + 80 + safeLevel} ${treeTopY + 20}`} stroke="url(#trunkGradient3D)" strokeWidth={trunkWidth * 0.25} fill="none" strokeLinecap="round" />
                    )}
                </g>

                {/* Volumetric Foliage Clusters */}
                <g filter={isMax ? "url(#glow)" : "url(#softShadow)"}>
                    
                    {/* Back Fillers (Level 8+) */}
                    {safeLevel >= 8 && (
                        <>
                        <LeafBlob cx={centerX - 55} cy={treeTopY - 20} r={35 + safeLevel} delay={1200} seed={2} />
                        <LeafBlob cx={centerX + 60} cy={treeTopY - 15} r={35 + safeLevel} delay={1300} seed={3} />
                        </>
                    )}

                     {/* Mid-level Depth (Level 6+) */}
                    {safeLevel >= 6 && (
                        <>
                        <LeafBlob cx={centerX - 30} cy={treeTopY - 45} r={45 + safeLevel} delay={600} seed={4} />
                        <LeafBlob cx={centerX + 35} cy={treeTopY - 40} r={42 + safeLevel} delay={800} seed={5} />
                        </>
                    )}

                    {/* Lower Sides (Level 4+) */}
                    {safeLevel >= 4 && (
                        <>
                        <LeafBlob cx={centerX - 45 - safeLevel} cy={treeTopY + 10} r={40 + safeLevel} delay={200} seed={6} />
                        <LeafBlob cx={centerX + 45 + safeLevel} cy={treeTopY + 5} r={40 + safeLevel} delay={400} seed={7} />
                        </>
                    )}
                    
                    {/* Main Core (Level 2+) */}
                    {safeLevel >= 2 && <LeafBlob cx={centerX} cy={treeTopY - 15} r={55 + safeLevel*2} delay={0} seed={1} />}
                    
                    {/* Front Overlap (Level 8+) */}
                    {safeLevel >= 8 && (
                        <LeafBlob cx={centerX} cy={treeTopY + 15} r={40} delay={1000} seed={8} />
                    )}

                    {/* Fruits / Flowers / Decorations */}
                    {safeLevel >= 5 && safeLevel < MAX_LEVEL && (
                        <>
                        {/* Apple/Fruit with highlight */}
                        <g transform={`translate(${centerX - 35}, ${treeTopY - 10})`} className="animate-ping-slow">
                            <circle cx="0" cy="0" r="6" fill="#E91E63" />
                            <circle cx="-2" cy="-2" r="2" fill="#F48FB1" />
                            <path d="M0 -6 Q2 -10 5 -8" stroke="#1B5E20" fill="none" strokeWidth="1.5" />
                        </g>

                        <g transform={`translate(${centerX + 40}, ${treeTopY + 5})`} className="animate-ping-slow" style={{animationDelay: '1s'}}>
                            <circle cx="0" cy="0" r="7" fill="#E91E63" />
                            <circle cx="-2" cy="-2" r="2" fill="#F48FB1" />
                            <path d="M0 -7 Q2 -11 5 -9" stroke="#1B5E20" fill="none" strokeWidth="1.5" />
                        </g>

                        <g transform={`translate(${centerX + 15}, ${treeTopY - 45})`} className="animate-ping-slow" style={{animationDelay: '2s'}}>
                            <circle cx="0" cy="0" r="5" fill="#E91E63" />
                            <circle cx="-1" cy="-1" r="1.5" fill="#F48FB1" />
                            <path d="M0 -5 Q2 -8 4 -6" stroke="#1B5E20" fill="none" strokeWidth="1" />
                        </g>
                        </>
                    )}
                </g>
            </g>

            {/* Events Overlay */}
            {eventType === 'WATER' && (<g transform={`translate(${centerX + 30 * scale}, ${treeTopY + trunkHeight * 0.2})`}><CloudRain size={48 * scale} color="#4FC3F7" className="animate-bounce" /></g>)}
            {eventType === 'PEST' && (<g transform={`translate(${centerX - 40 * scale}, ${treeTopY + trunkHeight * 0.5})`}><Bug size={40 * scale} color="#E53935" className="animate-pulse" /></g>)}
            {eventType === 'FERTILIZE' && (<g transform={`translate(${centerX - 20 * scale}, ${390 - 40 * scale})`}><Sparkles size={40 * scale} color="#FFB74D" className="animate-spin-slow" /></g>)}
        </svg>
    );
};
