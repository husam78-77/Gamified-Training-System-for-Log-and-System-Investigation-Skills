/**
 * useObjectives.js
 * Manages the objectives panel state during a mission.
 *
 * Responsibilities:
 * - Hold all objectives with their current status
 * - Update objectives to 'completed' when terminal engine reports step matches
 * - Reveal secret objectives when their trigger conditions are met
 * - Track overall completion percentage
 * - Expose data for ObjectivesPanel component
 */

import { useState, useEffect, useCallback } from 'react';

// Objective status values
export const OBJECTIVE_STATUS = {
    INCOMPLETE: 'incomplete',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
};

/**
 * @param {Array} initialObjectives - All objectives from fetchFullScenarioData
 *                                    Includes secret objectives (is_secret: true)
 */
export const useObjectives = (initialObjectives = []) => {
    // Internal state: objectives with a `status` field added
    const [objectives, setObjectives] = useState([]);

    // ── Initialize objectives from scenario data ──────────────────────────
    useEffect(() => {
        if (initialObjectives.length === 0) return;

        const initialized = initialObjectives.map(obj => ({
            ...obj,
            status: OBJECTIVE_STATUS.INCOMPLETE,
            // Secret objectives are hidden until revealed
            visible: !obj.is_secret,
        }));

        setObjectives(initialized);
    }, [initialObjectives]);

    // ── Called by useTerminal's onObjectivesUpdated callback ──────────────
    // completedIds: array of objective_ids now completed
    const markObjectivesCompleted = useCallback((completedIds) => {
        if (!completedIds?.length) return;

        setObjectives(prev => prev.map(obj => {
            if (!completedIds.includes(obj.objective_id)) return obj;

            return {
                ...obj,
                status: OBJECTIVE_STATUS.COMPLETED,
                // Reveal secret objectives when they're completed
                visible: true,
            };
        }));
    }, []);

    // ── Called by useTerminal's onStepMatched callback ────────────────────
    // When a step is matched, mark the objective tied to that step as in_progress
    // (if it's not already completed)
    const markStepProgress = useCallback((matchedStep) => {
        if (!matchedStep) return;

        setObjectives(prev => prev.map(obj => {
            // An objective is "in progress" if its trigger_step is >= current step
            // and it hasn't been completed yet
            if (
                obj.status === OBJECTIVE_STATUS.INCOMPLETE &&
                obj.trigger_step !== null &&
                obj.trigger_step > matchedStep.step_order
            ) {
                return { ...obj, status: OBJECTIVE_STATUS.IN_PROGRESS };
            }
            return obj;
        }));
    }, []);

    // ── Derived values for the UI ─────────────────────────────────────────
    const visibleObjectives = objectives.filter(o => o.visible);
    const requiredObjectives = objectives.filter(o => !o.is_secret);
    const secretObjectives = objectives.filter(o => o.is_secret && o.visible);

    const completedCount = requiredObjectives.filter(
        o => o.status === OBJECTIVE_STATUS.COMPLETED
    ).length;

    const totalRequired = requiredObjectives.length;
    const completionPercent = totalRequired > 0
        ? Math.round((completedCount / totalRequired) * 100)
        : 0;

    const allRequiredComplete = totalRequired > 0 && completedCount === totalRequired;

    return {
        objectives: visibleObjectives,          // For ObjectivesPanel render
        requiredObjectives,
        secretObjectives,
        completedCount,
        totalRequired,
        completionPercent,
        allRequiredComplete,                    // Trigger auto-complete prompt
        markObjectivesCompleted,               // Called from useTerminal callback
        markStepProgress,                      // Called from useTerminal callback
    };
};