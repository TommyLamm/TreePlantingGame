import React, { useEffect } from 'react';
import { COMPANIONS } from '../constants';
import { Coins } from './Icons';
import { audio } from '../utils/audio';

export function CompanionSelect({ unlockedCompanions = [], equippedCompanion, userCoins, userLevel, generation, onBuy, onEquip, onClose, t }) {
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
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-2">
                        <span className="text-2xl">🐾</span>
                        <h2 className="text-xl font-bold">{t('companions')}</h2>
                    </div>
                    <div className="relative z-10 flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full font-bold text-sm">
                        <Coins size={14} className="text-yellow-200" />
                        <span>{Math.floor(userCoins)}</span>
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_60%)]"></div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-gray-50 flex flex-col gap-3">
                    {/* Unequip option */}
                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:scale-[1.01]">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-gray-200 flex-shrink-0">
                            🚫
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 text-sm">{t('noCompanion')}</h3>
                        </div>
                        <div>
                            {!equippedCompanion ? (
                                <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold">{t('companionEquipped')}</span>
                            ) : (
                                <button onClick={() => { audio.playClick(); onEquip(null); }} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors">
                                    {t('equip')}
                                </button>
                            )}
                        </div>
                    </div>

                    {COMPANIONS.map(comp => {
                        const isOwned = unlockedCompanions.includes(comp.id);
                        const isEquipped = equippedCompanion === comp.id;
                        const levelLocked = userLevel < comp.unlockLevel;
                        const prestigeLocked = comp.prestigeOnly && (generation || 0) < 1;
                        const canAfford = userCoins >= comp.price;
                        const isFree = comp.price === 0;

                        return (
                            <div key={comp.id} className={`bg-white rounded-2xl p-3 shadow-sm border flex items-center gap-4 transition-all hover:scale-[1.01] ${
                                isEquipped ? 'border-green-200 bg-green-50/50' : 'border-gray-100'
                            }`}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border flex-shrink-0 ${
                                    isOwned ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-100 border-gray-200'
                                }`}>
                                    {levelLocked || prestigeLocked ? '🔒' : comp.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800 text-sm truncate">{t(comp.nameKey)}</h3>
                                    <p className="text-xs text-gray-500">{t(comp.descKey)}</p>
                                    {!isOwned && !levelLocked && !prestigeLocked && (
                                        <div className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-500">
                                            {!isFree && <><Coins size={12} /><span>{comp.price}</span></>}
                                            {isFree && <span className="text-green-500">FREE</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-shrink-0">
                                    {levelLocked ? (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded-lg text-[10px] font-bold whitespace-nowrap">
                                            {t('companionLocked', comp.unlockLevel)}
                                        </span>
                                    ) : prestigeLocked ? (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-400 rounded-lg text-[10px] font-bold whitespace-nowrap">
                                            {t('companionPrestigeOnly')}
                                        </span>
                                    ) : isEquipped ? (
                                        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold">{t('companionEquipped')}</span>
                                    ) : isOwned ? (
                                        <button onClick={() => { audio.playClick(); onEquip(comp.id); }} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors">
                                            {t('equip')}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { if (canAfford || isFree) { audio.playClick(); onBuy(comp.id); } }}
                                            disabled={!canAfford && !isFree}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors ${
                                                canAfford || isFree ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {t('buy')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
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
