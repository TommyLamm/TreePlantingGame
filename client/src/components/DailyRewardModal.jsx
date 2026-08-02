import React, { useEffect } from 'react';
import { DAILY_REWARDS } from '../constants';
import { audio } from '../utils/audio';

export function DailyRewardModal({ loginStreak, currentDayIndex, claimed, onClaim, onClose, t }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget) { audio.playClick(); onClose(); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={handleBackdrop}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <span className="text-3xl block mb-1">📅</span>
                        <h2 className="text-xl font-bold">{t('dailyRewardTitle')}</h2>
                        <p className="text-sm opacity-90 mt-1">{t('streakDays', loginStreak)}</p>
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]"></div>
                </div>

                {/* Calendar Grid */}
                <div className="p-4 bg-gray-50">
                    <div className="grid grid-cols-7 gap-2">
                        {DAILY_REWARDS.map((reward, idx) => {
                            const isPast = idx < currentDayIndex;
                            const isCurrent = idx === currentDayIndex;
                            const isFuture = idx > currentDayIndex;

                            return (
                                <div
                                    key={idx}
                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center p-1 transition-all border-2 ${
                                        isPast
                                            ? 'bg-green-50 border-green-200'
                                            : isCurrent
                                            ? claimed
                                                ? 'bg-green-50 border-green-300 shadow-md'
                                                : 'bg-amber-50 border-amber-300 shadow-lg scale-110 animate-pulse'
                                            : 'bg-gray-100 border-gray-200 opacity-60'
                                    }`}
                                >
                                    <span className="text-[10px] font-bold text-gray-400">D{idx + 1}</span>
                                    <span className="text-lg leading-none">
                                        {isPast || (isCurrent && claimed) ? '✅' : reward.icon}
                                    </span>
                                    <span className="text-[9px] font-bold text-amber-600">
                                        {reward.coins}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Current Reward Detail */}
                    <div className="mt-4 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-800">
                                    {DAILY_REWARDS[currentDayIndex]?.icon} {t('day', currentDayIndex + 1)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    💰 {t('coinsValue', DAILY_REWARDS[currentDayIndex]?.coins)}
                                    {DAILY_REWARDS[currentDayIndex]?.xp > 0 && ` + ${DAILY_REWARDS[currentDayIndex].xp} XP`}
                                </p>
                            </div>
                            {claimed ? (
                                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold">
                                    {t('claimed')} ✓
                                </span>
                            ) : (
                                <button
                                    onClick={() => { audio.playLevelUp(); onClaim(); }}
                                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                                >
                                    {t('claimReward')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-3 bg-white border-t border-gray-100 flex justify-center">
                    <button onClick={() => { audio.playClick(); onClose(); }} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">
                        {t('close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
