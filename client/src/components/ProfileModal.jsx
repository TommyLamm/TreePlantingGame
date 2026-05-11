import React, { useState, useRef, useEffect } from 'react';
import { User, Clock, Zap } from './Icons';
import { audio } from '../utils/audio';

export function ProfileModal({ 
    username, 
    joinDate, 
    playTimeMs, 
    interactions, 
    profileData, 
    onSave, 
    onClose, 
    onLogout,
    t 
}) {
    const [avatar, setAvatar] = useState(profileData?.avatar || null);
    const [birthday, setBirthday] = useState(profileData?.birthday || '');
    const [signature, setSignature] = useState(profileData?.signature || '');
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef(null);

    // Sync state when profileData changes
    useEffect(() => {
        setAvatar(profileData?.avatar || null);
        setBirthday(profileData?.birthday || '');
        setSignature(profileData?.signature || '');
    }, [profileData]);

    // Format Join Date
    const formattedJoinDate = joinDate ? new Date(joinDate).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '/') : 'N/A';
    
    // Format Play Time
    const hours = Math.floor(playTimeMs / 3600000);
    const minutes = Math.floor((playTimeMs % 3600000) / 60000);
    const formattedPlayTime = `${hours}h ${minutes}m`;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check 5MB limit
        if (file.size > 5 * 1024 * 1024) {
            setErrorMsg(t('avatarTooLarge'));
            return;
        }
        setErrorMsg('');

        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatar(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        audio.playClick();
        onSave({ avatar, birthday, signature });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-2">
                        <User size={24} />
                        <h2 className="text-xl font-bold">{t('profile')}</h2>
                    </div>
                    <div className="absolute inset-0 bg-white/10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLz48L3N2Zz4=')] bg-repeat opacity-50 mix-blend-overlay"></div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-gray-50 flex flex-col gap-6">
                    {/* Avatar & Username section */}
                    <div className="flex flex-col items-center gap-3">
                        <div 
                            className="relative w-24 h-24 rounded-full bg-gray-200 border-4 border-white shadow-lg overflow-hidden cursor-pointer group flex items-center justify-center text-gray-400"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {avatar ? (
                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={40} />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-bold">{t('uploadAvatar')}</span>
                            </div>
                        </div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileChange}
                        />
                        {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}
                        <h3 className="text-2xl font-black text-gray-800">{username}</h3>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-1">
                            <Clock size={16} className="text-blue-500" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase">{t('joinDate')}</span>
                            <span className="text-sm font-bold text-gray-700">{formattedJoinDate}</span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-1">
                            <Clock size={16} className="text-purple-500" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase">{t('playTime')}</span>
                            <span className="text-sm font-bold text-gray-700">{formattedPlayTime}</span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-1">
                            <Zap size={16} className="text-amber-500" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase">{t('interactions')}</span>
                            <span className="text-sm font-bold text-gray-700">{interactions || 0}</span>
                        </div>
                    </div>

                    {/* Edit Section */}
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">{t('birthday')}</label>
                            <input 
                                type="date" 
                                value={birthday}
                                onChange={e => setBirthday(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-sm text-gray-700"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">{t('signature')}</label>
                            <textarea 
                                value={signature}
                                onChange={e => setSignature(e.target.value)}
                                maxLength={50}
                                rows={2}
                                placeholder="..."
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-sm text-gray-700 resize-none"
                            />
                            <span className="text-[10px] text-gray-400 text-right">{signature.length}/50</span>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center">
                    <button onClick={onLogout} className="px-4 py-2 text-red-500 hover:bg-red-50 font-bold rounded-xl transition-colors text-sm">
                        {t('logout')}
                    </button>
                    <div className="flex gap-2">
                        <button onClick={() => { audio.playClick(); onClose(); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">
                            {t('back')}
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-sm transition-colors text-sm">
                            {t('save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}