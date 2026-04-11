/**
 * ObjectivesPanel.jsx
 * Displays mission objectives with live status updates.
 *
 * Props:
 *   objectives          - array from useObjectives
 *   completedCount      - number
 *   totalRequired       - number
 *   completionPercent   - 0–100
 *   secretObjectives    - array of revealed secret objectives
 */

import React from 'react';
import { OBJECTIVE_STATUS } from '../hooks/useObjectives';

export default function ObjectivesPanel({
    objectives = [],
    completedCount = 0,
    totalRequired = 0,
    completionPercent = 0,
    secretObjectives = [],
}) {
    return (
        <section className="bg-surface-container-low/30 p-5 border-l border-white/5 flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="font-label text-[10px] font-bold tracking-[0.2em] text-on-surface/60 uppercase">
                    Mission_Objectives
                </h2>
                <span className="font-label text-[9px] text-[#00EBF7]/60 tracking-wider">
                    {completedCount}/{totalRequired}
                </span>
            </div>

            {/* Completion progress bar */}
            <div className="relative h-px bg-white/5 w-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-[#00EBF7] transition-all duration-700"
                    style={{ width: `${completionPercent}%` }}
                ></div>
                {/* Pulse dot at progress edge */}
                {completionPercent > 0 && completionPercent < 100 && (
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#00EBF7] rounded-full animate-pulse"
                        style={{ left: `calc(${completionPercent}% - 3px)` }}
                    ></div>
                )}
            </div>

            {/* Objectives list */}
            <ul className="space-y-4 flex-1">
                {objectives.length === 0 && (
                    <li className="font-label text-[10px] text-white/20 italic">
                        Loading objectives...
                    </li>
                )}

                {objectives.map(obj => (
                    <ObjectiveItem key={obj.objective_id} objective={obj} />
                ))}
            </ul>

            {/* Secret objectives section — only shows when at least one is revealed */}
            {secretObjectives.length > 0 && (
                <div className="border-t border-[#FF003C]/20 pt-4 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#FF003C] text-sm">
                            stars
                        </span>
                        <span className="font-label text-[9px] text-[#FF003C]/60 tracking-[0.3em] uppercase">
                            Secret_Objectives
                        </span>
                    </div>
                    <ul className="space-y-3">
                        {secretObjectives.map(obj => (
                            <ObjectiveItem key={obj.objective_id} objective={obj} isSecret />
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

// ── Single objective row ──────────────────────────────────────────────────

function ObjectiveItem({ objective, isSecret = false }) {
    const { status, title, description } = objective;

    const isCompleted = status === OBJECTIVE_STATUS.COMPLETED;
    const isInProgress = status === OBJECTIVE_STATUS.IN_PROGRESS;
    const isIncomplete = status === OBJECTIVE_STATUS.INCOMPLETE;

    return (
        <li className={`flex items-start gap-3 transition-all duration-500 ${isCompleted ? 'opacity-50' :
                isInProgress ? 'opacity-100' :
                    'opacity-40'
            }`}>
            {/* Status icon */}
            <div className="flex-shrink-0 mt-0.5">
                {isCompleted && (
                    <span
                        className="material-symbols-outlined text-[18px] text-green-500/80"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        check_circle
                    </span>
                )}
                {isInProgress && (
                    <span className="material-symbols-outlined text-[18px] text-[#00EBF7] animate-pulse">
                        radio_button_checked
                    </span>
                )}
                {isIncomplete && (
                    <span className="material-symbols-outlined text-[18px] text-white/30">
                        {isSecret ? 'lock' : 'radio_button_unchecked'}
                    </span>
                )}
            </div>

            {/* Text */}
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className={`font-label text-[10px] font-bold tracking-wider uppercase truncate ${isCompleted ? 'line-through text-white/30' :
                        isInProgress ? 'text-[#00EBF7]' :
                            isSecret ? 'text-[#FF003C]/60' :
                                'text-white/50'
                    }`}>
                    {title}
                </span>

                {description && (
                    <span className="text-[8px] font-label text-white/20 leading-relaxed">
                        {isCompleted ? 'OBJECTIVE_COMPLETE' : description}
                    </span>
                )}

                {/* XP badge */}
                {isCompleted && objective.xp_reward > 0 && (
                    <span className="text-[8px] font-label text-green-400/60 mt-0.5">
                        +{objective.xp_reward} XP
                    </span>
                )}
            </div>
        </li>
    );
}