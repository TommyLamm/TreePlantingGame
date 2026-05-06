import React from 'react';
import { MAX_LEVEL } from '../constants';
import { BookOpen, Lock } from './Icons';
import { TreeVisual } from './TreeVisual';
import { audio } from '../utils/audio';

export const CollectionModal = ({ currentLevel, onClose, t }) => {
    const levels = Array.from({length: MAX_LEVEL}, (_, i) => i + 1);
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white/95 w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                        <BookOpen className="text-green-600" /> {t('collection')}
                    </h2>
                    <button onClick={() => { audio.playClick(); onClose(); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {levels.map((lvl) => {
                            const isUnlocked = lvl <= currentLevel;
                            return (
                                <div key={lvl} className={`aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-between p-4 transition-all duration-500 ${isUnlocked ? 'bg-white border-green-100 shadow-sm hover:shadow-md hover:border-green-300 scale-100' : 'bg-gray-100 border-gray-200 opacity-70'}`}>
                                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                        {t('level')} {lvl}
                                    </div>
                                    
                                    <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden rounded-xl">
                                        {isUnlocked ? (
                                            <div className="w-full h-full transform scale-90">
                                                <TreeVisual level={lvl} eventType={null} />
                                            </div>
                                        ) : (
                                            <div className="text-gray-300">
                                                <Lock size={48} />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className={`mt-4 text-sm font-semibold px-3 py-1 rounded-full text-center w-full ${isUnlocked ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                        {isUnlocked ? (lvl === MAX_LEVEL ? t('max') : t('unlocked')) : t('locked')}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
