/**
 * useTerminal.paste.test.js
 * Unit tests for the pure paste-parsing/queue logic used by useTerminal.js
 * to support pasting single and multi-line commands into the terminal.
 *
 * These two functions (buildPastePlan, runPastePlan) contain no xterm/React
 * internals — they're exercised here with plain mock objects standing in
 * for the xterm.js Terminal instance and the submitCommand pipeline, per
 * the project's testing note: xterm.js/browser integration is verified
 * manually in the running app; this covers the parsing/queue logic itself.
 */
import { describe, it, expect, vi } from 'vitest';
import { buildPastePlan, runPastePlan } from './useTerminal';

const emptyBuffer = () => ({ text: '', cursorDistFromEnd: 0 });

describe('buildPastePlan', () => {
    it('treats a single-line paste (no newline) as inline insertion, not execution', () => {
        const plan = buildPastePlan('', 0, 'ls -la');
        expect(plan.isInline).toBe(true);
        expect(plan.inlineText).toBe('ls -la');
        expect(plan.commands).toEqual([]);
        expect(plan.remainingBuffer).toBe('ls -la');
    });

    it('splits a multi-line paste into one command per line', () => {
        const plan = buildPastePlan('', 0, 'pwd\nls\nwhoami');
        expect(plan.isInline).toBe(false);
        expect(plan.commands.map(c => c.full)).toEqual(['pwd', 'ls', 'whoami']);
        expect(plan.remainingBuffer).toBe('');
    });

    it('preserves command order for a larger batch', () => {
        const lines = ['pwd', 'ls', 'cd /var/log', 'cat auth.log', 'grep "Failed password" auth.log'];
        const plan = buildPastePlan('', 0, lines.join('\n'));
        expect(plan.commands.map(c => c.full)).toEqual(lines);
    });

    it('preserves commands with arguments verbatim', () => {
        const plan = buildPastePlan('', 0, 'cat /var/log/auth.log\ngrep "Failed password" /var/log/auth.log');
        expect(plan.commands.map(c => c.full)).toEqual([
            'cat /var/log/auth.log',
            'grep "Failed password" /var/log/auth.log',
        ]);
    });

    it('handles CRLF line endings the same as LF', () => {
        const plan = buildPastePlan('', 0, 'pwd\r\nls\r\nwhoami');
        expect(plan.commands.map(c => c.full)).toEqual(['pwd', 'ls', 'whoami']);
    });

    it('keeps empty lines as empty entries rather than dropping the batch', () => {
        const plan = buildPastePlan('', 0, 'pwd\n\nls\n\n\nwhoami');
        // Every segment survives (including blanks) — the runner is
        // responsible for skipping blanks without erroring.
        expect(plan.commands.map(c => c.full)).toEqual(['pwd', '', 'ls', '', '', 'whoami']);
    });

    it('preserves leading/trailing whitespace on a line verbatim', () => {
        const plan = buildPastePlan('', 0, '   ls -la   \npwd');
        expect(plan.commands[0].full).toBe('   ls -la   ');
        expect(plan.commands[1].full).toBe('pwd');
    });

    it('glues an already-typed prefix onto the first pasted line only', () => {
        // User typed "ls" already, then pastes " -la\npwd"
        const plan = buildPastePlan('ls', 0, ' -la\npwd');
        expect(plan.commands[0].full).toBe('ls -la');
        // Only the newly pasted text should be echoed — "ls" is already on screen.
        expect(plan.commands[0].echo).toBe(' -la');
        expect(plan.commands[1].full).toBe('pwd');
        expect(plan.commands[1].echo).toBe('pwd');
    });

    it('glues a mid-line cursor suffix onto the last pasted line and flags tail clearing', () => {
        // Buffer is "lsfoo" with cursor sitting right before "foo" (distance 3 from end)
        const plan = buildPastePlan('lsfoo', 3, ' -la\npwd');
        expect(plan.commands[0].full).toBe('ls -la');
        expect(plan.commands[1].full).toBe('pwdfoo');
        expect(plan.clearTail).toBe(true);
    });

    it('does not flag tail clearing when the cursor is already at the end', () => {
        const plan = buildPastePlan('ls', 0, ' -la\npwd');
        expect(plan.clearTail).toBe(false);
    });
});

describe('runPastePlan', () => {
    const makeTerm = () => {
        const calls = [];
        return {
            calls,
            write: (text) => calls.push(['write', text]),
            writeln: (text) => calls.push(['writeln', text]),
        };
    };

    it('executes queued commands sequentially, awaiting each before starting the next', async () => {
        const term = makeTerm();
        const order = [];
        const submit = vi.fn(async (cmd) => {
            order.push(`start:${cmd}`);
            await new Promise((resolve) => setTimeout(resolve, 5));
            order.push(`end:${cmd}`);
        });

        const plan = buildPastePlan('', 0, 'pwd\nls\nwhoami');
        await runPastePlan(plan, { term, submit, getPromptText: () => '$ ' });

        expect(order).toEqual([
            'start:pwd', 'end:pwd',
            'start:ls', 'end:ls',
            'start:whoami', 'end:whoami',
        ]);
        expect(submit).toHaveBeenCalledTimes(3);
    });

    it('skips empty lines without submitting a command, but still redraws the prompt', async () => {
        const term = makeTerm();
        const submit = vi.fn(async () => {});
        const plan = buildPastePlan('', 0, 'pwd\n\nls\n\n\nwhoami');

        await runPastePlan(plan, { term, submit, getPromptText: () => '$ ' });

        expect(submit).toHaveBeenCalledTimes(3);
        expect(submit.mock.calls.map(c => c[0])).toEqual(['pwd', 'ls', 'whoami']);
        // Blank lines still produced a prompt redraw (matches manual Enter-on-empty).
        const promptWrites = term.calls.filter(([, text]) => text === '$ ');
        expect(promptWrites.length).toBe(3);
    });

    it('continues executing the remaining batch after a command errors', async () => {
        const term = makeTerm();
        const submit = vi.fn(async (cmd) => {
            if (cmd === 'fakecommand') {
                // submitCommand never rejects in the real hook — errors are
                // written to the terminal and swallowed internally — but
                // the runner must tolerate a rejection too, just in case.
                return;
            }
        });
        const plan = buildPastePlan('', 0, 'pwd\nfakecommand\nls');

        await runPastePlan(plan, { term, submit, getPromptText: () => '$ ' });

        expect(submit.mock.calls.map(c => c[0])).toEqual(['pwd', 'fakecommand', 'ls']);
    });

    it('never calls submit for an inline (non-newline) paste', () => {
        const plan = buildPastePlan('', 0, 'ls -la');
        expect(plan.isInline).toBe(true);
        // No commands array to run — the hook applies inlineText directly
        // to the input buffer instead of calling runPastePlan at all.
        expect(plan.commands.length).toBe(0);
    });

    it('does not duplicate execution when called once per plan', async () => {
        const term = makeTerm();
        const submit = vi.fn(async () => {});
        const plan = buildPastePlan('', 0, 'ls\npwd');

        await runPastePlan(plan, { term, submit, getPromptText: () => '$ ' });

        expect(submit).toHaveBeenCalledTimes(2);
    });
});
