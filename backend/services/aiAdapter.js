/**
 * aiAdapter.js
 * Phase 4 — Stricter token controls, system/user prompt separation,
 *            and leak-detection post-processing.
 *
 * CHANGES FROM ORIGINAL:
 *   1. Ollama and OpenAI now use a SYSTEM prompt + USER prompt structure.
 *      ARIA's persona and hard rules go in the system role.
 *      The situation-specific context goes in the user role.
 *      This gives better instruction-following on both providers.
 *
 *   2. generate() now accepts an optional options object:
 *      { maxTokens, temperature } — allows hintService to tune per call.
 *      Defaults are set conservatively for hints (short, focused output).
 *
 *   3. Post-generation leak check added — if the raw response contains
 *      patterns that look like command syntax, a warning is logged.
 *      The sanitizeHint() in hintService is the actual remover;
 *      this is just observability.
 *
 *   4. Mock provider now returns level-appropriate test hints
 *      instead of cycling a fixed array — useful for Phase 4 testing.
 *
 * Path: backend/services/aiAdapter.js
 */

require('dotenv').config();

const PROVIDER = process.env.AI_PROVIDER || 'mock';

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Send a prompt to the configured AI provider and return the response text.
 *
 * Phase 4: Accepts options for token/temperature control.
 * hintService does not need to change — options are optional.
 *
 * @param {string} prompt                   - The full assembled prompt
 * @param {Object} [options={}]
 * @param {number} [options.maxTokens=200]  - Hard cap on response length
 * @param {number} [options.temperature=0.4] - Lower = more focused output
 *
 * @returns {Promise<string>}
 */
const generate = async (prompt, options = {}) => {
    const maxTokens = options.maxTokens ?? 200;
    const temperature = options.temperature ?? 0.4;

    let rawResponse;

    switch (PROVIDER) {
        case 'ollama':
            rawResponse = await generateOllama(prompt, maxTokens, temperature);
            break;
        case 'openai':
            rawResponse = await generateOpenAI(prompt, maxTokens, temperature);
            break;
        case 'mock':
        default:
            rawResponse = await generateMock(prompt);
            break;
    }

    // Post-generation observability: flag if response looks like it leaked syntax
    detectLeakPatterns(rawResponse);

    return rawResponse;
};

// =============================================================================
// OLLAMA
// Phase 4: Separates system prompt from user context.
// Ollama /api/chat supports messages array with roles.
// =============================================================================

const generateOllama = async (prompt, maxTokens, temperature) => {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3';

    // Split the prompt at the DIRECTIVE section boundary
    // System role gets identity + rules; user role gets the situation
    const { systemPart, userPart } = splitPrompt(prompt);

    const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            stream: false,
            messages: [
                { role: 'system', content: systemPart },
                { role: 'user', content: userPart },
            ],
            options: {
                temperature,
                num_predict: maxTokens,
                stop: ['\n\n\n', '---'],  // Hard stop on excessive output
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content?.trim() || '';
};

// =============================================================================
// OPENAI
// Phase 4: Uses messages array properly — system role for persona/rules,
// user role for situational context.
// =============================================================================

const generateOpenAI = async (prompt, maxTokens, temperature) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!apiKey) throw new Error('OPENAI_API_KEY is not set in .env');

    const { systemPart, userPart } = splitPrompt(prompt);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPart },
                { role: 'user', content: userPart },
            ],
            max_tokens: maxTokens,
            temperature,
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
};

// =============================================================================
// PROMPT SPLITTER
// Splits the assembled prompt into system and user parts.
//
// ARIA persona + hard rules → system role (persistent, high-weight instructions)
// Mission context + situation + directive → user role (situational per request)
//
// Split boundary: the ━━━ ACTIVE INCIDENT ━━━ section header.
// Everything before it is system. Everything from it onward is user.
// =============================================================================

const splitPrompt = (prompt) => {
    const SPLIT_MARKER = '━━━ ACTIVE INCIDENT ━━━';
    const splitIndex = prompt.indexOf(SPLIT_MARKER);

    if (splitIndex === -1) {
        // Fallback: send everything as user if marker not found
        return { systemPart: '', userPart: prompt };
    }

    return {
        systemPart: prompt.slice(0, splitIndex).trim(),
        userPart: prompt.slice(splitIndex).trim(),
    };
};

// =============================================================================
// LEAK DETECTION
// Observability only — does not modify the response.
// Flags responses that contain patterns matching common command syntax.
// The actual sanitization happens in hintService.sanitizeHint().
// =============================================================================

// Patterns that suggest a command was leaked
const LEAK_PATTERNS = [
    /\bls\s+\//i,           // ls /path
    /\bcat\s+\//i,          // cat /path
    /\bgrep\s+/i,           // grep ...
    /\b--[a-z]{1,10}\b/i,   // --flag style arguments
    /\s-[a-zA-Z]{1,3}\b/,   // -flag style arguments
    /\/[a-z]+\/[a-z.]+/,    // /directory/file style paths
];

const detectLeakPatterns = (text) => {
    if (!text) return;
    for (const pattern of LEAK_PATTERNS) {
        if (pattern.test(text)) {
            console.warn('[AIAdapter] Possible command leak detected in response:', {
                pattern: pattern.toString(),
                excerpt: text.slice(0, 100),
            });
            break; // One warning per response is enough
        }
    }
};

// =============================================================================
// MOCK PROVIDER
// Phase 4: Returns behavior-aware, level-appropriate hints.
// Parses the prompt to extract level and behavior for realistic testing.
// =============================================================================

const MOCK_HINTS_BY_LEVEL = {
    1: [
        "There are records on this system that document every authentication event. Consider what form those records take.",
        "Before you can analyze the incident, you need to understand what assets are present in this environment.",
        "The evidence you need already exists on this system. Your task is to locate where it is stored.",
    ],
    2: [
        "Authentication events are typically written to log files. Think about which directory on a Linux system holds log data, and what tool lets you read file contents.",
        "You need to examine the contents of a specific file in the logs area. Consider what command gives you a direct view of a text file.",
        "The system user database lives in a well-known configuration location. A file-reading command will give you everything you need.",
    ],
    3: [
        "The authentication log file in the logs directory contains the full record of the attack. Use a command that displays a file's contents directly to your terminal.",
        "You need to search through the authentication log for a specific IP address. A text-search command that scans file contents will isolate the relevant entries.",
        "The incident report has been automatically generated and placed in the var directory. Read it directly using a file-viewing command.",
    ],
};

const generateMock = async (prompt) => {
    // Extract hint level from prompt for realistic mock output
    let level = 1;
    if (prompt.includes('INTEL LEVEL: RESTRICTED')) level = 2;
    if (prompt.includes('INTEL LEVEL: SENSITIVE')) level = 3;

    const hints = MOCK_HINTS_BY_LEVEL[level];
    const index = Math.floor(Math.random() * hints.length);
    return hints[index];
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = { generate };