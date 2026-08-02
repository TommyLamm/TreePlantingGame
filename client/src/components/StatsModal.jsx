import React, { useEffect } from 'react';
import { audio } from '../utils/audio';

export function StatsModal({ stats, onClose, t }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget) { audio.playClick(); onClose(); }
    };

    const formatNumber = (n) => Math.floor(n || 0).toLocaleString();
    const formatTime = (ms) => {
        const hours = Math.floor((ms || 0) / 3600000);
        const mins = Math.floor(((ms || 0) % 3600000) / 60000);
        return `${hours}h ${mins}m`;
    };
    const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString() : '-';

    const statItems = [
        { icon: '🌳', label: t('statLevel'), value: stats.level, color: 'green' },
        { icon: '♻️', label: t('statGeneration'), value: stats.generation || 0, color: 'purple' },
        { icon: '💰', label: t('statCoins'), value: formatNumber(stats.coins), color: 'amber' },
        { icon: '⭐', label: t('statTotalXp'), value: formatNumber(stats.totalXpEarned), color: 'blue' },
        { icon: '🪙', label: t('statTotalCoins'), value: formatNumber(stats.totalCoinsEarned), color: 'yellow' },
        { icon: '✅', label: t('statEventsResolved'), value: formatNumber(stats.totalEventsResolved), color: 'emerald' },
        { icon: '🤝', label: t('statInteractions'), value: formatNumber(stats.interactionCount), color: 'cyan' },
        { icon: '🔥', label: t('statMaxCombo'), value: stats.maxCombo || 0, color: 'orange' },
        { icon: '📅', label: t('statMaxStreak'), value: t('daysValue', stats.maxLoginStreak || 0), color: 'rose' },
        { icon: '⏱️', label: t('statPlayTime'), value: formatTime(stats.playTimeMs), color: 'indigo' },
        { icon: '📆', label: t('statJoinDate'), value: formatDate(stats.joinDate), color: 'slate' },
        { icon: '🏆', label: t('statAchievements'), value: `${(stats.achievements || []).length}`, color: 'amber' },
    ];

    const colorMap = {
        green: 'bg-green-50 border-green-100', purple: 'bg-purple-50 border-purple-100',
        amber: 'bg-amber-50 border-amber-100', blue: 'bg-blue-50 border-blue-100',
        yellow: 'bg-yellow-50 border-yellow-100', emerald: 'bg-emerald-50 border-emerald-100',
        cyan: 'bg-cyan-50 border-cyan-100', orange: 'bg-orange-50 border-orange-100',
        rose: 'bg-rose-50 border-rose-100', indigo: 'bg-indigo-50 border-indigo-100',
        slate: 'bg-slate-50 border-slate-100',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={handleBackdrop}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-2">
                        <span className="text-2xl">📊</span>
                        <h2 className="text-xl font-bold">{t('statsTitle')}</h2>
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_60%)]"></div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
                    <div className="grid grid-cols-2 gap-2">
                        {statItems.map((item, i) => (
                            <div key={i} className={`rounded-xl p-3 border shadow-sm ${colorMap[item.color] || 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{item.icon}</span>
                                    <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                                </div>
                                <p className="text-lg font-bold text-gray-800 pl-7">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
                    <button onClick={() => { audio.playClick(); onClose(); }} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">
                        {t('close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
