import React from 'react';
import { audio } from '../utils/audio';

export function ActionButton({
    icon,
    label,
    onClick,
    isActive,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onKeyDown,
    onKeyUp,
}) {
    const handleClick = () => {
        audio.playClick();
        onClick?.();
    };
    return (
        <button
            type="button"
            onClick={handleClick}
            onPointerDown={isActive ? onPointerDown : undefined}
            onPointerUp={isActive ? onPointerUp : undefined}
            onPointerCancel={isActive ? onPointerCancel : undefined}
            onKeyDown={isActive ? onKeyDown : undefined}
            onKeyUp={isActive ? onKeyUp : undefined}
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
