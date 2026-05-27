import React, { useState, useEffect, useCallback } from 'react';
import { audio } from '../utils/audio';

const MEMORY_EMOJIS = ['🌳', '🌸', '🍂', '❄️', '🌺', '🍄'];

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// --- Memory Match Game ---
function MemoryGame({ onFinish, t }) {
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState([]);
    const [moves, setMoves] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    const [complete, setComplete] = useState(false);

    useEffect(() => {
        const pairs = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS];
        setCards(shuffleArray(pairs).map((emoji, i) => ({ id: i, emoji, flipped: false })));
        setGameStarted(true);
    }, []);

    const handleFlip = useCallback((idx) => {
        if (flipped.length >= 2 || flipped.includes(idx) || matched.includes(idx)) return;

        audio.playClick();
        const newFlipped = [...flipped, idx];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            setMoves(m => m + 1);
            const [a, b] = newFlipped;
            if (cards[a].emoji === cards[b].emoji) {
                setTimeout(() => {
                    const newMatched = [...matched, a, b];
                    setMatched(newMatched);
                    setFlipped([]);
                    if (newMatched.length === cards.length) {
                        setComplete(true);
                        audio.playLevelUp();
                    }
                }, 400);
            } else {
                setTimeout(() => setFlipped([]), 700);
            }
        }
    }, [flipped, matched, cards]);

    useEffect(() => {
        if (complete) {
            // Score: fewer moves = higher score. Max 12 pairs = 6 matches minimum
            const score = Math.max(1, Math.floor((12 - moves) * 3 + 6));
            setTimeout(() => onFinish(score), 1000);
        }
    }, [complete, moves, onFinish]);

    if (!gameStarted) return null;

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4 text-sm font-bold">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{t('moves')}: {moves}</span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">{matched.length / 2} / 6</span>
            </div>
            <div className="grid grid-cols-4 gap-2 w-full max-w-xs">
                {cards.map((card, idx) => {
                    const isFlipped = flipped.includes(idx) || matched.includes(idx);
                    const isMatched = matched.includes(idx);
                    return (
                        <button
                            key={card.id}
                            onClick={() => handleFlip(idx)}
                            disabled={isFlipped}
                            className={`aspect-square rounded-xl text-2xl font-bold flex items-center justify-center transition-all duration-300 transform ${
                                isMatched
                                    ? 'bg-green-100 border-2 border-green-300 scale-95 shadow-inner'
                                    : isFlipped
                                    ? 'bg-white border-2 border-amber-300 shadow-md scale-105 rotate-0'
                                    : 'bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-emerald-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer'
                            }`}
                        >
                            {isFlipped ? (
                                <span className={`transition-transform duration-300 ${isMatched ? 'scale-110' : 'scale-100'}`}>
                                    {card.emoji}
                                </span>
                            ) : (
                                <span className="text-white/80 text-lg">?</span>
                            )}
                        </button>
                    );
                })}
            </div>
            {complete && (
                <div className="text-center animate-bounce mt-2">
                    <span className="text-lg font-bold text-green-600">🎉 {t('matched')}</span>
                </div>
            )}
        </div>
    );
}

// --- Quick Water Game ---
function QuickWaterGame({ onFinish, t }) {
    const [drops, setDrops] = useState([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(10);
    const [gameOver, setGameOver] = useState(false);
    const [started, setStarted] = useState(false);
    const dropIdRef = React.useRef(0);

    const startGame = useCallback(() => {
        setStarted(true);
        setScore(0);
        setTimeLeft(10);
        setGameOver(false);
        setDrops([]);
    }, []);

    // Timer
    useEffect(() => {
        if (!started || gameOver) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameOver(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [started, gameOver]);

    // Spawn drops
    useEffect(() => {
        if (!started || gameOver) return;
        const spawner = setInterval(() => {
            const id = dropIdRef.current++;
            const x = 10 + Math.random() * 80;
            const y = 10 + Math.random() * 70;
            setDrops(prev => [...prev, { id, x, y, alive: true }]);
            // Auto-remove after 2 seconds
            setTimeout(() => {
                setDrops(prev => prev.filter(d => d.id !== id));
            }, 2000);
        }, 600);
        return () => clearInterval(spawner);
    }, [started, gameOver]);

    // Game over callback
    useEffect(() => {
        if (gameOver && started) {
            audio.playLevelUp();
            setTimeout(() => onFinish(score), 1000);
        }
    }, [gameOver, started, score, onFinish]);

    const catchDrop = useCallback((id) => {
        audio.playClick();
        setDrops(prev => prev.filter(d => d.id !== id));
        setScore(s => s + 1);
    }, []);

    if (!started) {
        return (
            <div className="flex flex-col items-center gap-4 py-8">
                <div className="text-6xl animate-bounce">💧</div>
                <p className="text-gray-500 text-sm text-center">{t('quickWaterDesc')}</p>
                <button
                    onClick={startGame}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                    {t('startGame')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4 text-sm font-bold">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    {t('score')}: {score}
                </span>
                <span className={`px-3 py-1 rounded-full ${timeLeft <= 3 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                    {t('timeLeft')}: {timeLeft}s
                </span>
            </div>
            <div className="relative w-full h-64 bg-gradient-to-b from-sky-100 to-blue-50 rounded-2xl overflow-hidden border-2 border-blue-200">
                {drops.map(drop => (
                    <button
                        key={drop.id}
                        onClick={() => catchDrop(drop.id)}
                        className="absolute w-10 h-10 text-2xl flex items-center justify-center rounded-full bg-blue-400/20 hover:bg-blue-400/40 transition-all cursor-pointer animate-pulse hover:scale-125"
                        style={{ left: `${drop.x}%`, top: `${drop.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                        💧
                    </button>
                ))}
                {gameOver && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-white rounded-2xl p-6 text-center shadow-2xl">
                            <p className="text-2xl font-bold text-blue-600 mb-2">{t('gameOver')}</p>
                            <p className="text-lg text-gray-600">{t('score')}: {score}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Main MiniGame Modal ---
export function MiniGameModal({ gamesRemaining, onReward, onClose, t }) {
    const [selectedGame, setSelectedGame] = useState(null);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget && !selectedGame) { audio.playClick(); onClose(); }
    };

    const handleGameFinish = useCallback((score) => {
        setResult({ score });
        onReward(selectedGame, score);
    }, [selectedGame, onReward]);

    const resetGame = () => {
        setSelectedGame(null);
        setResult(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={handleBackdrop}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-2">
                        <span className="text-2xl">🎮</span>
                        <h2 className="text-xl font-bold">{t('miniGamesTitle')}</h2>
                    </div>
                    <div className="relative z-10 text-sm font-bold bg-black/20 px-3 py-1 rounded-full">
                        {t('gamesRemaining', gamesRemaining)}
                    </div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
                    {gamesRemaining <= 0 && !selectedGame ? (
                        <div className="text-center py-12">
                            <span className="text-5xl mb-4 block">😴</span>
                            <p className="text-gray-500 font-medium">{t('noGamesLeft')}</p>
                        </div>
                    ) : result ? (
                        <div className="text-center py-8 animate-in fade-in">
                            <span className="text-5xl mb-4 block">🎉</span>
                            <p className="text-2xl font-bold text-emerald-600 mb-2">{t('gameOver')}</p>
                            <p className="text-lg text-gray-600 mb-1">{t('score')}: {result.score}</p>
                            <p className="text-amber-500 font-bold mb-6">{t('coinsEarned', Math.min(result.score * 5, 200))}</p>
                            <div className="flex gap-3 justify-center">
                                {gamesRemaining > 1 && (
                                    <button onClick={resetGame} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors">
                                        {t('playAgain')}
                                    </button>
                                )}
                                <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors">
                                    {t('close')}
                                </button>
                            </div>
                        </div>
                    ) : selectedGame === 'memory' ? (
                        <MemoryGame onFinish={handleGameFinish} t={t} />
                    ) : selectedGame === 'water' ? (
                        <QuickWaterGame onFinish={handleGameFinish} t={t} />
                    ) : (
                        <div className="flex flex-col gap-3">
                            {/* Memory Match */}
                            <button
                                onClick={() => { audio.playClick(); setSelectedGame('memory'); }}
                                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md hover:scale-[1.02]"
                            >
                                <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center text-3xl shadow-inner border border-purple-100 flex-shrink-0">
                                    🃏
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-bold text-gray-800">{t('memoryMatch')}</h3>
                                    <p className="text-xs text-gray-500">{t('memoryMatchDesc')}</p>
                                </div>
                                <div className="text-emerald-500 font-bold text-sm">▶</div>
                            </button>

                            {/* Quick Water */}
                            <button
                                onClick={() => { audio.playClick(); setSelectedGame('water'); }}
                                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md hover:scale-[1.02]"
                            >
                                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-3xl shadow-inner border border-blue-100 flex-shrink-0">
                                    💧
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-bold text-gray-800">{t('quickWater')}</h3>
                                    <p className="text-xs text-gray-500">{t('quickWaterDesc')}</p>
                                </div>
                                <div className="text-emerald-500 font-bold text-sm">▶</div>
                            </button>
                        </div>
                    )}
                </div>

                {!result && !selectedGame && (
                    <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
                        <button onClick={() => { audio.playClick(); onClose(); }} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">
                            {t('close')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
