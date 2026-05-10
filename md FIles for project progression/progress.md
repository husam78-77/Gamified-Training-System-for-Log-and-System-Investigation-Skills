# Progress Page Redesign — Cinematic Cyber Investigator Interface

## Overview

The `/progress` route was completely redesigned from a static placeholder with hardcoded dummy data into a live, data-driven tactical investigator career system.

---

## Backend Changes

### New API Endpoint
`GET /api/users/progression` — JWT protected

| File | Change |
|------|--------|
| `backend/models/progressionModel.js` | Added `getUserProgressionData(userId)` |
| `backend/controllers/userController.js` | Added `getProgression` handler |
| `backend/routes/userRoutes.js` | Registered the new route |

### Data Returned
```
identity        → username, level, xp, rank, clearanceTier, xpPercent
metrics         → 8 investigation KPIs
missionArchive  → last 20 completed sessions
achievements    → 10 behavioral achievements (server-evaluated)
investigationStyle → computed archetype
rankTimeline    → 5-rank progression with status
```

---

## Rank System (XP-Based)

| Rank | XP Required |
|------|-------------|
| TRAINEE | 0 |
| OPERATIVE | 2,000 |
| INFILTRATOR | 5,000 |
| PHANTOM | 10,000 |
| MASTER_NODE | 20,000 |

---

## Clearance Tiers (Avg Score)

| Tier | Avg Score |
|------|-----------|
| CLEARANCE_PENDING | No missions |
| RESTRICTED_ACCESS | 0–39 |
| FIELD_CLEARANCE | 40–59 |
| SENIOR_CLEARANCE | 60–74 |
| ELITE_CLEARANCE | 75–89 |
| OMEGA_CLEARANCE | 90+ |

---

## Investigation Metrics (8 KPIs)

1. Missions Completed / Total
2. Evidence Recovered (found / total)
3. Investigation Accuracy (avg score %)
4. Commands Executed (total)
5. Avg Completion Time (minutes)
6. Discovery Rate (full-discovery sessions %)
7. AI Dependency (hint usage rate %)
8. Silent Operations (hint-free completions)

---

## Achievements (10 Behavioral)

| ID | Unlock Condition |
|----|-----------------|
| FIRST_CONTACT | Complete 1 mission |
| SILENT_OPERATOR | Complete a mission with 0 hints |
| TRACE_WALKER | Find all critical evidence in one session |
| GREP_HUNTER | Trigger a discovery via grep command |
| MINIMALIST | Complete a mission in ≤15 commands |
| ORACLE_DENIED | Score 80+ with zero AI assistance |
| PAYLOAD_HUNTER | Find evidence tagged malicious/payload |
| IRON_TRAIL | Complete 3+ missions |
| DEEP_RECON | Find 5+ evidence items total |
| EFFICIENCY_EXPERT | Score 90+ on any mission |

---

## Investigation Archetypes

| Archetype | Condition |
|-----------|-----------|
| GHOST_TRACE | ≥60% no-hint sessions AND avg score ≥65 |
| DEEP_EVIDENCE_SEEKER | Discovery rate ≥70% |
| PRECISION_TRACE | Avg commands/session ≤15 AND 2+ sessions |
| ASSISTED_TRACE | Avg hints/session ≥2 |
| SYSTEMATIC_TRACE | Default (balanced) |

---

## Frontend Sections

1. **Hero** — Username (glitch animation), rank badge, animated XP bar, clearance tier
2. **Metrics Grid** — 8 KPI cards in 4-column bento layout
3. **Investigator Style + Rank** — Archetype card + rank display card
4. **Achievements** — Hexagon badge grid; unlocked glow, locked classified
5. **Rank Timeline** — Alternating vertical timeline, active rank pulses
6. **Mission Archive** — Classified ops history with grade, score, evidence %, time, hints

---

## Key Files

```
backend/models/progressionModel.js     ← getUserProgressionData()
backend/controllers/userController.js  ← getProgression()
backend/routes/userRoutes.js           ← GET /api/users/progression
frontend/src/pages/Progress/Progress.jsx
frontend/src/pages/Progress/Progress.css
```

> Profile page (`/profile`) was not modified — it remains a separate account settings page.
