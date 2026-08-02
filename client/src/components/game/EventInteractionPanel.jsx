import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ARCHETYPE_HOLD,
    ARCHETYPE_SEQUENCE,
    ARCHETYPE_TIMING,
    createInteraction,
    getStateArchetype,
    getCompletedAction,
    getEventDefinition,
    getInstructionKey,
    getProgress,
    getStep,
    getStatus,
    getTotalSteps,
    isTerminal,
    updateInteraction,
    completeInteraction,
    failInteraction,
} from '../../features/events/index.js';
import { Bug, CloudLightning, Droplets, Scissors, Shovel, SunMedium, Zap } from '../Icons';
import { ActionButton } from '../ActionButton';

const EVENT_ICONS = {
    WATER: Droplets,
    PEST: Bug,
    FERTILIZE: Shovel,
    PRUNE: Scissors,
    SUNLIGHT: SunMedium,
    STORM: CloudLightning,
};

const ARCHETYPE_KEYS = {
    [ARCHETYPE_HOLD]: 'eventArchetypeHold',
    [ARCHETYPE_SEQUENCE]: 'eventArchetypeSequence',
    [ARCHETYPE_TIMING]: 'eventArchetypeTiming',
};

const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now());

function useReducedMotion() {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined;
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(media.matches);
        update();
        media.addEventListener?.('change', update);
        return () => media.removeEventListener?.('change', update);
    }, []);

    return reduced;
}

export function EventInteractionPanel({ eventType, t, onAction }) {
    const reducedMotion = useReducedMotion();
    const [interaction, setInteraction] = useState(() => createInteraction(eventType, now()));
    const interactionRef = useRef(interaction);
    const isHoldingRef = useRef(false);
    const submittedRef = useRef(false);
    const [feedback, setFeedback] = useState(null);

    const archetype = getStateArchetype(interaction);
    const definition = useMemo(() => getEventDefinition(eventType), [eventType]);
    const status = getStatus(interaction);
    const progress = getProgress(interaction);
    const currentStep = getStep(interaction);
    const totalSteps = getTotalSteps(interaction);
    const instructionKey = getInstructionKey(interaction);
    const EventIcon = EVENT_ICONS[eventType] || Zap;

    const setNextInteraction = useCallback((next) => {
        interactionRef.current = next;
        setInteraction(next);
    }, []);

    const resetInteractionForEvent = useCallback(() => {
        const timestamp = now();
        const next = createInteraction(eventType, timestamp, { deterministicMode: reducedMotion });
        interactionRef.current = next;
        submittedRef.current = false;
        isHoldingRef.current = false;
        setFeedback(null);
        setInteraction(next);
    }, [eventType, reducedMotion]);

    useEffect(() => {
        resetInteractionForEvent();
    }, [resetInteractionForEvent]);

    const submitCompletedAction = useCallback((next) => {
        const completed = getCompletedAction(next);
        if (!completed) return;
        if (completed.success) {
            setFeedback('success');
            if (!submittedRef.current) {
                submittedRef.current = true;
                onAction(completed.eventType);
            }
        } else {
            setFeedback('failed');
        }
    }, [onAction]);

    useEffect(() => {
        submitCompletedAction(interaction);
    }, [interaction, submitCompletedAction]);

    useEffect(() => {
        if (isTerminal(interaction)) return undefined;
        if (archetype === ARCHETYPE_SEQUENCE) return undefined;
        if (reducedMotion && status === 'idle') return undefined;
        if (archetype === ARCHETYPE_HOLD && !isHoldingRef.current) return undefined;

        const timer = window.setInterval(() => {
            const current = interactionRef.current;
            if (isTerminal(current)) return;
            const timestamp = now();
            const elapsed = timestamp - current.startedAt;
            const next = updateInteraction(current, { elapsed }, timestamp);
            if (next !== current) setNextInteraction(next);
        }, reducedMotion ? 120 : 60);

        return () => window.clearInterval(timer);
    }, [archetype, interaction, reducedMotion, setNextInteraction, status]);

    const handleHoldStart = useCallback(() => {
        if (archetype !== ARCHETYPE_HOLD || isTerminal(interactionRef.current)) return;
        isHoldingRef.current = true;
        const timestamp = now();
        const current = interactionRef.current.status === 'idle'
            ? createInteraction(eventType, timestamp, { deterministicMode: reducedMotion })
            : interactionRef.current;
        const next = updateInteraction(current, { elapsed: reducedMotion ? 1 : 0 }, timestamp);
        setNextInteraction(next);
    }, [archetype, eventType, reducedMotion, setNextInteraction]);

    const handleHoldEnd = useCallback(() => {
        if (archetype !== ARCHETYPE_HOLD || !isHoldingRef.current) return;
        isHoldingRef.current = false;
        const current = interactionRef.current;
        if (isTerminal(current)) return;
        const timestamp = now();
        const next = updateInteraction(current, {
            elapsed: timestamp - current.startedAt,
            released: true,
        }, timestamp);
        setNextInteraction(next);
    }, [archetype, setNextInteraction]);

    const handleKeyboardHoldStart = useCallback((event) => {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            handleHoldStart();
        }
    }, [handleHoldStart]);

    const handleKeyboardHoldEnd = useCallback((event) => {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            handleHoldEnd();
        }
    }, [handleHoldEnd]);

    const handleSequenceStep = useCallback(() => {
        if (archetype !== ARCHETYPE_SEQUENCE || isTerminal(interactionRef.current)) return;
        const current = interactionRef.current;
        const timestamp = now();
        const next = updateInteraction(
            current.status === 'idle'
                ? createInteraction(eventType, timestamp, { deterministicMode: reducedMotion })
                : current,
            { stepIndex: currentStep },
            timestamp,
        );
        setNextInteraction(next);
    }, [archetype, currentStep, eventType, reducedMotion, setNextInteraction]);

    const handleTimingAttempt = useCallback(() => {
        if (archetype !== ARCHETYPE_TIMING || isTerminal(interactionRef.current)) return;
        let current = interactionRef.current;
        const timestamp = now();
        if (current.status === 'idle') {
            current = updateInteraction(current, { elapsed: 0 }, timestamp);
        }
        const elapsed = timestamp - current.startedAt;
        const next = elapsed >= definition.windowStartMs && elapsed <= definition.windowEndMs
            ? completeInteraction(current, timestamp)
            : failInteraction(current, timestamp);
        setNextInteraction(next);
    }, [archetype, definition, setNextInteraction]);

    const handleActionClick = useCallback(() => {
        if (archetype === ARCHETYPE_HOLD) {
            // Keyboard activation has no pointer lifecycle; give it a deterministic,
            // accessible completion path without changing the server action contract.
            handleHoldStart();
            if (reducedMotion) handleHoldEnd();
            return;
        }
        if (archetype === ARCHETYPE_SEQUENCE) {
            handleSequenceStep();
            return;
        }
        handleTimingAttempt();
    }, [archetype, handleHoldEnd, handleHoldStart, handleSequenceStep, handleTimingAttempt, reducedMotion]);

    const handleRetry = useCallback(() => {
        resetInteractionForEvent();
    }, [resetInteractionForEvent]);

    const eventLabels = {
        WATER: t('water'),
        PEST: t('pest'),
        FERTILIZE: t('feed'),
        PRUNE: t('prune'),
        SUNLIGHT: t('sunlight'),
        STORM: t('storm'),
    };

    const instruction = instructionKey ? t(instructionKey) : '';
    const statusLabel = feedback === 'success'
        ? t('eventResolved')
        : feedback === 'failed'
            ? t('eventFailed')
            : instruction;

    return (
        <div className={`event-interaction event-interaction-${archetype} event-interaction-${status}`}>
            <div className="event-interaction-heading">
                <span className="event-interaction-icon"><EventIcon size={18} /></span>
                <span className="event-interaction-copy">
                    <strong role="status" aria-live="polite" aria-atomic="true">{statusLabel}</strong>
                    <span>{t(ARCHETYPE_KEYS[archetype])}</span>
                </span>
                {archetype === ARCHETYPE_TIMING && (
                    <span className="event-window-badge">{t('eventWindow')}</span>
                )}
            </div>

            <div className="event-interaction-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)}>
                <span style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }} />
            </div>

            {archetype === ARCHETYPE_HOLD && (
                <p className="event-interaction-hint">{t('holdHint')}</p>
            )}
            {archetype === ARCHETYPE_SEQUENCE && (
                <div className="event-sequence-steps" aria-label={t('sequenceProgress', currentStep, totalSteps)}>
                    {Array.from({ length: totalSteps }, (_, index) => (
                        <span key={index} className={index < currentStep ? 'is-complete' : index === currentStep ? 'is-current' : ''}>
                            {index < currentStep ? '✓' : index + 1}
                        </span>
                    ))}
                    <small>{t('sequenceProgress', Math.min(currentStep, totalSteps), totalSteps)}</small>
                </div>
            )}
            {archetype === ARCHETYPE_TIMING && (
                <p className="event-interaction-hint">{t('timingHint')}</p>
            )}

            <div className="event-action-buttons" aria-label={t('eventActions')}>
                {Object.entries(EVENT_ICONS).map(([key, Icon]) => {
                    const isActive = key === eventType && !isTerminal(interaction);
                    const holdHandlers = key === eventType && archetype === ARCHETYPE_HOLD
                        ? {
                            onPointerDown: handleHoldStart,
                            onPointerUp: handleHoldEnd,
                            onPointerCancel: handleHoldEnd,
                            onKeyDown: handleKeyboardHoldStart,
                            onKeyUp: handleKeyboardHoldEnd,
                        }
                        : {};
                    return (
                        <ActionButton
                            key={key}
                            icon={<Icon size={18} />}
                            label={eventLabels[key]}
                            isActive={isActive}
                            onClick={key === eventType ? handleActionClick : undefined}
                            {...holdHandlers}
                        />
                    );
                })}
            </div>

            {feedback === 'failed' && (
                <button type="button" className="event-retry-button" onClick={handleRetry}>{t('tryAgain')}</button>
            )}
        </div>
    );
}
