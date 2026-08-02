import React from 'react';
import { BookOpen, Leaf, Paw, Recycle, Trophy } from '../Icons';

const OBJECTIVE_ICONS = {
    first_event: Leaf,
    level_5: Trophy,
    first_skin: BookOpen,
    first_companion: Paw,
    prestige_ready: Recycle,
};

export function ObjectiveRail({ objectives = [], t, onNavigate }) {
    const hasObjectives = objectives.length > 0;

    return (
        <section className="objectives-rail glass-panel glass-panel-day" aria-label={t('objectives')}>
            <div className="objectives-heading">
                <div>
                    <p className="panel-eyebrow">{t('today')}</p>
                    <h2>{t('objectives')}</h2>
                </div>
                <span className="objectives-count" aria-label={t('objectivesCount', objectives.length)}>{objectives.length}/3</span>
            </div>

            {hasObjectives ? (
                <ol className="objective-list">
                    {objectives.map(objective => {
                        const Icon = OBJECTIVE_ICONS[objective.id] || Leaf;
                        const progress = objective.target > 0
                            ? Math.min(100, (objective.current / objective.target) * 100)
                            : 0;
                        const content = (
                            <>
                                <span className="objective-icon"><Icon size={17} /></span>
                                <span className="objective-copy">
                                    <span className="objective-title">{t(objective.labelKey)}</span>
                                    <span className="objective-description">{t(objective.descriptionKey)}</span>
                                    <span className="objective-progress" aria-hidden="true">
                                        <span style={{ width: `${progress}%` }} />
                                    </span>
                                    <span className="objective-count">{objective.current} / {objective.target}</span>
                                </span>
                            </>
                        );

                        return (
                            <li key={objective.id} className="objective-item">
                                {objective.navigationTarget ? (
                                    <button
                                        type="button"
                                        className="objective-button"
                                        onClick={() => onNavigate?.(objective)}
                                        aria-label={`${t(objective.labelKey)} · ${t(objective.descriptionKey)}`}
                                    >
                                        {content}
                                    </button>
                                ) : (
                                    <div className="objective-button objective-button-static">{content}</div>
                                )}
                            </li>
                        );
                    })}
                </ol>
            ) : (
                <div className="objectives-empty" role="status">
                    <span className="objectives-empty-mark"><Trophy size={19} /></span>
                    <p>{t('objectivesComplete')}</p>
                    <span>{t('objectivesCompleteDesc')}</span>
                </div>
            )}
        </section>
    );
}
