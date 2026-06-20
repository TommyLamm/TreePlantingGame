import React from 'react';

const companionConfig = {
    butterfly: {
        className: 'companion-butterfly',
        label: 'Butterfly companion',
        viewBox: '0 0 80 80',
        node: (
            <>
                <ellipse cx="30" cy="36" rx="17" ry="23" fill="#8CC8FF" opacity="0.9" transform="rotate(-28 30 36)" />
                <ellipse cx="50" cy="36" rx="17" ry="23" fill="#B7A4FF" opacity="0.9" transform="rotate(28 50 36)" />
                <ellipse cx="31" cy="50" rx="12" ry="15" fill="#F6B5D7" opacity="0.86" transform="rotate(25 31 50)" />
                <ellipse cx="49" cy="50" rx="12" ry="15" fill="#9ADAE3" opacity="0.86" transform="rotate(-25 49 50)" />
                <path d="M40 31 C36 40 36 54 40 65 C44 54 44 40 40 31Z" fill="#2F4665" />
                <circle cx="40" cy="28" r="5" fill="#2F4665" />
                <path d="M37 25 Q29 17 23 18" stroke="#2F4665" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M43 25 Q51 17 57 18" stroke="#2F4665" strokeWidth="2" fill="none" strokeLinecap="round" />
                <circle cx="28" cy="33" r="3" fill="#FFF7AD" opacity="0.75" />
                <circle cx="53" cy="34" r="3" fill="#FFF7AD" opacity="0.75" />
            </>
        ),
    },
    squirrel: {
        className: 'companion-squirrel',
        label: 'Squirrel companion',
        viewBox: '0 0 80 80',
        node: (
            <>
                <path d="M56 56 C72 46 66 20 50 24 C40 27 46 42 56 37 C50 45 43 51 45 61Z" fill="#9A5D30" />
                <ellipse cx="38" cy="50" rx="17" ry="18" fill="#B9783E" />
                <circle cx="32" cy="32" r="13" fill="#C78548" />
                <circle cx="25" cy="23" r="5" fill="#9A5D30" />
                <circle cx="39" cy="23" r="5" fill="#9A5D30" />
                <circle cx="36" cy="31" r="2" fill="#2B1D14" />
                <path d="M25 35 Q31 42 38 35" stroke="#6B3E24" strokeWidth="2" fill="none" strokeLinecap="round" />
                <ellipse cx="31" cy="54" rx="8" ry="11" fill="#E2B071" opacity="0.88" />
                <ellipse cx="52" cy="63" rx="7" ry="4" fill="#6B3E24" opacity="0.42" />
                <path d="M20 52 Q14 60 20 65" stroke="#8A512D" strokeWidth="5" fill="none" strokeLinecap="round" />
                <ellipse cx="49" cy="54" rx="5" ry="7" fill="#7A4A24" />
            </>
        ),
    },
    bird: {
        className: 'companion-bird',
        label: 'Bird companion',
        viewBox: '0 0 80 80',
        node: (
            <>
                <ellipse cx="40" cy="45" rx="20" ry="15" fill="#69A7D8" />
                <circle cx="55" cy="38" r="12" fill="#7FC4EA" />
                <path d="M63 38 L74 34 L65 44Z" fill="#F5A524" />
                <circle cx="58" cy="35" r="2" fill="#102A43" />
                <path d="M29 44 C18 33 10 35 8 50 C17 46 23 48 31 55Z" fill="#4E89BD" />
                <path d="M35 60 L30 70 M45 60 L49 70" stroke="#7A4A24" strokeWidth="3" strokeLinecap="round" />
                <path d="M24 70 L33 70 M44 70 L53 70" stroke="#7A4A24" strokeWidth="2" strokeLinecap="round" />
            </>
        ),
    },
    owl: {
        className: 'companion-owl',
        label: 'Owl companion',
        viewBox: '0 0 80 80',
        node: (
            <>
                <path d="M20 31 Q40 12 60 31 L55 67 Q40 75 25 67Z" fill="#76523B" />
                <path d="M24 29 L31 16 L38 29Z" fill="#5C3D2E" />
                <path d="M42 29 L49 16 L56 29Z" fill="#5C3D2E" />
                <circle cx="33" cy="39" r="10" fill="#F7E4A7" />
                <circle cx="47" cy="39" r="10" fill="#F7E4A7" />
                <circle cx="33" cy="39" r="4" fill="#161B22" />
                <circle cx="47" cy="39" r="4" fill="#161B22" />
                <path d="M40 43 L35 51 L45 51Z" fill="#F5A524" />
                <path d="M30 58 Q40 64 50 58" stroke="#4B2F22" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
        ),
    },
    deer: {
        className: 'companion-deer',
        label: 'Deer companion',
        viewBox: '0 0 96 80',
        node: (
            <>
                <ellipse cx="48" cy="51" rx="24" ry="14" fill="#B87943" />
                <circle cx="72" cy="39" r="12" fill="#C98C55" />
                <path d="M73 29 Q69 18 60 14 M74 29 Q80 18 89 14" stroke="#7A4A24" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M61 14 L56 9 M61 14 L55 17 M89 14 L94 9 M89 14 L95 17" stroke="#7A4A24" strokeWidth="2" fill="none" strokeLinecap="round" />
                <circle cx="76" cy="37" r="2" fill="#1F2933" />
                <path d="M82 42 Q88 42 91 45" stroke="#6B3E24" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M33 62 L29 75 M48 63 L47 75 M61 61 L66 75" stroke="#6B3E24" strokeWidth="4" strokeLinecap="round" />
                <circle cx="38" cy="47" r="3" fill="#F4D7B1" opacity="0.9" />
                <circle cx="50" cy="43" r="2.5" fill="#F4D7B1" opacity="0.9" />
            </>
        ),
    },
    phoenix: {
        className: 'companion-phoenix',
        label: 'Phoenix companion',
        viewBox: '0 0 80 80',
        node: (
            <>
                <path d="M40 70 C28 58 25 42 39 28 C49 39 48 57 40 70Z" fill="#FF7A1A" />
                <path d="M40 68 C35 55 36 43 44 31 C53 44 52 58 40 68Z" fill="#FFD166" opacity="0.9" />
                <path d="M35 43 C19 31 15 19 25 10 C31 22 41 27 43 43Z" fill="#F04438" />
                <path d="M44 43 C62 31 66 19 55 10 C50 22 40 27 38 43Z" fill="#FFB020" />
                <circle cx="41" cy="30" r="9" fill="#FF8F1F" />
                <path d="M48 29 L60 25 L50 36Z" fill="#FFD166" />
                <circle cx="44" cy="27" r="2" fill="#3B1D0B" />
                <path d="M31 63 Q21 70 18 77 M41 66 Q38 76 40 80 M50 63 Q61 69 64 77" stroke="#F04438" strokeWidth="4" fill="none" strokeLinecap="round" />
            </>
        ),
    },
};

export const CompanionSprite = ({ companion, isDay = true }) => {
    if (!companion) return null;

    const config = companionConfig[companion] || companionConfig.butterfly;

    return (
        <div className={`companion-sprite ${config.className} ${isDay ? 'companion-day' : 'companion-night'}`} aria-label={config.label}>
            <div className="companion-glow" />
            <svg viewBox={config.viewBox} role="img" aria-hidden="true">
                {config.node}
            </svg>
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
