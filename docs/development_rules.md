# KINETIC BREACH
# Development Rules

Version: 2.0

This document defines the permanent architectural and development rules
for KINETIC BREACH.

These rules must always be followed.

Do not violate these rules unless explicitly instructed.

------------------------------------------------------------
# 1. GENERAL PRINCIPLES
------------------------------------------------------------

KINETIC BREACH is a data-driven educational investigation platform.

Prefer reusable systems over scenario-specific implementations.

If a solution only works for one incident, redesign it so that future
incidents can use the same system.

Do not introduce temporary implementations when a reusable implementation
is reasonably possible.

------------------------------------------------------------
# 2. SINGLE RESPONSIBILITY
------------------------------------------------------------

Each module must have a clear responsibility.

Builders:
- Build and validate content.

Engines:
- Coordinate domain logic.

Controllers:
- Handle HTTP requests and responses.

Routes:
- Expose API endpoints.

Services:
- Handle reusable application/domain operations.

Models:
- Handle database access.

React components:
- Render UI and handle component-level interaction.

Hooks:
- Manage reusable frontend state/behaviour.

Contexts:
- Provide shared application state.

Do not mix unrelated responsibilities.

------------------------------------------------------------
# 3. DATA-DRIVEN DESIGN
------------------------------------------------------------

Scenario-specific information must not be hardcoded into application logic.

Scenario content belongs under:

backend/content/incidents/<incidentId>/

Examples:

incident.json
discoveries.json
objectives.json
review.json
emails.json
browser.json
desktop.json
alerts.json
assets/

If information changes between incidents, it should normally be content,
not code.

------------------------------------------------------------
# 4. TEMPLATE SYSTEM
------------------------------------------------------------

The Ubuntu server template must remain generic.

Do not modify:

backend/content/templates/ubuntu_server/

for the requirements of a single incident.

Scenario-specific filesystem changes must be implemented through the
incident's assets.

Examples:

assets/create/
assets/replace/
assets/deleted/

The same template must remain usable by future incidents.

------------------------------------------------------------
# 5. INCIDENT ISOLATION
------------------------------------------------------------

Each incident must be self-contained.

Everything specific to an incident belongs inside:

backend/content/incidents/<incidentId>/

An incident must not depend on another incident's content.

Do not hardcode:

ssh_bruteforce

or any other incident identifier inside generic engines.

------------------------------------------------------------
# 6. NO DUPLICATE LOGIC
------------------------------------------------------------

Before creating a new implementation:

1. Search the project.
2. Find existing functionality.
3. Reuse or extend it if appropriate.

Do not create:

- duplicate services
- duplicate hooks
- duplicate contexts
- duplicate window managers
- duplicate application registries
- duplicate filesystem systems
- duplicate terminal history systems

Prefer extending an existing system over creating a parallel system.

------------------------------------------------------------
# 7. DISCOVERY SYSTEM
------------------------------------------------------------

Discoveries represent knowledge gained during an investigation.

Discoveries must not represent:

- specific UI clicks
- one required command
- one required file path

Players should be able to reach discoveries through multiple valid
investigation approaches whenever possible.

Discovery definitions belong to:

discoveries.json

The Discovery Engine must remain generic.

------------------------------------------------------------
# 8. OBJECTIVE SYSTEM
------------------------------------------------------------

Objectives represent investigation goals.

Objectives depend on discoveries.

Objectives must not depend directly on:

- specific commands
- specific filenames
- specific UI applications

Objective definitions belong to:

objectives.json

------------------------------------------------------------
# 9. INVESTIGATION EVENTS
------------------------------------------------------------

investigation_events stores behavioural telemetry that is not already
owned by a more specific system.

Examples:

APPLICATION_OPENED
APPLICATION_CLOSED
FILE_OPENED
EMAIL_OPENED
ARTICLE_OPENED
REPORT_EDITED
REPORT_SAVED
REPORT_SUBMITTED
DISCOVERY_UNLOCKED
OBJECTIVE_COMPLETED
HINT_REQUESTED

Do not store terminal command text in investigation_events.

Terminal commands already have a dedicated source of truth:

command_history

Never duplicate command_history rows inside investigation_events.

------------------------------------------------------------
# 10. COMMAND HISTORY
------------------------------------------------------------

command_history is the single source of truth for terminal command history.

Every executed terminal command should be recorded there according to the
existing terminal architecture.

Do not create another terminal history table.

Do not duplicate terminal commands into investigation_events.

Command history may be used for:

- investigation analytics
- mechanical evaluation
- AI review
- debugging/testing

------------------------------------------------------------
# 11. INVESTIGATION ANALYTICS
------------------------------------------------------------

Raw behavioural data should be summarized before being provided to AI.

Analytics should derive compact information from:

- investigation_events
- command_history
- investigation_discoveries
- objectives
- hints
- session timing

Examples:

- applications used
- files investigated
- articles read
- emails opened
- command counts
- matched/unmatched commands
- most-used commands
- most-investigated files
- discoveries found
- objectives completed
- report activity
- hints used
- session duration

Do not send unnecessary raw event rows to the AI.

------------------------------------------------------------
# 12. EVALUATION
------------------------------------------------------------

Evaluation has separate responsibilities.

Mechanical evaluation determines gameplay-related scoring.

AI evaluation evaluates investigation quality and report quality.

AI must not control gameplay.

AI must not:

- unlock discoveries
- complete objectives
- award gameplay progression directly
- change the session state

AI review should consider:

- Investigation Report
- Command History
- Investigation Analytics

Evaluation criteria and weights must remain data-driven through:

review.json

------------------------------------------------------------
# 13. AI
------------------------------------------------------------

AI must remain incident-agnostic.

Do not hardcode SSH Brute Force-specific grading logic into AI services.

The AI should evaluate the player according to the incident's review.json.

AI feedback should be useful to a learner.

It should explain:

- strengths
- weaknesses
- reasoning
- areas for improvement

Do not allow the AI to reveal hidden solutions during normal investigation.

------------------------------------------------------------
# 14. DESKTOP ARCHITECTURE
------------------------------------------------------------

The Desktop is the operating environment in which investigation
applications run.

Applications must run inside the Desktop.

Applications must not replace or bypass the Desktop environment.

The Desktop is responsible for the environment shell.

------------------------------------------------------------
# 15. APPLICATION REGISTRY
------------------------------------------------------------

All Desktop applications must be registered through the existing
application registry.

Do not hardcode application launching inside individual Desktop components.

The registry is the source of truth for application metadata and component
resolution.

When adding a new application:

1. Create the application.
2. Register it.
3. Launch it through the standard Desktop flow.

------------------------------------------------------------
# 16. WINDOW MANAGER
------------------------------------------------------------

WindowManager is the single authority for application window state.

It is responsible for:

- opening windows
- closing windows
- minimizing windows
- restoring windows
- maximizing windows
- restoring from maximized state
- focusing windows
- z-index ordering
- active window state
- window positioning

Applications must not implement their own window management.

Do not create application-specific window managers.

------------------------------------------------------------
# 17. APPLICATION LIFECYCLE
------------------------------------------------------------

Applications follow a consistent lifecycle.

OPEN:
- Mount the application.
- Add it to WindowManager state.
- Focus it.

MINIMIZE:
- Keep the application mounted and preserve its state.
- Hide it from the active desktop view.

RESTORE:
- Make the application visible.
- Focus it.
- Preserve its previous state.

MAXIMIZE:
- Expand the window according to WindowManager rules.

RESTORE FROM MAXIMIZE:
- Return to the previous sensible window dimensions/position.

CLOSE:
- Remove the application from WindowManager state.
- Unmount the application.

------------------------------------------------------------
# 18. SINGLE INSTANCE APPLICATIONS
------------------------------------------------------------

Desktop applications should normally behave as single-instance
applications unless there is a specific reason to support multiple windows.

Opening an already-running single-instance application should focus the
existing window instead of creating a duplicate.

Do not allow accidental duplicate instances.

------------------------------------------------------------
# 19. WINDOW FOCUS
------------------------------------------------------------

Clicking an application window should bring it to the front.

The focused window must have the appropriate highest z-index.

Focus behaviour must work consistently when:

- clicking a window
- opening an application
- restoring from the taskbar
- restoring from minimized state

------------------------------------------------------------
# 20. TASKBAR
------------------------------------------------------------

The taskbar must reflect actual WindowManager state.

The taskbar must not maintain an independent fake copy of running
applications.

It should support:

- identifying running applications
- identifying the active application
- focusing an application
- restoring minimized applications
- minimizing applications when appropriate

------------------------------------------------------------
# 21. DESKTOP ICONS
------------------------------------------------------------

Desktop icons are launch controls.

They must not contain application business logic.

Clicking an icon must use the same application-launching path as other
Desktop launch mechanisms.

Do not create a second application-opening implementation for desktop
icons.

------------------------------------------------------------
# 22. WINDOW FRAME
------------------------------------------------------------

Application windows should share a reusable window frame.

The common window frame should provide:

- title bar
- application title
- close button
- minimize button
- maximize/restore button
- focus state
- consistent borders
- consistent spacing

Do not duplicate window controls inside every application.

------------------------------------------------------------
# 23. APPLICATION UI
------------------------------------------------------------

The window shell should be consistent.

Application interiors may have their own visual identity.

Examples:

Terminal:
- terminal-like interface

Email:
- mail client interface

Files:
- file manager interface

Browser:
- browser-like interface

ARIA:
- AI assistant interface

Report:
- investigation/report interface

Do not force every application into an identical internal design.

------------------------------------------------------------
# 24. APPLICATION DATA
------------------------------------------------------------

Applications must obtain their data through the existing service/context
architecture.

Do not hardcode scenario content inside React components.

For example:

Email content comes from the email system.

Browser content comes from the browser system.

Files come from the shared virtual filesystem.

Terminal operates against the shared environment.

------------------------------------------------------------
# 25. TERMINAL AND FILE MANAGER
------------------------------------------------------------

Terminal and File Manager must use the same virtual filesystem source of
truth.

Never maintain two separate representations of the investigation
filesystem.

A filesystem change must be reflected consistently in both applications.

------------------------------------------------------------
# 26. VISUAL CONSISTENCY
------------------------------------------------------------

The Desktop should feel like one coherent operating environment.

Maintain consistency in:

- spacing
- typography
- borders
- window controls
- interaction states
- colours
- transitions
- sizing

Application-specific styling may still differ where appropriate.

------------------------------------------------------------
# 27. SEPARATION OF LOGIC AND STYLING
------------------------------------------------------------

Do not put business logic into CSS.

Do not duplicate business logic merely to achieve a visual effect.

Visual changes must preserve existing functionality.

------------------------------------------------------------
# 28. RESPONSIVE BEHAVIOUR
------------------------------------------------------------

The Desktop must behave predictably across supported viewport sizes.

Windows must not open permanently outside the viewport.

Important controls must remain accessible.

Do not use fixed coordinates that make applications unusable on different
screen sizes.

------------------------------------------------------------
# 29. UI STATES
------------------------------------------------------------

Every application that performs asynchronous work should provide
appropriate:

- loading state
- error state
- empty state
- success state where appropriate

Do not leave users with blank screens when an operation is loading or fails.

------------------------------------------------------------
# 30. NO PLACEHOLDER REGRESSION
------------------------------------------------------------

Never replace a working application with a visual placeholder merely for
styling purposes.

Frontend improvements must preserve:

- existing API integration
- application functionality
- investigation state
- report state
- session state
- discovery state

------------------------------------------------------------
# 31. BACKEND PROTECTION
------------------------------------------------------------

Frontend visual work must not modify backend behaviour unless a genuine
integration bug is discovered.

Do not change:

- evaluation logic
- AI review logic
- discovery logic
- objective logic
- submission logic

merely to support visual changes.

------------------------------------------------------------
# 32. TESTING
------------------------------------------------------------

Every completed feature must be tested.

For frontend work verify:

- application opens
- application closes
- minimize works
- restore works
- maximize works
- focus works
- taskbar works
- desktop icon works
- application state survives minimize/restore
- no duplicate windows appear unexpectedly
- no console errors are introduced

Whenever possible test the real application rather than only isolated
components.

------------------------------------------------------------
# 33. REGRESSION SAFETY
------------------------------------------------------------

Before changing a shared system such as:

WindowManager
Desktop
applicationRegistry
Desktop context

inspect all consumers first.

A change to shared infrastructure must be tested against every application
that uses it.

------------------------------------------------------------
# 34. REFACTORING
------------------------------------------------------------

Leave the project cleaner than before.

Remove duplication.

Improve naming.

Improve readability.

Do not introduce abstractions without a clear benefit.

Do not rewrite working systems without a reason.

------------------------------------------------------------
# 35. FUTURE INCIDENT SUPPORT
------------------------------------------------------------

Every frontend system must work independently of a specific incident.

Adding:

ssh_forensics

or

suspicious_script

must not require rewriting the Desktop or application architecture.

Only scenario content and scenario-specific data should change whenever
possible.

------------------------------------------------------------
# 36. DEVELOPMENT ORDER
------------------------------------------------------------

For frontend work always follow this order:

1. Understand existing architecture.
2. Fix broken functionality.
3. Fix shared infrastructure.
4. Fix application lifecycle.
5. Fix application interaction.
6. Establish consistent window behaviour.
7. Establish consistent visual shell.
8. Polish individual applications.
9. Add animations/transitions.
10. Perform complete regression testing.

Never start with visual polish when the underlying interaction is broken.

------------------------------------------------------------
# 37. STOP CONDITIONS
------------------------------------------------------------

Do not move to a new major phase while the current phase has known
critical functionality failures.

If blocked:

- identify the exact blocker
- explain why it blocks progress
- inspect the relevant implementation
- attempt a safe solution

Do not silently work around architectural problems.

------------------------------------------------------------
# 38. FINAL ARCHITECTURAL GOAL
------------------------------------------------------------

KINETIC BREACH should behave as a coherent simulated investigation
environment.

The player should feel like they are operating a real investigation
workstation rather than navigating a collection of unrelated web pages.

The Desktop, applications, filesystem, investigation state, and evaluation
system must work together while remaining modular and reusable.

The architecture must support future incidents without requiring the
frontend architecture to be rewritten.