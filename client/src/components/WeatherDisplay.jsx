import React from 'react';
import { WEATHER_TYPES, SEASONS } from '../constants';

export function WeatherDisplay({ weather, season, isDay, t }) {
    const weatherInfo = WEATHER_TYPES[weather] || WEATHER_TYPES.sunny;
    const seasonInfo = SEASONS[season] || SEASONS.spring;
    const weatherLabel = weather === 'sunny' && !isDay
        ? (t ? t('weatherClearNight') : 'Clear')
        : (t ? t(weatherInfo.nameKey) : weather);
    const seasonLabel = t ? t(seasonInfo.nameKey) : season;

    return (
        <div title={`${weatherLabel} | ${seasonLabel}`} className={`weather-chip flex items-center gap-2 px-3 py-1 rounded-full shadow-md text-[10px] font-bold border transition-all ${
            isDay
                ? 'bg-white/95 text-gray-700 border-yellow-100/50'
                : 'bg-slate-800/95 text-gray-200 border-slate-700/50'
        }`}>
            <div className="flex items-center gap-1">
                <span>{weatherInfo.icon}</span>
                <span className="weather-chip-label uppercase tracking-wider">{weatherLabel}</span>
            </div>
            <span className={`h-3 w-px ${isDay ? 'bg-gray-200' : 'bg-slate-700'}`} />
            <div className="flex items-center gap-1">
                <span>{seasonInfo.icon}</span>
                <span className="weather-chip-label uppercase tracking-wider">{seasonLabel}</span>
            </div>
        </div>
    );
}
