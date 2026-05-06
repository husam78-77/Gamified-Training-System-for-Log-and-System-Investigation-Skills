# Project Changes Log

---

## Simulated Linux Terminal System

### `backend/utils/terminalParser.js`

**Command Whitelist Expanded**

Added four new commands to `SUPPORTED_COMMANDS`:

| Command | Purpose |
|---|---|
| `ps` | Display running processes |
| `locate` | Search for files by name across the virtual filesystem |
| `strings` | Extract readable strings from a file |
| `history` | Show previously executed commands in the session |

**Typo Suggestion — Levenshtein Edit Distance**

Replaced the naive prefix-match `getSuggestion` with a proper Levenshtein distance function.

- Max edit distance of 2 before a suggestion is offered
- Case-insensitive comparison
- Example: `"hisotry"` → `Did you mean 'history'?`, `"grpe"` → `Did you mean 'grep'?`

---

### `backend/controllers/terminalController.js`

**New Command Handlers**

| Handler | Behaviour |
|---|---|
| `handlePs` | Returns a realistic process table. `ps aux` / `ps -ef` shows full USER/PID/%CPU/%MEM/COMMAND output including a suspicious `/tmp/.update.sh` process for students to investigate. |
| `handleLocate` | Searches `virtual_files` by filename and full path substring. Returns all matching paths. |
| `handleStrings` | Reads a virtual file and extracts sequences of printable ASCII characters with length ≥ 4, deduplicated. |
| `handleHistory` | Renders the session's `command_history` rows as a numbered list. History is fetched **before** saving the current command so the `history` command never shows itself. |

**`grep` — Flag Support Added**

| Flag | Behaviour |
|---|---|
| `-r` / `-R` | Recursive search across all files under a directory path |
| `-i` | Case-insensitive pattern matching |
| `-n` | Prefix each matching line with its line number |
| `-v` | Invert match — show lines that do NOT contain the pattern |

**`find` — Flag Support Added**

| Flag | Behaviour |
|---|---|
| `-name <pattern>` | Filter results by filename; supports `*` wildcard |
| `-type f` | Return files only |
| `-type d` | Enumerate and return directories only |

The first positional argument is now always treated as the search root (consistent with real Linux `find` behaviour). A `matchesWildcard` helper handles `*` glob patterns.

**`buildTerminalOutput` Updated**

- Accepts a new optional `commandHistory` parameter (passed through for the `history` command)
- `find` case updated to pass the full `parsed` object instead of just the target path
- New `case` entries for `ps`, `locate`, `strings`, `history`

**`buildHelp` Updated**

All 13 commands are now documented with flags in the `help` output.

**`executeCommand` Flow Updated**

Added a conditional pre-save history fetch:

```js
// Fetched BEFORE saveCommand so 'history' never lists itself
let commandHistoryForOutput = [];
if (parsed.command === 'history') {
    commandHistoryForOutput = await terminalModel.getCommandHistory(sessionId);
}
```

---

### `frontend/src/hooks/useTerminal.js`

**Up / Down Arrow — Command History Navigation**

- Typed commands are pushed to a `localHistory` ref after each submission
- Up arrow navigates to older commands; Down arrow navigates back toward the current input
- Current unsaved input is preserved in `savedInputRef` when navigation begins, and restored when the user presses Down past the most recent entry
- History index resets on Enter, Ctrl+C, and any regular keystroke typed while navigating

**TAB — Auto-Completion**

Two-phase completion:

1. **Command completion** — if no space has been typed yet, TAB completes or lists matching command names from `SUPPORTED_COMMANDS`
2. **File/directory completion** — after a space, TAB resolves the partial path against `virtualFilesRef` (the live virtual filesystem) and completes file names or directory names

Behaviour matches standard shell TAB semantics:
- Single match → complete inline
- Multiple matches → print all candidates below the prompt and redraw the input line

**Local History Tracking**

```js
const localHistory    = useRef([]);   // commands typed this session
const historyIndexRef = useRef(-1);   // -1 = not navigating
const savedInputRef   = useRef('');   // saved input before navigation
```

**`handleKeyInput` — New Key Handlers**

| Key | Action |
|---|---|
| `Tab` (keyCode 9) | Trigger TAB completion |
| `ArrowUp` (keyCode 38) | Navigate to older command |
| `ArrowDown` (keyCode 40) | Navigate to newer command |

**Stable Function Refs Pattern**

`navigateHistoryFn` and `tabCompleteFn` are stored as refs and assigned on each render. This allows the `useCallback([])` `handleKeyInput` closure to always call the latest implementation without adding dependencies that would cause re-creation.

**`SUPPORTED_COMMANDS` + `getPromptInline`**

Added to the frontend so TAB completion and history-navigation line replacement work without a backend round-trip:

```js
const getPromptInline = (path) => {
    const display = path === '/' ? '~' : path;
    return `root@hyperion:${display}$ `;
};
```

---

## Summary Table

| File | Category | Change |
|---|---|---|
| `backend/utils/terminalParser.js` | Parser | Added 4 commands, Levenshtein suggestion |
| `backend/controllers/terminalController.js` | Engine | 4 new handlers, grep/find flags, history flow |
| `frontend/src/hooks/useTerminal.js` | UX | TAB completion, up/down history, local tracking |