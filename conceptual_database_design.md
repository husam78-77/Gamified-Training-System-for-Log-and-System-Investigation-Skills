# Database Table Relationships

Below are the direct relationships between the tables in the database, defined by their cardinality.

## User Relationships
* **users** to **sessions** : `1-to-Many` (1 user can have multiple sessions)
* **users** to **user_progress** : `1-to-Many` (1 user can have progress records for multiple scenarios)
* **users** to **badges** : `1-to-Many` (1 user can earn multiple badges)

## Scenario Relationships
* **scenarios** to **virtual_files** : `1-to-Many` (1 scenario contains multiple virtual files)
* **scenarios** to **expected_steps** : `1-to-Many` (1 scenario has multiple expected steps)
* **scenarios** to **objectives** : `1-to-Many` (1 scenario has multiple objectives)
* **scenarios** to **scenario_discoveries** : `1-to-Many` (1 scenario contains multiple discoveries)
* **scenarios** to **sessions** : `1-to-Many` (1 scenario can be played in multiple sessions)
* **scenarios** to **hint_cache** : `1-to-Many` (1 scenario can have multiple cached AI hints)

## Session Relationships
* **sessions** to **evaluation_results** : `1-to-1` (1 session produces exactly 1 evaluation result)
* **sessions** to **session_player_state** : `1-to-1` (1 session has exactly 1 player state tracking record)
* **sessions** to **command_history** : `1-to-Many` (1 session has multiple logged commands)
* **sessions** to **ai_hint_log** : `1-to-Many` (1 session can log multiple AI hint requests)
* **sessions** to **user_hint_progress** : `1-to-Many` (1 session tracks hint progress across multiple steps)

## Discovery Relationships
* **scenario_discoveries** to **discovery_triggers** : `1-to-Many` (1 discovery can be unlocked by multiple command triggers)
* **scenario_discoveries** to **session_discoveries** : `1-to-Many` (1 discovery can be unlocked across multiple sessions)
* **sessions** to **session_discoveries** : `1-to-Many` (1 session can unlock multiple discoveries)

## Junction Tables (Many-to-Many Relationships)
* **user_progress** : Resolves a `Many-to-Many` relationship between **users** and **scenarios**
* **badges** : Resolves a `Many-to-Many` relationship between **users** and **scenarios**
* **session_discoveries** : Resolves a `Many-to-Many` relationship between **sessions** and **scenario_discoveries**
