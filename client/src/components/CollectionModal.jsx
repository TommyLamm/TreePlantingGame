import React, { useState, useEffect } from 'react';
import { MILESTONES, ACHIEVEMENT_DEFS } from '../constants';
import { BookOpen, Lock, X } from './Icons';
import { TreeVisual } from './TreeVisual';
import { audio } from '../utils/audio';

export const CollectionModal = ({ currentLevel, achievements = [], onClose, t }) => {
    const [tab, setTab] = useState('milestones'); // 'milestones' or 'achievements'

    // ESC close
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget) { audio.playClick(); onClose(); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={handleBackdrop}>
            <div className="bg-white/95 w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                        <BookOpen className="text-green-600" /> {t('collection')}
                    </h2>
                    <button onClick={() => { audio.playClick(); onClose(); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-white">
                    <button
                        onClick={() => setTab('milestones')}
                        className={`flex-1 py-3 text-sm font-bold transition-all ${
                            tab === 'milestones'
                                ? 'text-green-700 border-b-2 border-green-500 bg-green-50'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        🌿 {t('milestones')}
                    </button>
                    <button
                        onClick={() => setTab('achievements')}
                        className={`flex-1 py-3 text-sm font-bold transition-all ${
                            tab === 'achievements'
                                ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        🏆 {t('achievements')}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {tab === 'milestones' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {MILESTONES.map((ms) => {
                                const isUnlocked = currentLevel >= ms.level;
                                return (
                                    <div key={ms.level} className={`aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-between p-4 transition-all duration-500 ${
                                        isUnlocked
                                            ? 'bg-white border-green-100 shadow-sm hover:shadow-md hover:border-green-300'
                                            : 'bg-gray-100 border-gray-200 opacity-70'
                                    }`}>
                                        <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                                            {t(ms.nameKey)}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            {t('level')} {ms.level}+
                                        </div>

                                        <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden rounded-xl">
                                            {isUnlocked ? (
                                                <div className="w-full h-full transform scale-90">
                                                    <TreeVisual level={ms.level} eventType={null} isStatic={true} />
                                                </div>
                                            ) : (
                                                <div className="text-gray-300">
                                                    <Lock size={48} />
                                                </div>
                                            )}
                                        </div>

                                        <div className={`mt-2 text-sm font-semibold px-3 py-1 rounded-full text-center w-full ${
                                            isUnlocked ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                                        }`}>
                                            {isUnlocked ? t('unlocked') : t('locked')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ACHIEVEMENT_DEFS.map((ach) => {
                                const isUnlocked = achievements.includes(ach.id);
                                return (
                                    <div key={ach.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                                        isUnlocked
                                            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-sm'
                                            : 'bg-gray-100 border-gray-200 opacity-60'
                                    }`}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                                            isUnlocked
                                                ? 'bg-amber-100 shadow-inner'
                                                : 'bg-gray-200'
                                        }`}>
                                            {isUnlocked ? ach.icon : '🔒'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-bold text-sm ${isUnlocked ? 'text-amber-800' : 'text-gray-400'}`}>
                                                {t(ach.nameKey)}
                                            </div>
                                            <div className={`text-xs ${isUnlocked ? 'text-amber-600' : 'text-gray-400'}`}>
                                                {isUnlocked ? '✅ ' + t('unlocked') : t('locked')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
