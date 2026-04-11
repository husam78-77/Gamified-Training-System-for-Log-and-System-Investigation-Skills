/**
 * aiAdapter.js
 * Modular AI adapter layer.
 *
 * This is the ONLY file that needs to change when switching AI providers.
 * All hint logic calls this file — never the provider directly.
 *
 * Current providers:
 *   - 'ollama'    → local Ollama instance (default)
 *   - 'openai'    → OpenAI API (cloud fallback)
 *   - 'mock'      → deterministic mock for development/testing
 *
 * Set AI_PROVIDER in your .env to switch:
 *   AI_PROVIDER=ollama
 *   AI_PROVIDER=openai
 *   AI_PROVIDER=mock
 */

require('dotenv').config();

const PROVIDER = process.env.AI_PROVIDER || 'mock';

/**
 * Send a prompt to the configured AI provider and return the response text.
 *
 * @param {string} prompt  - The full prompt to send
 * @returns {Promise<string>} - The AI's response text
 */
const generate = async (prompt) => {
    switch (PROVIDER) {
        case 'ollama':
            return await generateOllama(prompt);
        case 'openai':
            return await generateOpenAI(prompt);
        case 'mock':
        default:
            return await generateMock(prompt);
    }
};

// =============================================================================
// OLLAMA (local)
// =============================================================================

const generateOllama = async (prompt) => {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3';

    const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: {
                temperature: 0.4,   // Low temp = focused, not creative
                num_predict: 200,   // Limit response length
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response?.trim() || '';
};

// =============================================================================
// OPENAI (cloud)
// =============================================================================

const generateOpenAI = async (prompt) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!apiKey) throw new Error('OPENAI_API_KEY is not set in .env');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 0.4,
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
// MOCK (development / testing)
// =============================================================================

const MOCK_HINTS = [
    "Look carefully at the file structure. You may need to navigate into a subdirectory before you can read what you need.",
    "Have you listed all the files in the current directory? Some important evidence may be hidden in plain sight.",
    "Think about what command would let you search inside files for a specific string or value.",
    "You've found some files. The next step involves reading their contents carefully to find the key information.",
    "Try using a command that lets you view the contents of a file directly in the terminal.",
];

let mockIndex = 0;

const generateMock = async (_prompt) => {
    // Cycle through mock hints deterministically for testing
    const hint = MOCK_HINTS[mockIndex % MOCK_HINTS.length];
    mockIndex++;
    return hint;
};

module.exports = { generate };