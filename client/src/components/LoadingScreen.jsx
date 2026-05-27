import React from 'react';
import { Leaf } from './Icons';

export const LoadingScreen = ({ t }) => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-emerald-100">
        <div className="animate-bounce mb-6">
            <Leaf size={64} className="text-green-500 drop-shadow-lg" />
        </div>
        <div className="text-lg font-bold text-green-700 animate-pulse">
            {t ? t('loading') : 'Connecting to garden...'}
        </div>
        <div className="mt-4 w-48 h-1.5 bg-green-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{
                animation: 'loading-bar 2s ease-in-out infinite'
            }} />
        </div>
    </div>
);
