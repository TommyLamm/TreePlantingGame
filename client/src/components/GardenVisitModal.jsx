import React, { useEffect, useMemo, useState } from 'react';
import { audio } from '../utils/audio';
import { Gift, Handshake, Leaf, Trophy } from './Icons';
import { TreeVisual } from './TreeVisual';
import {
    getHelpErrorDescriptor,
    helpGarden,
    HELP_STATE_DESCRIPTORS,
    normalizeHelpResponse,
} from '../features/social/index.js';

const MAX_HELPERS = 10;

function getInitialHelpState(visitData, currentUser) {
    if (!visitData) return HELP_STATE_DESCRIPTORS.available;
    if (currentUser === visitData.username) return HELP_STATE_DESCRIPTORS.selfHelp;
    if (Array.isArray(visitData.helpers) && visitData.helpers.includes(currentUser)) {
        return HELP_STATE_DESCRIPTORS.alreadyHelped;
    }
    if (Number(visitData.helpCount) >= MAX_HELPERS) return HELP_STATE_DESCRIPTORS.gardenFull;
    return HELP_STATE_DESCRIPTORS.available;
}

export function GardenVisitModal({ visitData, currentUser, onGift, giftError, onClose, t }) {
    const [helpState, setHelpState] = useState(() => getInitialHelpState(visitData, currentUser));
    const [helpPending, setHelpPending] = useState(false);
    const [helpReward, setHelpReward] = useState(null);
    const [helpError, setHelpError] = useState(null);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    useEffect(() => {
        setHelpState(getInitialHelpState(visitData, currentUser));
        setHelpPending(false);
        setHelpReward(null);
        setHelpError(null);
    }, [currentUser, visitData]);

    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget) { audio.playClick(); onClose(); }
    };

    const handleHelp = async () => {
        if (!visitData || !helpState.canHelp || helpPending) return;
        audio.playClick();
        setHelpPending(true);
        setHelpError(null);
        try {
            const result = normalizeHelpResponse(await helpGarden(currentUser, visitData.username));
            if (!result.success) {
                setHelpError(t('social.help.errorUnknown'));
                return;
            }
            setHelpReward(result.reward);
            setHelpState(HELP_STATE_DESCRIPTORS.alreadyHelped);
            audio.playLevelUp();
        } catch (error) {
            const descriptor = getHelpErrorDescriptor(error);
            setHelpError(t(descriptor.messageKey));
            if (descriptor.type === 'daily_limit') setHelpState(HELP_STATE_DESCRIPTORS.dailyLimitReached);
            if (descriptor.type === 'garden_full') setHelpState(HELP_STATE_DESCRIPTORS.gardenFull);
            if (descriptor.type === 'already_helped') setHelpState(HELP_STATE_DESCRIPTORS.alreadyHelped);
        } finally {
            setHelpPending(false);
        }
    };

    const helpCount = Math.min(MAX_HELPERS, Math.max(0, Number(visitData?.helpCount) || 0) + (helpReward ? 1 : 0));
    const helpProgress = (helpCount / MAX_HELPERS) * 100;
    const statusCopy = useMemo(() => {
        if (helpReward) return t('social.help.stateSuccess');
        return t(helpState.messageKey);
    }, [helpReward, helpState.messageKey, t]);

    if (!visitData) return null;

    return (
        <div className="modal-backdrop garden-visit-backdrop" onClick={handleBackdrop}>
            <div className="garden-visit-modal" role="dialog" aria-modal="true" aria-labelledby="garden-visit-title">
                <header className="garden-visit-header">
                    <div className="garden-visit-title-wrap">
                        <span className="garden-visit-title-mark"><Leaf size={17} /></span>
                        <h2 id="garden-visit-title">{t('visiting', visitData.username)}</h2>
                    </div>
                    {visitData.generation > 0 && <span className="garden-visit-generation">{t('generationShort', visitData.generation)}</span>}
                </header>

                <div className="garden-visit-body">
                    <div className="garden-visit-tree">
                        <TreeVisual level={visitData.level} eventType={null} skin={visitData.treeSkin} isStatic={true} t={t} />
                    </div>

                    <div className="garden-visit-badges">
                        <span><Leaf size={15} /> {t('levelValue', visitData.level)}</span>
                        {visitData.companion && <span><Handshake size={15} /> {t(`companion${visitData.companion[0].toUpperCase()}${visitData.companion.slice(1)}`)}</span>}
                        <span><Trophy size={15} /> {(visitData.achievements || []).length}</span>
                    </div>

                    <section className="garden-help-card" aria-live="polite">
                        <div className="garden-help-heading">
                            <div>
                                <p className="panel-eyebrow">{t('gardenHelp')}</p>
                                <strong>{statusCopy}</strong>
                            </div>
                            <span>{helpCount}/{MAX_HELPERS}</span>
                        </div>
                        <div className="garden-help-progress" aria-hidden="true"><span style={{ width: `${helpProgress}%` }} /></div>
                        {helpReward && (
                            <p className="garden-help-reward"><span>+{helpReward.coins}</span> {t('coinsShort')} · <span>+{helpReward.xp}</span> XP</p>
                        )}
                        {helpError && <p className="garden-help-error">{helpError}</p>}
                        <button
                            type="button"
                            className="garden-help-button"
                            disabled={!helpState.canHelp || helpPending}
                            onClick={handleHelp}
                        >
                            <Handshake size={17} />
                            {helpPending ? t('helping') : t('helpGarden')}
                        </button>
                    </section>

                    {currentUser !== visitData.username && (
                        <div className="garden-gift-area">
                            <button
                                type="button"
                                onClick={() => { audio.playClick(); onGift(visitData.username); }}
                                className="garden-gift-button"
                            >
                                <Gift size={17} /> {t('sendGift')} <span>50 {t('coinsShort')}</span>
                            </button>
                            {giftError && <p className="garden-help-error">{giftError}</p>}
                        </div>
                    )}
                </div>

                <footer className="garden-visit-footer">
                    <button type="button" onClick={() => { audio.playClick(); onClose(); }} className="button-secondary">
                        {t('close')}
                    </button>
                </footer>
            </div>
        </div>
    );
}
