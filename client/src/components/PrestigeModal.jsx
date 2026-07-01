import React, { useEffect } from 'react';
import { PRESTIGE_UPGRADES } from '../constants';
import { audio } from '../utils/audio';

export function PrestigeModal({ currentLevel, generation, prestigePoints, prestigeUpgrades = {}, onPrestige, onUpgrade, onClose, t }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget) { audio.playClick(); onClose(); }
    };

    const potentialPoints = Math.floor(currentLevel / 10);
    const canPrestige = currentLevel >= 50;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={handleBackdrop}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-2">
                        <span className="text-2xl">♻️</span>
                        <h2 className="text-xl font-bold">{t('prestigeTitle')}</h2>
                    </div>
                    <div className="relative z-10 flex items-center gap-2">
                        <span className="bg-black/20 px-3 py-1 rounded-full text-sm font-bold">
                            {t('generation')}: {generation}
                        </span>
                        <span className="bg-amber-500/80 px-3 py-1 rounded-full text-sm font-bold">
                            ✦ {prestigePoints}
                        </span>
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_60%)]"></div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-gray-50 flex flex-col gap-4">
                    {/* Rebirth Section */}
                    <div className={`rounded-2xl p-4 border-2 ${canPrestige ? 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200' : 'bg-gray-100 border-gray-200'}`}>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            🌀 {t('rebirth')}
                        </h3>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-sm text-gray-500">{t('level')}: <span className="font-bold text-gray-800">{currentLevel}</span></p>
                                <p className="text-sm text-gray-500">{t('prestigePoints')}: <span className="font-bold text-amber-600">+{potentialPoints}</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">{t('generationFull', generation + 1)}</p>
                            </div>
                        </div>

                        {canPrestige ? (
                            <>
                                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg mb-3 border border-amber-200">
                                    ⚠️ {t('rebirthWarning')}
                                </p>
                                <button
                                    onClick={() => {
                                        if (window.confirm(t('rebirthConfirm', potentialPoints))) {
                                            audio.playLevelUp();
                                            onPrestige();
                                        }
                                    }}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    ♻️ {t('rebirth')} (+{potentialPoints} ✦)
                                </button>
                            </>
                        ) : (
                            <p className="text-xs text-gray-400 text-center py-2">
                                🔒 {t('rebirthRequirement')}
                            </p>
                        )}
                    </div>

                    {/* Upgrades Section */}
                    <div>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            ⬆️ {t('prestigeUpgrades')}
                        </h3>
                        <div className="flex flex-col gap-2">
                            {PRESTIGE_UPGRADES.map(upg => {
                                const currentLvl = prestigeUpgrades[upg.id] || 0;
                                const isMaxed = currentLvl >= upg.maxLevel;
                                const canAfford = prestigePoints >= upg.costPerLevel;

                                return (
                                    <div key={upg.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                                            {upg.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-800 text-sm">{t(upg.nameKey)}</h4>
                                            <p className="text-xs text-gray-500">{t(upg.descKey)}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                {Array.from({ length: upg.maxLevel }, (_, i) => (
                                                    <div key={i} className={`w-4 h-1.5 rounded-full ${i < currentLvl ? 'bg-purple-500' : 'bg-gray-200'}`} />
                                                ))}
                                                <span className="text-xs text-gray-400 ml-1">{currentLvl}/{upg.maxLevel}</span>
                                            </div>
                                        </div>
                                        <div>
                                            {isMaxed ? (
                                                <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold">{t('maxed')}</span>
                                            ) : (
                                                <button
                                                    onClick={() => { audio.playClick(); onUpgrade(upg.id); }}
                                                    disabled={!canAfford}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                        canAfford
                                                            ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-sm'
                                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    ✦{upg.costPerLevel}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
