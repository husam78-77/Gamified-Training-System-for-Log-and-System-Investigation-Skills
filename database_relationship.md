# Database Conceptual Data Model

This document outlines the database tables, their purpose, and the relationships (foreign keys) connecting them within the Gamified Training System. It can be used as a reference to design your conceptual data model.

## 1. Core Entities

### **`users`**
- **Description**: Stores user account details, role, level, and experience points (XP).
- **Foreign Keys (Linked To)**: None
- **Tables Linked To It**: `sessions`, `user_progress`, `badges`

### **`scenarios`**
- **Description**: Defines the training scenarios/missions, including title, type, and difficulty.
- **Foreign Keys (Linked To)**: None
- **Tables Linked To It**: `virtual_files`, `expected_steps`, `sessions`, `user_progress`, `badges`, `objectives`, `ai_hint_log`, `session_player_state`, `scenario_discoveries`, `user_hint_progress`, `hint_cache`

### **`sessions`**
- **Description**: Represents an active or completed gameplay session by a user on a specific scenario.
- **Foreign Keys (Linked To)**: 
  - `user_id` -> `users`
  - `scenario_id` -> `scenarios`
- **Tables Linked To It**: `command_history`, `evaluation_results`, `ai_hint_log`, `session_player_state`, `session_discoveries`, `user_hint_progress`

---

## 2. Scenario Content & Discovery System

### **`virtual_files`**
- **Description**: Represents the files/directories available to the player within the simulated environment.
- **Foreign Keys (Linked To)**: `scenario_id` -> `scenarios`
- **Tables Linked To It**: None

### **`expected_steps`**
- **Description**: The legacy sequential steps expected to be performed in a scenario.
- **Foreign Keys (Linked To)**: `scenario_id` -> `scenarios`
- **Tables Linked To It**: None

### **`objectives`**
- **Description**: Visible and secret objectives that guide the player in a scenario.
- **Foreign Keys (Linked To)**: `scenario_id` -> `scenarios`
- **Tables Linked To It**: None

### **`scenario_discoveries`**
- **Description**: Defines pieces of evidence/clues that can be discovered within a scenario.
- **Foreign Keys (Linked To)**: `scenario_id` -> `scenarios`
- **Tables Linked To It**: `discovery_triggers`, `session_discoveries`

### **`discovery_triggers`**
- **Description**: Commands and target patterns that unlock a specific discovery.
- **Foreign Keys (Linked To)**: `discovery_id` -> `scenario_discoveries`
- **Tables Linked To It**: None

---

## 3. Session Tracking & Player History

### **`command_history`**
- **Description**: Log of all terminal commands executed by the user during a session.
- **Foreign Keys (Linked To)**: `session_id` -> `sessions`
- **Tables Linked To It**: None

### **`session_discoveries`**
- **Description**: Records which discoveries a user has unlocked during a specific session.
- **Foreign Keys (Linked To)**: 
  - `session_id` -> `sessions`
  - `discovery_id` -> `scenario_discoveries`
- **Tables Linked To It**: None

### **`evaluation_results`**
- **Description**: Stores the scores and outcome details upon session completion.
- **Foreign Keys (Linked To)**: `session_id` -> `sessions`
- **Tables Linked To It**: None

### **`session_player_state`**
- **Description**: Summary of a player's behavior and hint usage tracking per session.
- **Foreign Keys (Linked To)**: 
  - `session_id` -> `sessions`
  - `scenario_id` -> `scenarios`
- **Tables Linked To It**: None

---

## 4. AI Hint Engine

### **`ai_hint_log`**
- **Description**: Log of hints requested and returned during a session for analytics.
- **Foreign Keys (Linked To)**: 
  - `session_id` -> `sessions`
  - `scenario_id` -> `scenarios`
- **Tables Linked To It**: None

### **`user_hint_progress`**
- **Description**: Tracks the hint levels a user has reached for specific steps.
- **Foreign Keys (Linked To)**: 
  - `session_id` -> `sessions`
  - `scenario_id` -> `scenarios`
- **Tables Linked To It**: None

### **`hint_cache`**
- **Description**: Global shared cache for AI-generated hints to avoid redundant API calls.
- **Foreign Keys (Linked To)**: `scenario_id` -> `scenarios`
- **Tables Linked To It**: None

---

## 5. Player Progression & Achievements

### **`user_progress`**
- **Description**: Overall progression tracking of a user's completion of scenarios.
- **Foreign Keys (Linked To)**: 
  - `user_id` -> `users`
  - `scenario_id` -> `scenarios`
- **Tables Linked To It**: None

### **`badges`**
- **Description**: Achievements and badges awarded to users for specific actions.
- **Foreign Keys (Linked To)**: 
  - `user_id` -> `users`
  - `scenario_id` -> `scenarios`
- **Tables Linked To It**: None
