import sharedGameData from '../../../../shared/game-data.json' with { type: 'json' };

const WEATHER_COPY_KEYS = {
  sunny: { nameKey: 'weatherSunny', effectKey: 'weatherEffectSunny' },
  cloudy: { nameKey: 'weatherCloudy', effectKey: 'weatherEffectCloudy' },
  rainy: { nameKey: 'weatherRainy', effectKey: 'weatherEffectRainy' },
  stormy: { nameKey: 'weatherStormy', effectKey: 'weatherEffectStormy' },
  snowy: { nameKey: 'weatherSnowy', effectKey: 'weatherEffectSnowy' },
};

/**
 * Get weather presentation data for a given weather type.
 * Falls back to sunny for unknown / invalid weather.
 *
 * @param {string} weather — one of 'sunny', 'cloudy', 'rainy', 'stormy', 'snowy'
 * @returns {{ nameKey: string, effectKey: string, xpMultiplier: number, coinMultiplier: number }}
 */
export function getWeatherPresentation(weather) {
  const requestedKey = typeof weather === 'string' ? weather.toLowerCase() : '';
  const key = sharedGameData.weatherModifiers[requestedKey] ? requestedKey : 'sunny';
  const modifier = sharedGameData.weatherModifiers[key];

  return {
    ...WEATHER_COPY_KEYS[key],
    xpMultiplier: modifier.xpMult,
    coinMultiplier: modifier.coinMult,
  };
}
