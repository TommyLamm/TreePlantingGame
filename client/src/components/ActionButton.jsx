import React from 'react';
import { audio } from '../utils/audio';

export function ActionButton({ icon, label, onClick, isActive }) {
    const handleClick = () => { audio.playClick(); onClick(); }
    return (
        <button
            onClick={handleClick}
            disabled={!isActive}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] action-btn ${
                isActive ? 'action-btn-active' : 'action-btn-disabled'
            }`}
        >
            <span className="text-lg">{icon}</span>
            <span className="text-[9px] font-extrabold uppercase tracking-wider">{label}</span>
        </button>
    )
}
