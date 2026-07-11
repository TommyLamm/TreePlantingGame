import React from 'react';
import { Moon, Sun, Leaf } from './Icons';
import { WEATHER_TYPES, SEASONS } from '../constants';

export function WeatherDisplay({ weather, season, isDay, t }) {
    const weatherInfo = WEATHER_TYPES[weather] || WEATHER_TYPES.sunny;
    const seasonInfo = SEASONS[season] || SEASONS.spring;
    const weatherLabel = weather === 'sunny' && !isDay
        ? (t ? t('weatherClearNight') : 'Clear')
        : (t ? t(weatherInfo.nameKey) : weather);
    const seasonLabel = t ? t(seasonInfo.nameKey) : season;
    const DayIcon = isDay ? Sun : Moon;

    return (
        <div title={`${weatherLabel} | ${seasonLabel}`} className={`weather-chip ${isDay ? 'weather-chip-day' : 'weather-chip-night'}`}>
            <span className="weather-chip-group">
                <DayIcon size={16} />
                <span className="weather-chip-label">{weatherLabel}</span>
            </span>
            <span className="weather-chip-divider" aria-hidden="true" />
            <span className="weather-chip-group">
                <Leaf size={16} />
                <span className="weather-chip-label">{seasonLabel}</span>
            </span>
        </div>
    );
}
