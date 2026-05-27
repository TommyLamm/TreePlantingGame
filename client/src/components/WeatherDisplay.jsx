import React from 'react';
import { WEATHER_TYPES, SEASONS } from '../constants';

export function WeatherDisplay({ weather, season, isDay }) {
    const weatherInfo = WEATHER_TYPES[weather] || WEATHER_TYPES.sunny;
    const seasonInfo = SEASONS[season] || SEASONS.spring;

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg text-xs font-bold border transition-all ${
            isDay
                ? 'bg-white/90 text-gray-700 border-white/50'
                : 'bg-slate-700/90 text-gray-200 border-slate-600'
        }`}>
            <span className="text-base">{weatherInfo.icon}</span>
            <span className="text-base">{seasonInfo.icon}</span>
        </div>
    );
}
