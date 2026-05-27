import React, { useState, useEffect } from 'react';
import { MAX_LEVEL } from './constants';
import { audio } from './utils/audio';
import { createTranslator } from './utils/i18n';
import { CloudCheck, CloudOff, User, BookOpen, VolumeX, Volume2, Clock, Sun, Moon, Zap, Droplets, Bug, Shovel, Coins, ShoppingCart } from './components/Icons';
import { TreeVisual } from './components/TreeVisual';
import { ActionButton } from './components/ActionButton';
import { CollectionModal } from './components/CollectionModal';
import { StoreModal } from './components/StoreModal';
import { ProfileModal } from './components/ProfileModal';
import { LoginScreen } from './components/LoginScreen';
import { Particles } from './components/Particles';

export default function App() {
    const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('zenUser') || null);
    const [serverStatus, setServerStatus] = useState('unknown'); 
    const [existingUsers, setExistingUsers] = useState([]);

    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [coins, setCoins] = useState(0);
    const [inventory, setInventory] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [joinDate, setJoinDate] = useState(null);
    const [playTimeMs, setPlayTimeMs] = useState(0);
    const [interactions, setInteractions] = useState(0);
    const [activeEvent, setActiveEvent] = useState(null);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('zenMuted');
        return saved !== null ? JSON.parse(saved) : true;
    });
    // Read initial language from localStorage or default to 'en'
    const [lang, setLang] = useState(localStorage.getItem('zenLang') || 'en');
    const [logs, setLogs] = useState([]);

    // OPTIMISTIC UI STATE: To prevent double clicking
    const [localActiveEvent, setLocalActiveEvent] = useState(null);
    const [showCollection, setShowCollection] = useState(false);
    const [showStore, setShowStore] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    
    // VISUAL EFFECTS STATE
    const [actionBursts, setActionBursts] = useState([]);

    const xpRequired = Math.max(1, Math.floor(10 + Math.pow(level, 1.6)));
    const progress = Math.min(100, (xp / xpRequired) * 100);

    const t = createTranslator(lang);
    
     // Sync audio state on mount
    useEffect(() => {
        audio.setMuted(isMuted);
    }, []);

    // Sync activeEvent to localActiveEvent unless we are "processing" an action
    useEffect(() => {
         if (activeEvent) setLocalActiveEvent(activeEvent);
         // if activeEvent becomes null from server, local should clear too
         if (!activeEvent) setLocalActiveEvent(null);
    }, [activeEvent]);

    // 1. Initial Fetch
    useEffect(() => {
        fetch('/api/users')
            .then(res => res.json())
            .then(users => setExistingUsers(users))
            .catch(err => setServerStatus('offline'));
    }, []);

    // 2. Polling Loop
    useEffect(() => {
        if (!currentUser) return;
        const poll = async () => {
            try {
                const res = await fetch('/api/heartbeat', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUser })
                });
                if (!res.ok) throw new Error("Heartbeat failed");
                const data = await res.json();
                
                setXp(Number(data.xp));
                setLevel(Number(data.level));
                setCoins(Number(data.coins));
                setInventory(data.inventory);
                setJoinDate(data.joinDate);
                setPlayTimeMs(data.playTime);
                setInteractions(data.interactionCount);
                setProfileData(data.profile);
                // Only update active event if we aren't locally hiding it for optimistic UI
                setActiveEvent(data.activeEvent);
                setIsDemoMode(data.isDemoMode);
                setServerStatus('connected');

                if (data.justLeveledUp) {
                     audio.playLevelUp();
                     addLog(t('levelUp', data.level));
                }
            } catch (e) { setServerStatus('offline'); }
        };
        poll(); // initial immediate poll
        const interval = setInterval(poll, 5000);
        return () => clearInterval(interval);
    }, [currentUser, t]);

    // Actions with OPTIMISTIC UI
    const handleAction = async (actionType) => {
        // 1. Hide Button Immediately
        setLocalActiveEvent(null);
        
        // Spawn visual burst effect immediately
        const burstId = Date.now();
        // Base X on action type to spread them out slightly
        let burstX = '50%';
        if (actionType === 'WATER') burstX = '40%';
        if (actionType === 'PEST') burstX = '50%';
        if (actionType === 'FERTILIZE') burstX = '60%';
        
        setActionBursts(prev => [...prev, { id: burstId, type: actionType, x: burstX, y: '50%' }]);
        setTimeout(() => {
            setActionBursts(prev => prev.filter(b => b.id !== burstId));
        }, 1500);

        try {
            const res = await fetch('/api/action', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser, action: actionType })
            });
            const data = await res.json();
            
            if (data.lastEventResolved) {
                 audio.playLevelUp(); 
                 addLog(t('resolved', data.lastReward));
            } else {
                 audio.playClick();
                 addLog(t('fail'));
            }
            // Sync final state
            setXp(Number(data.xp));
            setLevel(Number(data.level));
            setActiveEvent(data.activeEvent);
        } catch(e) {
            console.error(e);
            // Revert if failed
            setLocalActiveEvent(activeEvent);
        }
    };
    
    const toggleDemoState = async () => {
        try {
            const res = await fetch('/api/toggle-warp', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser })
            });
            const data = await res.json();
            setIsDemoMode(data.isDemoMode);
        } catch (e) { console.error(e); }
    };

    const handleLogin = (name) => {
        // Resume audio context if it was created in suspended state (e.g. auto-unmute on load)
        if (audio.ctx && audio.ctx.state === 'suspended') {
            audio.ctx.resume();
        }

        setCurrentUser(name);
        localStorage.setItem('zenUser', name);
        audio.playClick();
    };

    const handleLogout = () => {
        audio.playClick();
        setCurrentUser(null);
        localStorage.removeItem('zenUser');
        setExistingUsers([]); // Clear to force re-fetch next render
        
        // Reset all states
        setXp(0);
        setLevel(1);
        setCoins(0);
        setInventory(null);
        setProfileData(null);
        setJoinDate(null);
        setPlayTimeMs(0);
        setInteractions(0);
        setActiveEvent(null);
        setLocalActiveEvent(null);
        setShowProfile(false);
        setShowStore(false);
        setShowCollection(false);

        fetch('/api/users').then(res => res.json()).then(users => setExistingUsers(users));
    };

    const toggleMute = () => { 
        const newState = !isMuted;
        setIsMuted(newState); 
        localStorage.setItem('zenMuted', JSON.stringify(newState));
        audio.setMuted(newState); 
        if (!newState) audio.playClick(); 
    };

    const toggleCollection = () => {
        audio.playClick();
        setShowCollection(prev => !prev);
    };
    
    const cycleLang = () => {
        audio.playClick();
        const langs = ['en', 'zh-CN', 'zh-TW'];
        const nextIdx = (langs.indexOf(lang) + 1) % langs.length;
        const newLang = langs[nextIdx];
        setLang(newLang);
        // Save preference to browser storage
        localStorage.setItem('zenLang', newLang);
    };

    const addLog = (msg) => setLogs(prev => [msg, ...prev].slice(0, 2));
    const isDay = new Date().getHours() > 6 && new Date().getHours() < 18;

    const handleBuy = async (itemId, price, type) => {
        try {
            const res = await fetch('/api/store/buy', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser, itemId, price, type })
            });
            if (!res.ok) {
                addLog(t('notEnoughCoins'));
                return;
            }
            const data = await res.json();
            setCoins(Number(data.coins));
            setInventory(data.inventory);
            audio.playLevelUp(); // Just a positive sound
        } catch (e) { console.error(e); }
    };

    const handleEquip = async (itemId) => {
        try {
            const res = await fetch('/api/store/equip', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser, itemId })
            });
            if (res.ok) {
                const data = await res.json();
                setInventory(data.inventory);
                audio.playClick();
            }
        } catch (e) { console.error(e); }
    };

    const handleProfileSave = async (updatedProfile) => {
        try {
            const res = await fetch('/api/profile/update', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser, profile: updatedProfile })
            });
            if (res.ok) {
                const data = await res.json();
                setProfileData(data.profile);
                addLog(t('resolved', 0).replace('0 XP.', 'Profile Saved.')); // Reusing log for simplicity or just a simple log
            }
        } catch (e) { console.error(e); }
    };

    if (!currentUser) return <LoginScreen onLogin={handleLogin} t={t} existingUsers={existingUsers} />;

    return (
        <div className={`fixed inset-0 flex flex-col items-center font-sans transition-colors duration-1000 ${isDay ? 'bg-gradient-to-b from-blue-200 to-blue-100' : 'bg-gradient-to-b from-indigo-900 to-slate-800 text-white'} overflow-hidden`}>
            
            <Particles isDay={isDay} />

            {/* Collection Modal */}
            {showCollection && <CollectionModal currentLevel={level} onClose={toggleCollection} t={t} />}
            
            {/* Store Modal */}
            {showStore && <StoreModal userCoins={coins} inventory={inventory} onBuy={handleBuy} onEquip={handleEquip} onClose={() => { audio.playClick(); setShowStore(false); }} t={t} />}

            {/* Profile Modal */}
            {showProfile && (
                <ProfileModal 
                    username={currentUser} 
                    joinDate={joinDate} 
                    playTimeMs={playTimeMs} 
                    interactions={interactions} 
                    profileData={profileData} 
                    onSave={handleProfileSave} 
                    onClose={() => { audio.playClick(); setShowProfile(false); }} 
                    onLogout={handleLogout}
                    t={t} 
                />
            )}

            <div className="absolute top-4 right-4 flex flex-col gap-2 z-30 items-end">
                <div className="flex gap-2">
                     <div title={serverStatus === 'connected' ? "Online" : "Offline"} className={`flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all ${serverStatus === 'connected' ? 'bg-white text-green-500' : 'bg-red-100 text-red-500'}`}>{serverStatus === 'connected' ? <CloudCheck size={20} /> : <CloudOff size={20} />}</div>
                     
                     <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-lg font-bold text-sm text-yellow-600 border border-yellow-100">
                         <Coins size={16} />
                         <span>{Math.floor(coins)}</span>
                     </div>

                     <button onClick={cycleLang} className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all bg-white text-indigo-600 hover:bg-gray-50 font-bold text-xs">{t('langName')}</button>
                    <button onClick={() => { audio.playClick(); setShowProfile(true); }} title={t('profile')} className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all bg-white text-blue-500 hover:bg-gray-50 overflow-hidden">
                        {profileData?.avatar ? <img src={profileData.avatar} alt="User" className="w-full h-full object-cover" /> : <User size={20} />}
                    </button>
                    <button onClick={() => { audio.playClick(); setShowStore(true); }} title={t('store')} className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all bg-white text-amber-500 hover:bg-gray-50"><ShoppingCart size={20} /></button>
                    <button onClick={toggleCollection} title={t('collection')} className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all bg-white text-green-600 hover:bg-gray-50"><BookOpen size={20} /></button>
                    <button onClick={toggleMute} className={`flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all ${!isMuted ? 'bg-white text-blue-500' : 'bg-gray-200 text-gray-500'}`}>{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                    <button onClick={toggleDemoState} className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-xs font-bold transition-all ${isDemoMode ? 'bg-purple-600 text-white animate-pulse' : 'bg-white/80 text-gray-600 border border-white/50'}`}><Clock size={14} /> {isDemoMode ? t('timeWarp').split('(')[0] : t('realTime')}</button>
                </div>
                <div className="text-[10px] text-right text-gray-500 px-2">{currentUser} | {isDemoMode ? t('rateDemo') : t('rateNormal')}</div>
            </div>

            <div className="w-full max-w-md flex-1 flex flex-col relative z-10 pb-6 pt-20 px-4">
                <div className="absolute top-10 right-10 animate-pulse-slow z-0">{isDay ? <Sun size={48} className="text-yellow-400 drop-shadow-md" /> : <Moon size={48} className="text-gray-200 drop-shadow-md" />}</div>
                
                {/* Visual Action Bursts */}
                {actionBursts.map(burst => (
                    <div key={burst.id} className="absolute z-40 pointer-events-none animate-burst" style={{ left: burst.x, top: burst.y, transform: 'translate(-50%, -50%)' }}>
                        {burst.type === 'WATER' && <Droplets size={32} className="text-blue-400 drop-shadow-md" />}
                        {burst.type === 'PEST' && <Bug size={32} className="text-red-400 drop-shadow-md" />}
                        {burst.type === 'FERTILIZE' && <Shovel size={32} className="text-yellow-400 drop-shadow-md" />}
                        <div className="text-sm font-bold text-white drop-shadow-md text-center mt-1">+XP</div>
                    </div>
                ))}

                <div className="flex-1 w-full min-h-0 relative z-10 mb-4">
                    <TreeVisual level={level} eventType={activeEvent} skin={inventory?.treeSkin} />
                </div>

                <div className="w-full flex-shrink-0 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-4 z-20 text-gray-800 border border-white/50">
                    <div className="flex justify-between items-end mb-2">
                        <div><span className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('status')}</span><div className="text-3xl font-bold text-gray-800 flex items-baseline gap-1">{t('level')} {level}{level === MAX_LEVEL && <span className="text-sm text-yellow-500 ml-2">{t('max')}</span>}</div></div>
                        <div className="text-right"><div className="text-sm font-mono text-gray-500">{Math.floor(xp)} / {xpRequired} XP</div></div>
                    </div>
                    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden mb-4 relative"><div className="h-full bg-green-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /><div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,rgba(255,255,255,1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,1)_50%,rgba(255,255,255,1)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"></div></div>
                    <div className="h-24 w-full">
                        {localActiveEvent ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 h-full animate-in slide-in-from-bottom-2 flex flex-col justify-between">
                                <p className="text-amber-800 text-xs font-bold flex items-center gap-2"><Zap size={14} /> {t('action')}</p>
                                <div className="flex gap-2 justify-center">
                                    <ActionButton icon={<Droplets size={18} />} label={t('water')} isActive={localActiveEvent === 'WATER'} onClick={() => handleAction('WATER')} />
                                    <ActionButton icon={<Bug size={18} />} label={t('pest')} isActive={localActiveEvent === 'PEST'} onClick={() => handleAction('PEST')} />
                                    <ActionButton icon={<Shovel size={18} />} label={t('feed')} isActive={localActiveEvent === 'FERTILIZE'} onClick={() => handleAction('FERTILIZE')} />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-xs italic border-2 border-dashed border-gray-200 rounded-xl">{t('peaceful')}</div>
                        )}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-2 w-full px-4 pointer-events-none flex flex-col-reverse items-center gap-1 z-30 h-12 justify-end">
                {logs.map((log, i) => (<div key={i} className={`text-[10px] text-center text-white/95 bg-black/50 rounded-full px-3 py-1 backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 shadow-sm transition-all max-w-[90%] truncate ${i === 0 ? 'scale-100 opacity-100' : 'scale-90 opacity-60'}`}>{log}</div>))}
            </div>
        </div>
    );
};
