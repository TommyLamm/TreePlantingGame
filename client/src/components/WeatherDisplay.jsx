import React from 'react';
import { Moon, Sun, Leaf } from './Icons';
import { SEASONS } from '../constants';
import { getWeatherPresentation } from '../features/growth/index.js';

export function WeatherDisplay({ weather, season, isDay, t }) {
    const weatherInfo = getWeatherPresentation(weather);
    const seasonInfo = SEASONS[season] || SEASONS.spring;
    const weatherLabel = weather === 'sunny' && !isDay
        ? (t ? t('weatherClearNight') : 'Clear')
        : (t ? t(weatherInfo.nameKey) : weatherInfo.nameKey);
    const seasonLabel = t ? t(seasonInfo.nameKey) : season;
    const weatherEffect = t ? t(weatherInfo.effectKey) : weatherInfo.effectKey;
    const multiplier = weatherInfo.xpMultiplier !== 1 || weatherInfo.coinMultiplier !== 1
        ? `${t ? t('xpBonus', weatherInfo.xpMultiplier) : `XP ×${weatherInfo.xpMultiplier}`} · ${t ? t('coinBonus', weatherInfo.coinMultiplier) : `Coins ×${weatherInfo.coinMultiplier}`}`
        : (t ? t('weatherSteady') : 'Steady growth');
    const DayIcon = isDay ? Sun : Moon;

    return (
        <div
            title={`${weatherLabel} · ${weatherEffect} · ${multiplier} | ${seasonLabel}`}
            className={`weather-chip ${isDay ? 'weather-chip-day' : 'weather-chip-night'}`}
            aria-label={`${weatherLabel}, ${weatherEffect}, ${multiplier}, ${seasonLabel}`}
        >
            <span className="weather-chip-main">
                <span className="weather-chip-group">
                    <DayIcon size={16} />
                    <span className="weather-chip-label">{weatherLabel}</span>
                </span>
                <span className="weather-chip-divider" aria-hidden="true" />
                <span className="weather-chip-group">
                    <Leaf size={16} />
                    <span className="weather-chip-label">{seasonLabel}</span>
                </span>
            </span>
            <span className="weather-chip-detail">
                <span>{weatherEffect}</span>
                <strong>{multiplier}</strong>
            </span>
        </div>
    );
}
