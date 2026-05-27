import React, { useEffect } from 'react';
import { TreeVisual } from './TreeVisual';
import { audio } from '../utils/audio';

export function GardenVisitModal({ visitData, currentUser, onGift, giftError, onClose, t }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget) { audio.playClick(); onClose(); }
    };

    if (!visitData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={handleBackdrop}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-2">
                        <span className="text-2xl">🏡</span>
                        <h2 className="text-lg font-bold">{t('visiting', visitData.username)}</h2>
                    </div>
                    {visitData.generation > 0 && (
                        <span className="relative z-10 bg-purple-500/80 px-2 py-1 rounded-full text-xs font-bold">
                            Gen {visitData.generation}
                        </span>
                    )}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_60%)]"></div>
                </div>

                <div className="p-4 bg-gradient-to-b from-blue-100 to-green-50 flex flex-col items-center gap-4">
                    {/* Tree */}
                    <div className="w-full h-48 relative">
                        <TreeVisual level={visitData.level} eventType={null} skin={visitData.treeSkin} isStatic={true} />
                    </div>

                    {/* Info badges */}
                    <div className="flex gap-2 flex-wrap justify-center">
                        <span className="bg-white/90 px-3 py-1 rounded-full text-sm font-bold text-gray-700 shadow-sm">
                            🌳 Lv.{visitData.level}
                        </span>
                        {visitData.companion && (
                            <span className="bg-white/90 px-3 py-1 rounded-full text-sm font-bold text-gray-700 shadow-sm">
                                {visitData.companion === 'butterfly' ? '🦋' :
                                 visitData.companion === 'squirrel' ? '🐿️' :
                                 visitData.companion === 'bird' ? '🐦' :
                                 visitData.companion === 'owl' ? '🦉' :
                                 visitData.companion === 'deer' ? '🦌' :
                                 visitData.companion === 'phoenix' ? '🔥' : ''}
                            </span>
                        )}
                        <span className="bg-white/90 px-3 py-1 rounded-full text-sm font-bold text-gray-700 shadow-sm">
                            🏆 {(visitData.achievements || []).length}
                        </span>
                    </div>

                    {/* Gift button */}
                    {currentUser !== visitData.username && (
                        <div className="w-full">
                            <button
                                onClick={() => { audio.playClick(); onGift(visitData.username); }}
                                className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                            >
                                🎁 {t('sendGift')} (50 💰)
                            </button>
                            {giftError && (
                                <p className="text-xs text-red-500 text-center mt-2">{giftError}</p>
                            )}
                        </div>
                    )}
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
