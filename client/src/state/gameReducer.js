export const initialGameState = {
    xp: 0,
    level: 1,
    coins: 0,
    inventory: null,
    profileData: null,
    joinDate: null,
    playTimeMs: 0,
    interactions: 0,
    achievements: [],
    activeEvent: null,
    isDemoMode: false,
    weather: 'sunny',
    season: 'spring',
    combo: 0,
    maxCombo: 0,
    companion: null,
    unlockedCompanions: [],
    generation: 0,
    prestigePoints: 0,
    prestigeUpgrades: {},
    loginStreak: 0,
    maxLoginStreak: 0,
    dailyRewardClaimed: false,
    dailyRewardAvailable: false,
    totalXpEarned: 0,
    totalCoinsEarned: 0,
    totalEventsResolved: 0,
    lastOfflineXp: 0,
    lastOfflineCoins: 0,
    goldenHourUntil: 0,
    minigameCount: 0,
    minigameDate: null,
    nextEventAt: null,
    eventExpiresAt: null,
};

function finiteOr(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

export function gameReducer(state, action) {
    switch (action.type) {
        case 'SYNC_SERVER':
            return {
                ...state,
                xp: Number(action.data.xp),
                level: Number(action.data.level),
                coins: Number(action.data.coins),
                inventory: action.data.inventory,
                joinDate: action.data.joinDate,
                playTimeMs: action.data.playTime,
                interactions: action.data.interactionCount,
                achievements: action.data.achievements || [],
                profileData: action.data.profile,
                activeEvent: action.data.activeEvent,
                isDemoMode: action.data.isDemoMode,
                weather: action.data.weather || 'sunny',
                season: action.data.season || 'spring',
                combo: action.data.combo || 0,
                maxCombo: action.data.maxCombo || 0,
                companion: action.data.companion || null,
                unlockedCompanions: action.data.unlockedCompanions || [],
                generation: action.data.generation || 0,
                prestigePoints: action.data.prestigePoints || 0,
                prestigeUpgrades: action.data.prestigeUpgrades || {},
                loginStreak: action.data.loginStreak || 0,
                maxLoginStreak: action.data.maxLoginStreak || 0,
                dailyRewardClaimed: action.data.dailyRewardClaimed || false,
                dailyRewardAvailable: action.data.dailyRewardAvailable || false,
                totalXpEarned: action.data.totalXpEarned || 0,
                totalCoinsEarned: action.data.totalCoinsEarned || 0,
                totalEventsResolved: action.data.totalEventsResolved || 0,
                lastOfflineXp: action.data.lastOfflineXp || 0,
                lastOfflineCoins: action.data.lastOfflineCoins || 0,
                goldenHourUntil: action.data.goldenHourUntil || 0,
                minigameCount: action.data.minigameCount || 0,
                minigameDate: action.data.minigameDate || null,
                nextEventAt: Number.isFinite(action.data.nextEventAt) ? action.data.nextEventAt : null,
                eventExpiresAt: Number.isFinite(action.data.eventExpiresAt) ? action.data.eventExpiresAt : null,
            };
        case 'APPLY_MINIGAME_REWARD': {
            const gameState = action.data?.gameState;
            if (!gameState || typeof gameState !== 'object') return state;
            return {
                ...state,
                coins: finiteOr(gameState.coins, state.coins),
                xp: finiteOr(gameState.xp, state.xp),
                level: finiteOr(gameState.level, state.level),
                totalXpEarned: finiteOr(gameState.totalXpEarned, state.totalXpEarned),
                totalCoinsEarned: finiteOr(gameState.totalCoinsEarned, state.totalCoinsEarned),
                goldenHourUntil: finiteOr(gameState.goldenHourUntil, state.goldenHourUntil),
                minigameCount: finiteOr(gameState.minigameCount, state.minigameCount),
                minigameDate: typeof gameState.minigameDate === 'string'
                    ? gameState.minigameDate
                    : state.minigameDate,
            };
        }
        case 'SET_DEMO':
            return { ...state, isDemoMode: action.value };
        case 'SET_COINS':
            return { ...state, coins: action.value };
        case 'SET_INVENTORY':
            return { ...state, inventory: action.value };
        case 'SET_PROFILE':
            return { ...state, profileData: action.value };
        case 'SET_EVENT':
            return { ...state, activeEvent: action.value };
        case 'RESET':
            return { ...initialGameState };
        default:
            return state;
    }
}
