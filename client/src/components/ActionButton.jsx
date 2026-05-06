import React from 'react';
import { audio } from '../utils/audio';

export function ActionButton({ icon, label, onClick, isActive }) {
    const handleClick = () => { audio.playClick(); onClick(); }
    return (
        <button onClick={handleClick} disabled={!isActive} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg transition-all transform hover:scale-105 active:scale-95 ${isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600' : 'bg-white border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 cursor-not-allowed'}`}>{icon}<span className="text-[10px] font-bold uppercase">{label}</span></button>
    )
}
