import React, { useMemo } from 'react';

export const Particles = ({ isDay }) => {
    // Generate a fixed number of particles
    const particles = useMemo(() => {
        const items = [];
        const count = isDay ? 15 : 25; // More fireflies than leaves
        for (let i = 0; i < count; i++) {
            items.push({
                id: i,
                left: `${Math.random() * 100}%`,
                top: isDay ? `${Math.random() * -100}%` : `${Math.random() * 100}%`, // Leaves start above, fireflies randomly
                animationDuration: `${(Math.random() * 5) + 8}s`, // 8s to 13s
                animationDelay: `${Math.random() * 5}s`,
                size: isDay ? (Math.random() * 10 + 10) : (Math.random() * 3 + 2), // Leaves are bigger
                opacity: Math.random() * 0.5 + 0.3
            });
        }
        return items;
    }, [isDay]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {particles.map((p) => (
                isDay ? (
                    // Leaf
                    <div
                        key={`leaf-${p.id}`}
                        className="absolute bg-green-500/40 rounded-full animate-fall"
                        style={{
                            left: p.left,
                            top: p.top,
                            width: `${p.size}px`,
                            height: `${p.size * 0.6}px`,
                            borderRadius: '50% 0 50% 0', // Leaf shape
                            animationDuration: p.animationDuration,
                            animationDelay: p.animationDelay,
                            opacity: p.opacity
                        }}
                    />
                ) : (
                    // Firefly
                    <div
                        key={`firefly-${p.id}`}
                        className="absolute bg-yellow-200 rounded-full blur-[1px] animate-float shadow-[0_0_8px_2px_rgba(253,224,71,0.6)]"
                        style={{
                            left: p.left,
                            top: p.top,
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            animationDuration: p.animationDuration,
                            animationDelay: p.animationDelay,
                            opacity: p.opacity
                        }}
                    />
                )
            ))}
        </div>
    );
};
