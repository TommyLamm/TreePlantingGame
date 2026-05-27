import React, { useEffect } from 'react';
import { audio } from '../utils/audio';

export function LeaderboardModal({ data, currentUser, onVisitGarden, onClose, t }) {
    // ESC close
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget) { audio.playClick(); onClose(); }
    };

    const medals = ['🥇', '🥈', '🥉'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={handleBackdrop}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white flex justify-between items-center relative overflow-hidden">
                    <h2 className="text-xl font-bold flex items-center gap-2 relative z-10">🏆 {t('leaderboard')}</h2>
                    <div className="absolute inset-0 bg-white/10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLz48L3N2Zz4=')] bg-repeat opacity-50 mix-blend-overlay"></div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-gray-50 flex flex-col gap-2">
                    {(!data || data.length === 0) ? (
                        <div className="text-center text-gray-400 py-8 italic">{t('noData')}</div>
                    ) : (
                        data.map((user, i) => (
                            <div
                                key={user.username}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer hover:shadow-md ${
                                    user.username === currentUser
                                        ? 'bg-purple-50 border-2 border-purple-200 shadow-sm'
                                        : 'bg-white border border-gray-100 hover:border-gray-200'
                                }`}
                                onClick={() => {
                                    if (user.username !== currentUser && onVisitGarden) {
                                        audio.playClick();
                                        onVisitGarden(user.username);
                                    }
                                }}
                            >
                                <div className="w-8 text-center font-bold text-lg">
                                    {i < 3 ? medals[i] : <span className="text-gray-400">#{i + 1}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-800 text-sm truncate flex items-center gap-1.5">
                                        {user.username}
                                        {(user.generation || 0) > 0 && (
                                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px] font-bold">
                                                G{user.generation}
                                            </span>
                                        )}
                                        {user.companion && (
                                            <span className="text-xs">
                                                {user.companion === 'butterfly' ? '🦋' :
                                                 user.companion === 'squirrel' ? '🐿️' :
                                                 user.companion === 'bird' ? '🐦' :
                                                 user.companion === 'owl' ? '🦉' :
                                                 user.companion === 'deer' ? '🦌' :
                                                 user.companion === 'phoenix' ? '🔥' : ''}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">{t('level')} {user.level}</div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="text-xs font-mono text-gray-400">{Math.floor(user.xp)} XP</div>
                                    {user.username !== currentUser && (
                                        <span className="text-[10px] text-teal-500 font-medium">{t('visitGarden')} →</span>
                                    )}
                                </div>
                            </div>
                        ))
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
