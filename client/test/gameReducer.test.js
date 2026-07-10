import assert from 'node:assert/strict';
import test from 'node:test';

import { gameReducer, initialGameState } from '../src/state/gameReducer.js';

function createDirtyGameState() {
    return {
        ...initialGameState,
        xp: 123,
        level: 99,
        coins: 456,
        inventory: { owned: ['stale-item'] },
        profileData: { displayName: 'Stale profile' },
        joinDate: '2024-01-01T00:00:00.000Z',
        playTimeMs: 987654,
        interactions: 321,
        achievements: ['stale-achievement'],
        activeEvent: { type: 'STALE_EVENT' },
        isDemoMode: true,
        weather: 'stormy',
        season: 'winter',
        combo: 8,
        maxCombo: 13,
        companion: { id: 'stale-companion' },
        unlockedCompanions: ['stale-companion'],
        generation: 4,
        prestigePoints: 5,
        prestigeUpgrades: { staleUpgrade: 2 },
        loginStreak: 6,
        maxLoginStreak: 12,
        dailyRewardClaimed: true,
        dailyRewardAvailable: true,
        totalXpEarned: 1000,
        totalCoinsEarned: 2000,
        totalEventsResolved: 30,
        lastOfflineXp: 40,
        lastOfflineCoins: 50,
        goldenHourUntil: 1700000000000,
        minigameCount: 7,
        minigameDate: '2024-06-15',
    };
}

test('initialGameState contains the complete game state', () => {
    assert.deepEqual(initialGameState, {
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
    });
});

test('SYNC_SERVER maps every server field and coerces core numeric values', () => {
    const inventory = { owned: ['watering-can'] };
    const achievements = ['first-sprout'];
    const profile = { displayName: 'Willow' };
    const activeEvent = { type: 'RAIN' };
    const companion = { id: 'fox' };
    const unlockedCompanions = ['fox', 'owl'];
    const prestigeUpgrades = { growth: 2 };
    const data = {
        xp: '12.5',
        level: '4',
        coins: '99',
        inventory,
        joinDate: '2025-01-02T03:04:05.000Z',
        playTime: 123456,
        interactionCount: 27,
        achievements,
        profile,
        activeEvent,
        isDemoMode: true,
        weather: 'rainy',
        season: 'autumn',
        combo: 3,
        maxCombo: 7,
        companion,
        unlockedCompanions,
        generation: 2,
        prestigePoints: 8,
        prestigeUpgrades,
        loginStreak: 5,
        maxLoginStreak: 11,
        dailyRewardClaimed: true,
        dailyRewardAvailable: true,
        totalXpEarned: 2345,
        totalCoinsEarned: 678,
        totalEventsResolved: 19,
        lastOfflineXp: 4.5,
        lastOfflineCoins: 6,
        goldenHourUntil: 1700000000000,
        minigameCount: 3,
        minigameDate: '2025-01-02',
    };

    assert.deepEqual(gameReducer(initialGameState, { type: 'SYNC_SERVER', data }), {
        ...initialGameState,
        xp: 12.5,
        level: 4,
        coins: 99,
        inventory,
        joinDate: '2025-01-02T03:04:05.000Z',
        playTimeMs: 123456,
        interactions: 27,
        achievements,
        profileData: profile,
        activeEvent,
        isDemoMode: true,
        weather: 'rainy',
        season: 'autumn',
        combo: 3,
        maxCombo: 7,
        companion,
        unlockedCompanions,
        generation: 2,
        prestigePoints: 8,
        prestigeUpgrades,
        loginStreak: 5,
        maxLoginStreak: 11,
        dailyRewardClaimed: true,
        dailyRewardAvailable: true,
        totalXpEarned: 2345,
        totalCoinsEarned: 678,
        totalEventsResolved: 19,
        lastOfflineXp: 4.5,
        lastOfflineCoins: 6,
        goldenHourUntil: 1700000000000,
        minigameCount: 3,
        minigameDate: '2025-01-02',
    });
});

test('SYNC_SERVER overwrites stale state with the existing fallback values', () => {
    const state = createDirtyGameState();
    const sourceSnapshot = structuredClone(state);
    const result = gameReducer(state, {
        type: 'SYNC_SERVER',
        data: {
            xp: 0,
            level: 1,
            coins: 0,
            weather: '',
            combo: false,
            companion: '',
            unlockedCompanions: false,
            prestigeUpgrades: false,
            minigameDate: '',
        },
    });

    assert.deepEqual({
        achievements: result.achievements,
        weather: result.weather,
        season: result.season,
        combo: result.combo,
        maxCombo: result.maxCombo,
        companion: result.companion,
        unlockedCompanions: result.unlockedCompanions,
        generation: result.generation,
        prestigePoints: result.prestigePoints,
        prestigeUpgrades: result.prestigeUpgrades,
        loginStreak: result.loginStreak,
        maxLoginStreak: result.maxLoginStreak,
        dailyRewardClaimed: result.dailyRewardClaimed,
        dailyRewardAvailable: result.dailyRewardAvailable,
        totalXpEarned: result.totalXpEarned,
        totalCoinsEarned: result.totalCoinsEarned,
        totalEventsResolved: result.totalEventsResolved,
        lastOfflineXp: result.lastOfflineXp,
        lastOfflineCoins: result.lastOfflineCoins,
        goldenHourUntil: result.goldenHourUntil,
        minigameCount: result.minigameCount,
        minigameDate: result.minigameDate,
    }, {
        achievements: [],
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
    });
    assert.deepEqual(state, sourceSnapshot);
});

const localUpdateCases = [
    { type: 'SET_DEMO', field: 'isDemoMode', value: true, prepare: state => ({ ...state, isDemoMode: false }) },
    { type: 'SET_COINS', field: 'coins', value: 42 },
    { type: 'SET_INVENTORY', field: 'inventory', value: { owned: ['gloves'] } },
    { type: 'SET_PROFILE', field: 'profileData', value: { displayName: 'Aspen' } },
    { type: 'SET_EVENT', field: 'activeEvent', value: { type: 'PEST' } },
];

for (const { type, field, value, prepare = state => state } of localUpdateCases) {
    test(`${type} updates only ${field} without mutating its dirty source state`, () => {
        const state = prepare(createDirtyGameState());
        const sourceSnapshot = structuredClone(state);
        const result = gameReducer(state, { type, value });

        assert.deepEqual(result, { ...state, [field]: value });
        assert.notStrictEqual(result, state);
        assert.deepEqual(state, sourceSnapshot);
    });
}

test('RESET returns a fresh initial state without mutating its dirty source state', () => {
    const state = createDirtyGameState();
    const sourceSnapshot = structuredClone(state);
    const result = gameReducer(state, { type: 'RESET' });

    assert.deepEqual(result, initialGameState);
    assert.notStrictEqual(result, initialGameState);
    assert.deepEqual(state, sourceSnapshot);
});

test('unknown actions preserve state identity', () => {
    const state = createDirtyGameState();

    assert.strictEqual(gameReducer(state, { type: 'UNKNOWN' }), state);
    assert.strictEqual(gameReducer(initialGameState, { type: 'UNKNOWN' }), initialGameState);
});
