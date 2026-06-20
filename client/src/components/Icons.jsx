import React from 'react';

const ICON_ASSETS = {
    CloudRain: 'cloud-rain',
    Bug: 'bug',
    Sun: 'sun',
    Moon: 'moon',
    Zap: 'zap',
    Shovel: 'shovel',
    Droplets: 'droplets',
    Sparkles: 'sparkles',
    Clock: 'clock',
    Volume2: 'volume-2',
    VolumeX: 'volume-x',
    Leaf: 'leaf',
    User: 'user',
    CloudCheck: 'cloud-check',
    CloudOff: 'cloud-off',
    BookOpen: 'book-open',
    Lock: 'lock',
    Coins: 'coins',
    ShoppingCart: 'shopping-cart',
    Scissors: 'scissors',
    SunMedium: 'sun-medium',
    CloudLightning: 'cloud-lightning',
    Trophy: 'trophy',
    X: 'close',
};

const makeIcon = (asset, label) => {
    const Icon = ({ size = 24, className = '', alt = '', color, style, ...props }) => {
        const maskUrl = `url(/assets/icons/${asset}.png)`;
        return (
        <span
            className={`asset-icon ${className}`.trim()}
            role={alt ? 'img' : undefined}
            aria-label={alt || undefined}
            aria-hidden={alt ? undefined : true}
            style={{
                width: size,
                height: size,
                backgroundColor: color || 'currentColor',
                WebkitMaskImage: maskUrl,
                maskImage: maskUrl,
                ...style,
            }}
            {...props}
        />
        );
    };
    Icon.displayName = label;
    return Icon;
};

export const CloudRain = makeIcon(ICON_ASSETS.CloudRain, 'CloudRain');
export const Bug = makeIcon(ICON_ASSETS.Bug, 'Bug');
export const Sun = makeIcon(ICON_ASSETS.Sun, 'Sun');
export const Moon = makeIcon(ICON_ASSETS.Moon, 'Moon');
export const Zap = makeIcon(ICON_ASSETS.Zap, 'Zap');
export const Shovel = makeIcon(ICON_ASSETS.Shovel, 'Shovel');
export const Droplets = makeIcon(ICON_ASSETS.Droplets, 'Droplets');
export const Sparkles = makeIcon(ICON_ASSETS.Sparkles, 'Sparkles');
export const Clock = makeIcon(ICON_ASSETS.Clock, 'Clock');
export const Volume2 = makeIcon(ICON_ASSETS.Volume2, 'Volume2');
export const VolumeX = makeIcon(ICON_ASSETS.VolumeX, 'VolumeX');
export const Leaf = makeIcon(ICON_ASSETS.Leaf, 'Leaf');
export const User = makeIcon(ICON_ASSETS.User, 'User');
export const CloudCheck = makeIcon(ICON_ASSETS.CloudCheck, 'CloudCheck');
export const CloudOff = makeIcon(ICON_ASSETS.CloudOff, 'CloudOff');
export const BookOpen = makeIcon(ICON_ASSETS.BookOpen, 'BookOpen');
export const Lock = makeIcon(ICON_ASSETS.Lock, 'Lock');
export const Coins = makeIcon(ICON_ASSETS.Coins, 'Coins');
export const ShoppingCart = makeIcon(ICON_ASSETS.ShoppingCart, 'ShoppingCart');
export const Scissors = makeIcon(ICON_ASSETS.Scissors, 'Scissors');
export const SunMedium = makeIcon(ICON_ASSETS.SunMedium, 'SunMedium');
export const CloudLightning = makeIcon(ICON_ASSETS.CloudLightning, 'CloudLightning');
export const Trophy = makeIcon(ICON_ASSETS.Trophy, 'Trophy');
export const X = makeIcon(ICON_ASSETS.X, 'X');
