import React, { useEffect, useState } from 'react';
import { audio } from '../utils/audio';

export function OfflineEarningsModal({ xpEarned, coinsEarned, timeAwayMs, onClose, t }) {
    const [displayXp, setDisplayXp] = useState(0);
    const [displayCoins, setDisplayCoins] = useState(0);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Animate counting up
    useEffect(() => {
        const duration = 1500;
        const steps = 30;
        const interval = duration / steps;
        let step = 0;
        const timer = setInterval(() => {
            step++;
            const progress = step / steps;
            setDisplayXp(Math.floor(xpEarned * progress));
            setDisplayCoins(Math.floor(coinsEarned * progress));
            if (step >= steps) {
                clearInterval(timer);
                setDisplayXp(Math.floor(xpEarned));
                setDisplayCoins(Math.floor(coinsEarned));
            }
        }, interval);
        return () => clearInterval(timer);
    }, [xpEarned, coinsEarned]);

    const hours = Math.floor(timeAwayMs / 3600000);
    const minutes = Math.floor((timeAwayMs % 3600000) / 60000);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <span className="text-4xl block mb-2">🌙</span>
                        <h2 className="text-2xl font-bold">{t('welcomeBack')}</h2>
                        <p className="text-sm opacity-90 mt-1">{t('offlineEarnings')}</p>
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_60%)]"></div>
                </div>

                <div className="p-6 bg-gray-50 flex flex-col gap-4">
                    {/* Time Away */}
                    <div className="text-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('timeAway')}</span>
                        <p className="text-lg font-bold text-gray-700">
                            {hours > 0 && `${hours}${t('hours')} `}{minutes}{t('minutes')}
                        </p>
                    </div>

                    {/* Earnings */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-blue-100">
                            <span className="text-2xl block mb-1">⭐</span>
                            <span className="text-xs text-gray-400">{t('offlineXp')}</span>
                            <p className="text-xl font-bold text-blue-600">{displayXp}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-amber-100">
                            <span className="text-2xl block mb-1">💰</span>
                            <span className="text-xs text-gray-400">{t('offlineCoins')}</span>
                            <p className="text-xl font-bold text-amber-600">{displayCoins}</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex justify-center">
                    <button
                        onClick={() => { audio.playLevelUp(); onClose(); }}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95 text-lg"
                    >
                        {t('collect')} 🎉
                    </button>
                </div>
            </div>
        </div>
    );
}
