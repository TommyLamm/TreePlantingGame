import React, { useCallback, useRef } from 'react';
import { CollectionModal } from '../CollectionModal';
import { StoreModal } from '../StoreModal';
import { ProfileModal } from '../ProfileModal';
import { LeaderboardModal } from '../LeaderboardModal';
import { DailyRewardModal } from '../DailyRewardModal';
import { OfflineEarningsModal } from '../OfflineEarningsModal';
import { PrestigeModal } from '../PrestigeModal';
import { StatsModal } from '../StatsModal';
import { MiniGameModal } from '../MiniGameModal';
import { CompanionSelect } from '../CompanionSelect';
import { GardenVisitModal } from '../GardenVisitModal';
import { useModalFocus } from '../../hooks/useModalFocus';

export function GameModals({
    visibility,
    focusSuspended,
    returnFocusRef,
    game,
    currentUser,
    t,
    leaderboardData,
    gardenVisitData,
    giftError,
    gamesRemaining,
    onClose,
    onLogout,
    onBuy,
    onEquip,
    onProfileSave,
    onVisitGarden,
    onGift,
    onClaimDailyReward,
    onOfflineClose,
    onPrestige,
    onPrestigeUpgrade,
    onMinigameReward,
    onBuyCompanion,
    onEquipCompanion,
}) {
    const layerRef = useRef(null);
    const activeModal = Object.keys(visibility || {}).filter(name => visibility[name]).at(-1) || null;
    const focusTarget = focusSuspended ? null : activeModal;
    const closeActiveModal = useCallback(() => {
        if (!activeModal) return;
        if (activeModal === 'offlineEarnings') onOfflineClose();
        else onClose(activeModal);
    }, [activeModal, onClose, onOfflineClose]);

    useModalFocus({ activeKey: focusTarget, onClose: closeActiveModal, rootRef: layerRef, returnFocusRef });

    if (!activeModal) return null;

    return (
        <div className="game-modals-layer" ref={layerRef}>
            {visibility.collection && <CollectionModal currentLevel={game.level} achievements={game.achievements} onClose={() => onClose('collection')} t={t} />}
            {visibility.store && <StoreModal userCoins={game.coins} inventory={game.inventory} onBuy={onBuy} onEquip={onEquip} onClose={() => onClose('store')} t={t} />}
            {visibility.profile && (
                <ProfileModal
                    username={currentUser}
                    joinDate={game.joinDate}
                    playTimeMs={game.playTimeMs}
                    interactions={game.interactions}
                    profileData={game.profileData}
                    onSave={onProfileSave}
                    onClose={() => onClose('profile')}
                    onLogout={onLogout}
                    t={t}
                />
            )}
            {visibility.leaderboard && (
                <LeaderboardModal
                    data={leaderboardData}
                    currentUser={currentUser}
                    onVisitGarden={onVisitGarden}
                    onClose={() => onClose('leaderboard')}
                    t={t}
                />
            )}
            {visibility.dailyReward && (
                <DailyRewardModal
                    loginStreak={game.loginStreak}
                    currentDayIndex={((game.loginStreak || 1) - 1) % 7}
                    claimed={game.dailyRewardClaimed}
                    onClaim={onClaimDailyReward}
                    onClose={() => onClose('dailyReward')}
                    t={t}
                />
            )}
            {visibility.offlineEarnings && (
                <OfflineEarningsModal
                    xpEarned={game.lastOfflineXp}
                    coinsEarned={game.lastOfflineCoins}
                    timeAwayMs={game.lastOfflineXp > 0 ? (game.lastOfflineXp / 1 * 3600000) : 60000}
                    onClose={onOfflineClose}
                    t={t}
                />
            )}
            {visibility.prestige && (
                <PrestigeModal
                    currentLevel={game.level}
                    generation={game.generation}
                    prestigePoints={game.prestigePoints}
                    prestigeUpgrades={game.prestigeUpgrades}
                    onPrestige={onPrestige}
                    onUpgrade={onPrestigeUpgrade}
                    onClose={() => onClose('prestige')}
                    t={t}
                />
            )}
            {visibility.stats && (
                <StatsModal
                    stats={{
                        level: game.level,
                        generation: game.generation,
                        coins: game.coins,
                        totalXpEarned: game.totalXpEarned,
                        totalCoinsEarned: game.totalCoinsEarned,
                        totalEventsResolved: game.totalEventsResolved,
                        interactionCount: game.interactions,
                        maxCombo: game.maxCombo,
                        maxLoginStreak: game.maxLoginStreak,
                        playTimeMs: game.playTimeMs,
                        joinDate: game.joinDate,
                        achievements: game.achievements,
                    }}
                    onClose={() => onClose('stats')}
                    t={t}
                />
            )}
            {visibility.miniGames && (
                <MiniGameModal
                    gamesRemaining={gamesRemaining}
                    onReward={onMinigameReward}
                    onClose={() => onClose('miniGames')}
                    t={t}
                />
            )}
            {visibility.companions && (
                <CompanionSelect
                    unlockedCompanions={game.unlockedCompanions}
                    equippedCompanion={game.companion}
                    userCoins={game.coins}
                    userLevel={game.level}
                    generation={game.generation}
                    onBuy={onBuyCompanion}
                    onEquip={onEquipCompanion}
                    onClose={() => onClose('companions')}
                    t={t}
                />
            )}
            {visibility.gardenVisit && (
                <GardenVisitModal
                    visitData={gardenVisitData}
                    currentUser={currentUser}
                    onGift={onGift}
                    giftError={giftError}
                    onClose={() => onClose('gardenVisit')}
                    t={t}
                />
            )}
        </div>
    );
}
