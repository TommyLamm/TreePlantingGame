import React from 'react';
import { audio } from '../utils/audio';

export function ActionButton({ icon, label, onClick, isActive }) {
    const handleClick = () => { audio.playClick(); onClick(); }
    return (
        <button
            onClick={handleClick}
            disabled={!isActive}
            className={`action-btn ${
                isActive ? 'action-btn-active' : 'action-btn-disabled'
            }`}
        >
            <span className="action-btn-icon">{icon}</span>
            <span className="action-btn-label">{label}</span>
        </button>
    )
}
