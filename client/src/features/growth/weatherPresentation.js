// ──────────────────────────────────────────────
// Weather Presentation Model
// ──────────────────────────────────────────────
// Aligned with server WEATHER_MODIFIERS:
//   sunny:  xpMult=1.2, coinMult=1.0
//   cloudy: xpMult=1.0, coinMult=1.0
//   rainy:  xpMult=1.3, coinMult=0.9
//   stormy: xpMult=0.8, coinMult=1.3
//   snowy:  xpMult=1.0, coinMult=1.2

const WEATHER_PRESENTATIONS = {
  sunny: {
    nameKey: 'weatherSunny',
    effectKey: 'weatherEffectSunny',
    xpMultiplier: 1.2,
    coinMultiplier: 1.0,
  },
  cloudy: {
    nameKey: 'weatherCloudy',
    effectKey: 'weatherEffectCloudy',
    xpMultiplier: 1.0,
    coinMultiplier: 1.0,
  },
  rainy: {
    nameKey: 'weatherRainy',
    effectKey: 'weatherEffectRainy',
    xpMultiplier: 1.3,
    coinMultiplier: 0.9,
  },
  stormy: {
    nameKey: 'weatherStormy',
    effectKey: 'weatherEffectStormy',
    xpMultiplier: 0.8,
    coinMultiplier: 1.3,
  },
  snowy: {
    nameKey: 'weatherSnowy',
    effectKey: 'weatherEffectSnowy',
    xpMultiplier: 1.0,
    coinMultiplier: 1.2,
  },
};

/**
 * Get weather presentation data for a given weather type.
 * Falls back to sunny for unknown / invalid weather.
 *
 * @param {string} weather — one of 'sunny', 'cloudy', 'rainy', 'stormy', 'snowy'
 * @returns {{ nameKey: string, effectKey: string, xpMultiplier: number, coinMultiplier: number }}
 */
export function getWeatherPresentation(weather) {
  if (typeof weather !== 'string') {
    return { ...WEATHER_PRESENTATIONS.sunny };
  }
  const key = weather.toLowerCase();
  const entry = WEATHER_PRESENTATIONS[key];
  return entry ? { ...entry } : { ...WEATHER_PRESENTATIONS.sunny };
}
