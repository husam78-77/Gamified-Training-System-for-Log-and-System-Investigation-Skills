/**
 * ObjectivesPanel.jsx
 * Displays mission objectives with live status updates.
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
        <section className="bg-surface-container-low/30 p-5 border-l border-white/5 flex flex-col gap-4 flex-1 h-full overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="font-sans text-xs font-black tracking-[0.25em] text-white uppercase">
                    MISSION_OBJECTIVES
                </h2>
                <span className="font-sans text-[10px] font-bold text-[#00EBF7] tracking-wider bg-[#00EBF7]/10 px-2 py-0.5">
                    {completedCount}/{totalRequired}
                </span>
            </div>

            {/* Completion progress bar */}
            <div className="relative h-[2px] bg-white/10 w-full overflow-visible">
                <div
                    className="absolute top-0 left-0 h-full bg-[#00EBF7] transition-all duration-700"
                    style={{ width: `${completionPercent}%` }}
                ></div>
                {completionPercent > 0 && completionPercent < 100 && (
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-[#00EBF7] rounded-full animate-pulse shadow-[0_0_6px_#00EBF7]"
                        style={{ left: `calc(${completionPercent}% - 4px)` }}
                    ></div>
                )}
            </div>

            {/* Objectives list */}
            <ul className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[100px]">
                {objectives.length === 0 && (
                    <li className="font-sans text-xs text-white italic">
                        Loading objectives...
                    </li>
                )}
                {objectives.map(obj => (
                    <ObjectiveItem key={obj.objective_id} objective={obj} />
                ))}
            </ul>

            {/* Secret objectives — only when revealed */}
            {secretObjectives.length > 0 && (
                <div className="border-t border-[#FF003C]/30 pt-4 mt-1">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#FF003C] text-sm"
                            style={{ fontVariationSettings: "'FILL' 1" }}>
                            stars
                        </span>
                        <span className="font-sans text-[10px] font-black text-[#FF003C] tracking-[0.3em] uppercase">
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

function ObjectiveItem({ objective, isSecret = false }) {
    const { status, title, description } = objective;

    const isCompleted = status === OBJECTIVE_STATUS.COMPLETED;
    const isInProgress = status === OBJECTIVE_STATUS.IN_PROGRESS;
    const isIncomplete = status === OBJECTIVE_STATUS.INCOMPLETE;

    return (
        <li className={`flex items-start gap-3 transition-all duration-500 ${isCompleted ? 'opacity-60' :
                isInProgress ? 'opacity-100' :
                    'opacity-50'
            }`}>

            {/* Status icon */}
            <div className="flex-shrink-0 mt-[2px]">
                {isCompleted && (
                    <span
                        className="material-symbols-outlined text-[16px] text-green-400"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        check_circle
                    </span>
                )}
                {isInProgress && (
                    <span className="material-symbols-outlined text-[16px] text-[#00EBF7] animate-pulse">
                        radio_button_checked
                    </span>
                )}
                {isIncomplete && (
                    <span className="material-symbols-outlined text-[16px] text-white">
                        {isSecret ? 'lock' : 'radio_button_unchecked'}
                    </span>
                )}
            </div>

            {/* Text */}
            <div className="flex flex-col gap-1.5 min-w-0">
                <span className={`font-sans text-[13px] font-black tracking-wider uppercase leading-tight ${isCompleted ? 'line-through text-white' :
                        isInProgress ? 'text-[#00EBF7]' :
                            isSecret ? 'text-[#FF003C]/70' :
                                'text-white'
                    }`}>
                    {title}
                </span>

                {description && (
                    <span className={`text-xs font-sans leading-relaxed text-white/90`}>
                        {isCompleted ? 'OBJECTIVE_COMPLETE' : description}
                    </span>
                )}

                {isCompleted && objective.xp_reward > 0 && (
                    <span className="text-[9px] font-sans text-green-400/70 font-bold">
                        +{objective.xp_reward} XP
                    </span>
                )}
            </div>
        </li>
    );
}