import React, { useState } from 'react';
import { Leaf } from './Icons';

export const LoginScreen = ({ onLogin, t, existingUsers = [] }) => {
    const [mode, setMode] = useState(existingUsers.length > 0 ? 'select' : 'create');
    const [name, setName] = useState("");
    const handleSubmit = (e) => { e.preventDefault(); if(name.trim().length > 0) onLogin(name.trim()); }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white/90 p-8 rounded-3xl shadow-2xl text-center max-w-xs w-full animate-in zoom-in-95 duration-300 max-h-[80vh] overflow-y-auto">
                <div className="mb-4 text-green-600 flex justify-center"><Leaf size={48} /></div>
                {mode === 'select' ? (
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('selectUser')}</h2>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {existingUsers.map(user => (
                                <button key={user} type="button" onClick={() => onLogin(user)} className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl transition-all flex items-center justify-between group"><span>{user}</span><span className="opacity-0 group-hover:opacity-100 text-lg">→</span></button>
                            ))}
                        </div>
                        <div className="border-t border-gray-200 my-4"></div>
                        <button type="button" onClick={() => setMode('create')} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all transform hover:scale-105">{t('createNew')}</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('loginTitle')}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('loginPlaceholder')} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none text-gray-800 text-lg text-center" autoFocus />
                            <button type="submit" disabled={name.trim().length === 0} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100">{t('start')}</button>
                        </form>
                        {existingUsers.length > 0 && (<button type="button" onClick={() => setMode('select')} className="text-sm text-gray-500 hover:text-gray-800 underline">{t('back')}</button>)}
                    </div>
                )}
            </div>
        </div>
    )
}
