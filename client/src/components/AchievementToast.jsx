import React, { useEffect, useState } from 'react';

export const AchievementToast = ({ achievement, t, onDone }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onDone, 500);
        }, 3000);
        return () => clearTimeout(timer);
    }, [onDone]);

    return (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] transition-all duration-500 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
        }`}>
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-yellow-300">
                <span className="text-2xl">{achievement.icon}</span>
                <div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                        {t('achievementUnlocked')}
                    </div>
                    <div className="font-bold text-lg">
                        {t(achievement.nameKey)}
                    </div>
                </div>
            </div>
        </div>
    );
};
