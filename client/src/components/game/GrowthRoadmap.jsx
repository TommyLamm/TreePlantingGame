import React, { useMemo } from 'react';
import { Leaf, Lock, Sparkles } from '../Icons';
import { getGrowthPresentation, getGrowthStage, getNextMilestone } from '../../features/growth/index.js';

const MILESTONE_LEVELS = [1, 5, 12, 26, 46, 66, 86];

export function GrowthRoadmap({ level = 1, season = 'spring', t }) {
    const safeLevel = Math.max(1, Number(level) || 1);
    const safeSeason = typeof season === 'string' && season.length > 0 ? season : 'spring';
    const stage = getGrowthStage(safeLevel);
    const next = getNextMilestone(safeLevel);
    const presentation = useMemo(() => getGrowthPresentation(safeLevel), [safeLevel]);
    const microTicks = Math.min(4, Math.max(1, Math.floor((safeLevel - 1) / 5) + 1));

    return (
        <section className="growth-roadmap glass-panel glass-panel-day" aria-label={t('growthRoadmap')}>
            <div className="growth-roadmap-heading">
                <div>
                    <p className="panel-eyebrow">{t('treeJournal')}</p>
                    <h2>{t('growthRoadmap')}</h2>
                </div>
                <span className="growth-stage-badge">{t('stageShort', stage)}</span>
            </div>

            <div className="growth-ring-summary">
                <div className="growth-ring-emblem" aria-hidden="true">
                    <span className="growth-ring growth-ring-outer" />
                    <span className="growth-ring growth-ring-middle" />
                    <span className="growth-ring growth-ring-inner"><Leaf size={16} /></span>
                </div>
                <div className="growth-ring-copy">
                    <strong>{t(`growthStage${stage}`)}</strong>
                    <span>{t('levelValue', safeLevel)}</span>
                    <span className="growth-next-line">
                        {next.isMax ? t('maxGrowth') : t('nextMilestone', next.level)}
                    </span>
                </div>
            </div>

            <div className="growth-milestone-track" aria-label={t('growthStages')}>
                {MILESTONE_LEVELS.map((milestoneLevel, index) => {
                    const reached = safeLevel >= milestoneLevel;
                    const current = stage === index + 1;
                    return (
                        <span
                            key={milestoneLevel}
                            className={`growth-milestone ${reached ? 'is-reached' : ''} ${current ? 'is-current' : ''}`}
                            title={`${t(`growthStage${index + 1}`)} · ${t('levelValue', milestoneLevel)}`}
                        >
                            {reached ? <Leaf size={12} /> : <Lock size={11} />}
                        </span>
                    );
                })}
            </div>

            <div className="growth-micro-row">
                <span className="growth-micro-label"><Sparkles size={13} /> {t('microGrowth')}</span>
                <span className="growth-micro-ticks" aria-label={t('microGrowthLevel', microTicks)}>
                    {[1, 2, 3, 4].map(tick => (
                        <span key={tick} className={tick <= microTicks ? 'is-lit' : ''} />
                    ))}
                </span>
            </div>

            <div className="growth-tier-copy">
                <span>{t('groundTier', presentation.groundGrowthTier)}</span>
                {presentation.flowerTier > 0 && <span>{t('flowerTier', presentation.flowerTier)}</span>}
                {presentation.fruitTier > 0 && <span>{t('fruitTier', presentation.fruitTier)}</span>}
                {presentation.wildlifeTier > 0 && <span>{t('wildlifeTier', presentation.wildlifeTier)}</span>}
            </div>

            <div className="growth-roadmap-season" data-season={safeSeason}>
                <span className="growth-roadmap-season-dot" />
                <span>{t('seasonalGrowth', t(`season${safeSeason[0].toUpperCase()}${safeSeason.slice(1)}`))}</span>
            </div>
        </section>
    );
}
