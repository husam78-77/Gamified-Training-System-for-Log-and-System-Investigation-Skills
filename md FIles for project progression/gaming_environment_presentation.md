# Presentation Guide: The Gaming Environment 🎮

This document is your specific, deep-dive script and technical guide for presenting the **Gaming Environment**—the absolute core of the KINETIC BREACH platform. When you reach this screen during your demonstration, this is where you showcase the hardest technical challenges you solved.

---

## 1. High-Level Technical Stack Flow

When you enter the Gaming Environment, several highly synchronized systems start communicating. Explain this flow to the evaluators:

1. **The User Interface (React / Vite):** The outer shell (`GamingEnvironment.jsx`) manages the overall layout (Terminal, Objectives, Hints) and utilizes custom React hooks (`useTerminal`, `useObjectives`, `useHint`) to keep the UI strictly decoupled from the business logic.
2. **The Terminal Engine (`xterm.js`):** You are not just using a fake HTML text box. You integrated `xterm.js` to provide authentic terminal emulation (handling cursors, keystrokes, and text rendering).
3. **The Backend API (Node.js / Express):** Every command typed is sent via a REST API `POST /api/terminal/execute`.
4. **The Database (PostgreSQL):** The backend relies on a stateless, append-only architecture. Every command is written to `command_history`.
5. **The AI Layer (OpenAI API / Ollama):** Runs asynchronously to monitor the player's "Stuck Score" and generate hints via the ARIA system.

---

## 2. Panel Breakdown & What to Say

### A. The Terminal Panel (`TerminalPanel.jsx`)

**How it works technically:**
- It intercepts keystrokes using the `xterm.js` addon `onData`.
- When the user presses `Enter`, the React state (`currentPath`, `command`) is packaged and sent to the backend.
- The backend parses the command, checks the "Discovery Triggers", calculates the new virtual file visibility, and returns simulated Bash text.
- The custom hook `useTerminal` takes the response and writes it back to the `xterm.js` buffer.

**What to Say (Presentation Script):**
> *"This is the core Terminal Engine. I implemented `xterm.js` for an authentic feel, but the real magic is in the backend parser. When I type a command like `cat /etc/passwd`, the frontend doesn't know the answer. It sends the command and my current working directory to the Node.js backend. The backend uses a 'Dual-Evaluation' engine: it checks if my command matches a rigid expected step, OR if it matches a flexible 'Discovery Trigger'. If it's correct, the backend dynamically calculates which hidden files I am now allowed to see, and sends back the simulated output."*

**Pro-Tip Demo:**
Type `pwd` or `cd ..` to show that the backend actually maintains and resolves absolute and relative paths dynamically using a stack-based algorithm.

### B. The Objectives Panel (`ObjectivesPanel.jsx`)

**How it works technically:**
- It listens to the backend's response payload from terminal commands. 
- If a command unlocks an objective, the backend returns an array of `completedObjectiveIds`.
- The frontend `useObjectives` hook transitions the state of that objective from `INCOMPLETE` to `COMPLETED`.
- Hidden/Secret objectives only become visible to the React DOM *after* this trigger occurs.

**What to Say (Presentation Script):**
> *"On the right, we have the Objectives Panel. This is entirely data-driven. The backend ensures that users cannot cheat. If you inspect the network tab right now, you won't see the hidden objectives or the contents of hidden files. My backend only sends metadata stubs to the frontend. It is only when I execute the exact correct forensic command that the backend securely transmits the completion flag and the file contents over the network."*

### C. The Hint Panel (ARIA) (`HintPanel.jsx`)

**How it works technically:**
- Users can click "Request Hint", which hits the `/api/hints/request` endpoint.
- It features an escalation system (Level 1 is vague -> Level 3 is specific).
- **Auto-Trigger:** In the background, `playerStateAnalyzer.js` evaluates every terminal command. If the player is spamming errors, idle for 5 minutes, or has a "Stuck Score" > 65, it automatically pushes a hint to the screen.

**What to Say (Presentation Script):**
> *"Below the objectives is ARIA, the AI Guidance Service. This isn't just a wrapper for ChatGPT. I engineered a sophisticated AI architecture. First, it uses a Global Hint Cache. If a student asks for a hint on this exact step, it caches the response in PostgreSQL so the next student gets it instantly without costing OpenAI API tokens.* 
> 
> *Second, I built an Auto-Trigger engine. The system is secretly calculating my 'Stuck Score' using Levenshtein distance on my typos and tracking my idle time. If I start thrashing, ARIA will intervene automatically to prevent me from rage-quitting.*
> 
> *Finally, I implemented defense-in-depth security. LLMs hallucinate, so I wrote a post-processing Regex Sanitizer on the backend that physically strips out exact expected commands from the AI's output, ensuring ARIA guides the player but never just gives them the answer."*

---

## 3. The "Oh Wow" Moments to Demonstrate

If you want to secure top marks during your viva, explicitly demonstrate these three things while on the Gaming Environment screen:

1. **The Typo Forgiveness (Proximity Detection):**
   - *Action:* Purposely misspell a command by a few letters (e.g., type `grap root /etc` instead of `grep root /etc`).
   - *Say:* *"Notice how I didn't get severely penalized? My Player State Analyzer uses a Levenshtein distance algorithm. It realized my edit distance was less than 4, classified it as a typo rather than me being lost, and adjusted my Stuck Score accordingly."*

2. **The Discovery Flexibility:**
   - *Action:* Instead of using `cat` to read a file, use something creative like `grep "" filename`.
   - *Say:* *"I didn't hardcode expected commands. I built a Discovery matching system. Because I used `grep`, the regex pattern matcher on the backend realized I successfully targeted the file, and it gave me the evidence. This allows for real, flexible forensic problem-solving."*

3. **The Stateful Restoration:**
   - *Action:* Refresh the entire browser page while in the middle of a scenario.
   - *Say:* *"If a student's internet drops, they don't lose their progress. Because the architecture is completely stateless and append-only, the moment I refreshed, the frontend fetched my `command_history` from the database and instantly replayed it, perfectly reconstructing my exact terminal state and path."*

---

## Summary Checklist for the Evaluator
When on this screen, ensure the evaluator leaves knowing you understand:
- [ ] You used real terminal emulation (`xterm.js`).
- [ ] You prevented cheating by keeping hidden data on the server.
- [ ] You built a custom parsing/matching engine, not just basic string equality.
- [ ] Your AI implementation includes cost-saving caching and strict anti-leak sanitization.
- [ ] You wrote a mathematical algorithm to calculate user frustration in real-time.
