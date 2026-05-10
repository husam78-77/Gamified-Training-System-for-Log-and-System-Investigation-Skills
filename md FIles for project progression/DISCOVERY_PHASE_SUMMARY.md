# Discovery-Based Progression Refactor — Phase Summary

## What Changed and Why

The platform previously evaluated players by checking whether they typed the **exact expected command** in a fixed order. This was rigid, unrealistic, and discouraged genuine forensic thinking. A player who typed `locate cron` instead of `ls /etc/cron.d` got no credit, even though they found the same evidence.

This phase replaces that model with a **discovery-based investigation system**. Progress is now earned by **finding evidence**, not by following a script. Any valid forensic technique that surfaces the same piece of evidence counts equally.

---

## Files Produced

### New Files

| File | Purpose |
|---|---|
| `database/discovery_based_progression_refactor.sql` | **Run this first.** Creates 3 new tables and adds 4 columns to existing tables. |
| `backend/models/discoveryModel.js` | All DB queries for the discovery system (discoveries, triggers, session state). |
| `backend/services/discoveryService.js` | Pure matching logic — evaluates a parsed command against all discovery triggers. No DB calls. |

### Modified Files

| File | Change |
|---|---|
| `backend/models/terminalModel.js` | `saveCommand` now accepts `matchType` (`'direct'` / `'discovery'` / `null`) and writes it to `command_history`. |
| `backend/models/scenarioModel.js` | `getVirtualFilesByScenario` now returns `evidence_tags`, `reveal_at_discovery_key`, and `metadata`. |
| `backend/controllers/terminalController.js` | Runs discovery evaluation in parallel with the existing step matcher. Saves discoveries, resolves file reveals from both systems, returns `newDiscoveries[]` in the API response. |
| `backend/services/evaluationService.js` | `calculateScore` accepts optional `discoveries` and `completedDiscoveryIds`. Uses critical discovery weights for path score when discoveries exist; falls back to step weights for legacy scenarios. |
| `backend/controllers/sessionController.js` | `completeSession` loads discoveries + session discovery IDs, computes `missionCompleted` from critical discovery coverage, and returns a full evidence map in the response. |

### Rebuilt Files

| File | Change |
|---|---|
| `frontend/src/pages/Mission/Levels/suspicious_script_exec_level.sql` | "Dead Drop" scenario fully rebuilt with discovery-based triggers, richer virtual filesystem, evidence tags, and realistic file metadata. Now includes a cleanup block at the top for safe re-runs. |

---

## Database Schema Changes

### New Tables

```
scenario_discoveries
  discovery_id, scenario_id, discovery_key, title, description,
  evidence_tags[], weight_percent, discovery_order, is_critical,
  maps_to_step_order, reveal_hint

discovery_triggers
  trigger_id, discovery_id, trigger_command,
  target_pattern, match_type, name_filter_pattern

session_discoveries
  session_discovery_id, session_id, discovery_id,
  discovery_key, triggered_by_command, discovered_at
```

### Added Columns

```
virtual_files
  + evidence_tags              TEXT[]    -- forensic categories e.g. ['persistence','cron']
  + reveal_at_discovery_key    VARCHAR   -- unlock file when this discovery fires
  + metadata                   JSONB     -- realistic attributes (owner, permissions, size)

command_history
  + match_type                 VARCHAR   -- 'direct' | 'discovery' | NULL
```

---

## How the Dual Evaluation Works

Every command now passes through two engines in sequence:

```
User types command
       │
       ▼
  parseCommand()
       │
       ├──► matchCommand()        ← existing step matcher (keeps hint system working)
       │      exact / relative / bare match against expected_steps
       │      → matched=true, step_order credited as 'direct'
       │
       └──► matchDiscoveries()    ← new discovery engine (runs in parallel)
              for each uncompleted discovery:
                for each trigger:
                  check command + target + flags
              → newDiscoveries[] (any command can unlock multiple discoveries)

Combined result:
  - If direct match only    → save with match_type='direct'
  - If discovery only       → save with match_type='discovery', credit maps_to_step_order
  - If both                 → save as 'direct', discovery also recorded
  - If neither              → save as unmatched

File reveals check both:
  - reveal_at_step (legacy)
  - reveal_at_discovery_key (new)
```

The hint system (`playerStateAnalyzer`, `hintLevelService`) reads `command_history.match_step_order` — unchanged. Discovery-credited steps appear there via `maps_to_step_order`, so ARIA hint levels stay accurate regardless of which path the player took.

---

## Trigger Matching Rules

| match_type | Behaviour |
|---|---|
| `exact` | Resolved target must equal pattern exactly |
| `prefix` | Resolved target must start with pattern |
| `contains` | Resolved target must contain pattern |
| `wildcard` | Pattern supports `*` as multi-character wildcard |

Special cases handled by the engine:
- **`locate`** — target is matched as a keyword (search term), not a resolved path
- **`find -name`** — `name_filter_pattern` is matched against the `-name` argument value (wildcards and quotes stripped)

---

## Scoring Changes

| Component | Before | After |
|---|---|---|
| **Path Score (50 pts)** | Sum of weight_percent for matched steps / 2 | Sum of weight_percent for completed **critical discoveries** / 2. Falls back to step weights if no discoveries defined. |
| **Command Usage (30 pts)** | Reference count = expected steps | Reference count = critical discovery count (when discoveries exist) |
| **Conclusion Score (20 pts)** | Required objectives completed | Unchanged — objectives still trigger from step_orders |
| **Hint Penalty** | -5 per hint | Unchanged |
| **Mission Complete** | All required objectives done | All critical discoveries found **AND** all required objectives done (when discoveries exist) |

Backward compatibility is guaranteed: scenarios without any `scenario_discoveries` rows score exactly as they did before.

---

## "Dead Drop" Scenario Rebuild

### Virtual Filesystem (was 12 files → now 16 files)

| Path | Visible | Evidence Tags |
|---|---|---|
| `/etc/cron.d/updater` | Yes | persistence, cron, scheduled_task, malicious |
| `/etc/cron.d/system-check` | Yes | scheduled_task |
| `/etc/hostname` | Yes | — |
| `/etc/passwd` | Yes | user_accounts |
| `/home/sysadmin/.bash_history` | **Hidden** → reveals on `CRON_SCHEDULER_ACCESSED` | user_activity, forensic_artifact |
| `/var/log/auth.log` | Yes | authentication, ssh, root_access |
| `/var/log/syslog` | Yes | execution_trace, cron, network_activity, exfiltration |
| `/var/log/net.log` | **Hidden** → reveals on `EXECUTION_TRACED_IN_SYSLOG` | network_forensics, c2, exfiltration, tls |
| `/tmp/sync.pid` | Yes | forensic_artifact, process_activity |
| `/tmp/.cache/sync.sh` | **Hidden** → reveals on `PAYLOAD_LOCATION_IDENTIFIED` | malware, exfiltration, bash_script |
| `/tmp/.cache/.exfil_manifest` | **Hidden** → reveals on `PAYLOAD_LOCATION_IDENTIFIED` | exfiltration, data_staging |

### Discoveries and Trigger Count

| Discovery | Weight | Critical | Triggers |
|---|---|---|---|
| `CRON_SCHEDULER_ACCESSED` | 15 | Yes | 8 |
| `MALICIOUS_CRON_ENTRY_READ` | 20 | Yes | 5 |
| `EXECUTION_TRACED_IN_SYSLOG` | 20 | Yes | 7 |
| `PAYLOAD_LOCATION_IDENTIFIED` | 25 | Yes | 8 |
| `SCRIPT_CONTENT_ANALYZED` | 20 | Yes | 4 |
| `EXFIL_CONFIRMED_VIA_NETLOG` | — | No (secret) | 4 |
| `PROCESS_ACTIVITY_EXAMINED` | — | No (bonus) | 2 |

Critical weight total: **100**

### Example Alternative Investigation Paths

The same `CRON_SCHEDULER_ACCESSED` discovery fires for all of:
```
ls /etc/cron.d          # most obvious
ls /etc                 # browsing the parent dir
find /etc               # recursive enumeration
find / -name "cron*"    # name-based search
find / -name "*.d"      # extension-based search
locate cron             # keyword lookup
locate updater          # file-specific lookup
grep -r "" /etc         # recursive search in /etc
```

---

## Deployment Steps

```sql
-- Step 1: Run the migration (adds new tables and columns)
\i database/discovery_based_progression_refactor.sql

-- Step 2: Run the rebuilt scenario
-- (the cleanup block at the top safely removes any existing Dead Drop data first)
\i frontend/src/pages/Mission/Levels/suspicious_script_exec_level.sql
```

No backend restart configuration changes are needed. The discovery engine activates automatically for any scenario that has rows in `scenario_discoveries`. Scenarios without them continue to work exactly as before.

---

## What Was NOT Changed

- Real shell execution is not used — the system remains a fully simulated Linux environment
- The hint system (ARIA, player state analyzer, hint level service, auto-trigger) is unchanged
- The `expected_steps` table still exists and still powers the hint level tracking
- The session lifecycle, XP, badge, and progression systems are unchanged
- No Docker, no VMs, no containers — the architecture stays lightweight
