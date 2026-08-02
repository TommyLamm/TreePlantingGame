import React from 'react';
import { Leaf, X } from '../Icons';
import { ONBOARDING_STEPS } from '../../features/objectives/index.js';

export function OnboardingOverlay({ state, t, onBack, onNext, onDismiss, onComplete }) {
    if (!state?.active) return null;

    const step = ONBOARDING_STEPS[state.step] || ONBOARDING_STEPS[0];
    const isLast = state.step >= state.stepCount - 1;
    const progress = Math.min(100, ((state.step + 1) / Math.max(1, state.stepCount)) * 100);

    return (
        <div className="onboarding-backdrop" role="presentation">
            <section className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
                <div className="onboarding-ring-art" aria-hidden="true">
                    <span />
                    <span />
                    <span><Leaf size={18} /></span>
                </div>
                <button type="button" className="onboarding-close" onClick={onDismiss} aria-label={t('close')}>
                    <X size={18} />
                </button>
                <div className="onboarding-copy">
                    <p className="panel-eyebrow">{t('onboardingEyebrow')}</p>
                    <h2 id="onboarding-title">{t(step.labelKey)}</h2>
                    <p>{t(step.descriptionKey)}</p>
                </div>
                <div className="onboarding-progress" aria-label={t('onboardingProgress', state.step + 1, state.stepCount)}>
                    <span style={{ width: `${progress}%` }} />
                </div>
                <div className="onboarding-step-meta">
                    <span>{t('onboardingProgress', state.step + 1, state.stepCount)}</span>
                    <span>{t('onboardingShortHint')}</span>
                </div>
                <div className="onboarding-actions">
                    <button type="button" className="button-quiet" onClick={onDismiss}>{t('skip')}</button>
                    <div className="onboarding-actions-right">
                        <button type="button" className="button-secondary" onClick={onBack} disabled={state.step === 0}>
                            <span className="onboarding-back-arrow" aria-hidden="true">←</span>
                            {t('back')}
                        </button>
                        <button type="button" className="button-primary" onClick={isLast ? onComplete : onNext}>
                            {isLast ? t('finish') : t('next')}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
