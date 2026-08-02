import React from 'react';
import { Moon, Sun, Leaf } from './Icons';
import { SEASONS } from '../constants';
import { getWeatherPresentation } from '../features/growth/index.js';

export function WeatherDisplay({ weather, season, isDay, t }) {
    const translate = t || (key => key);
    const weatherInfo = getWeatherPresentation(weather);
    const seasonInfo = SEASONS[season] || SEASONS.spring;
    const weatherLabel = weather === 'sunny' && !isDay
        ? translate('weatherClearNight')
        : translate(weatherInfo.nameKey);
    const seasonLabel = translate(seasonInfo.nameKey);
    const weatherEffect = translate(weatherInfo.effectKey);
    const multiplier = weatherInfo.xpMultiplier !== 1 || weatherInfo.coinMultiplier !== 1
        ? `${translate('xpBonus', weatherInfo.xpMultiplier)} · ${translate('coinBonus', weatherInfo.coinMultiplier)}`
        : translate('weatherSteady');
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
