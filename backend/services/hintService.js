/**
 * hintService.js
 * Builds context-aware hint prompts and calls the AI adapter.
 *
 * This service:
 * 1. Analyzes the user's command history vs expected steps
 * 2. Determines what the user is stuck on
 * 3. Builds a focused prompt for the AI
 * 4. Ensures hints guide without revealing the answer
 * 5. Avoids repeating the same hint twice in one session
 */

const aiAdapter = require('./aiAdapter');

/**
 * Generate a contextual hint for the current session state.
 *
 * @param {Object} params
 * @param {Array}  params.commandHistory     - All commands entered this session
 * @param {Array}  params.expectedSteps      - All expected steps for the scenario
 * @param {Array}  params.completedStepOrders - Steps already matched
 * @param {Array}  params.previousHints      - Hints already given this session (to avoid repetition)
 * @param {string} params.scenarioTitle      - Scenario title for context
 * @param {string} params.missionBrief       - Short mission description for AI context
 *
 * @returns {Promise<{ prompt: string, hint: string, triggerCommands: string }>}
 */
const generateHint = async ({
    commandHistory,
    expectedSteps,
    completedStepOrders,
    previousHints,
    scenarioTitle,
    missionBrief,
}) => {
    // Find the next expected step the user hasn't completed
    const nextStep = expectedSteps.find(
        s => !completedStepOrders.includes(s.step_order)
    );

    // Summarize what the user has typed so far (last 5 commands)
    const recentCommands = commandHistory
        .slice(-5)
        .map(c => c.command_entered)
        .join(', ');

    // Count how many wrong commands since last correct one
    const wrongCommandsCount = countWrongCommandsSinceLastMatch(commandHistory);

    // Build the prompt
    const prompt = buildHintPrompt({
        scenarioTitle,
        missionBrief,
        recentCommands,
        wrongCommandsCount,
        nextStep,
        completedCount: completedStepOrders.length,
        totalSteps: expectedSteps.length,
        previousHints,
    });

    // Call the AI
    const hintText = await aiAdapter.generate(prompt);

    // Sanitize: make sure the hint doesn't contain the exact expected command
    const safeHint = sanitizeHint(hintText, nextStep);

    return {
        prompt,
        hint: safeHint,
        triggerCommands: recentCommands,
    };
};

/**
 * Build a structured prompt for the AI hint generator.
 * The prompt instructs the AI to guide without revealing the exact answer.
 */
const buildHintPrompt = ({
    scenarioTitle,
    missionBrief,
    recentCommands,
    wrongCommandsCount,
    nextStep,
    completedCount,
    totalSteps,
    previousHints,
}) => {
    const stepDescription = nextStep
        ? `The next investigation step involves: "${nextStep.description}"`
        : 'The user is close to completing the investigation.';

    const previousHintContext = previousHints.length > 0
        ? `\nPrevious hints already given (do NOT repeat these ideas):\n- ${previousHints.join('\n- ')}`
        : '';

    const stuckLevel = wrongCommandsCount >= 5 ? 'very stuck' : wrongCommandsCount >= 2 ? 'somewhat stuck' : 'exploring';

    return `You are an AI assistant for a cybersecurity training simulation called "${scenarioTitle}".

Mission context: ${missionBrief}

Current investigation progress: ${completedCount} of ${totalSteps} steps completed.
The investigator appears to be ${stuckLevel}.
Recent commands entered: ${recentCommands || 'none yet'}.
${stepDescription}
${previousHintContext}

Your task: Write ONE short, helpful hint (2-3 sentences maximum) that:
- Guides the investigator toward the next correct action WITHOUT revealing the exact command
- Uses thematic language appropriate for a cybersecurity investigation
- Does NOT repeat previous hints
- Does NOT include technical command syntax directly

Respond with ONLY the hint text. No preamble, no explanation.`;
};

/**
 * Count consecutive wrong commands since the last matched step.
 * Used to calibrate hint specificity.
 */
const countWrongCommandsSinceLastMatch = (commandHistory) => {
    let count = 0;
    for (let i = commandHistory.length - 1; i >= 0; i--) {
        if (commandHistory[i].match_expected) break;
        count++;
    }
    return count;
};

/**
 * Sanitize a hint to ensure it doesn't accidentally reveal the exact command.
 * If the expected command appears verbatim in the hint, replace it with a placeholder.
 */
const sanitizeHint = (hintText, nextStep) => {
    if (!nextStep || !hintText) return hintText;

    const expectedCommand = nextStep.command_expected?.toLowerCase();
    const expectedPath = nextStep.target_path?.toLowerCase();

    let sanitized = hintText;

    // Remove exact command if it appears literally
    if (expectedCommand) {
        const cmdRegex = new RegExp(`\\b${expectedCommand}\\b`, 'gi');
        sanitized = sanitized.replace(cmdRegex, '[investigation tool]');
    }

    // Remove exact path if it appears literally
    if (expectedPath) {
        const pathRegex = new RegExp(expectedPath.replace(/\//g, '\\/'), 'gi');
        sanitized = sanitized.replace(pathRegex, '[target location]');
    }

    return sanitized;
};

module.exports = {
    generateHint,
};