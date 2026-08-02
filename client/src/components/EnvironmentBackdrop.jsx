import React from 'react';

export const EnvironmentBackdrop = ({
    isDay,
    weather = 'sunny',
    season = 'spring',
    goldenHourActive = false,
}) => {
    const backgroundAsset = isDay
        ? '/assets/environments/day-forest.png'
        : '/assets/environments/night-garden.png';
    return (
        <div
            className={[
                'environment-backdrop',
                isDay ? 'environment-day' : 'environment-night',
                `environment-${weather}`,
                `environment-${season}`,
                goldenHourActive ? 'environment-golden-hour' : '',
            ].filter(Boolean).join(' ')}
            aria-hidden="true"
        >
            <img className="environment-art" src={backgroundAsset} alt="" />
            <div className="environment-sky-glow" />
            <div className="environment-vignette" />
            <div className="environment-mist" />
            <div className="environment-light-beams" />
            {!isDay && <div className="environment-stars" />}
            <div className="environment-birds">
                <span />
                <span />
                <span />
            </div>
            <div className="environment-ground-decor">
                <span />
                <span />
                <span />
            </div>
            {weather === 'rainy' && <div className="environment-ripples" />}
            {weather === 'stormy' && <div className="environment-lightning" />}
            {(weather === 'snowy' || season === 'winter') && <div className="environment-snowbank" />}
        </div>
    );
};
