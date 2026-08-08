# KINETIC BREACH
# Execution Plan

Version: 2.0

This document defines the implementation order for the current frontend
development phase.

Read:

docs/development_rules.md

before starting any task.

Also read:

docs/evaluation_pipeline.md

when working near submission, investigation state, or evaluation-related
integration.

------------------------------------------------------------
# CURRENT PROJECT STATE
------------------------------------------------------------

The Evaluation Pipeline has already been completed and validated.

The following systems are considered existing functionality:

- Discovery Engine
- Objective Engine
- Investigation Events
- Command History
- Investigation Analytics
- Investigation Report
- Submission
- Mechanical Evaluation
- AI Review
- XP / progression integration

Do not rebuild these systems.

Do not redesign the evaluation architecture during this phase.

The current priority is the frontend experience.

------------------------------------------------------------
# PRIMARY GOAL
------------------------------------------------------------

Transform the current frontend into a coherent simulated desktop
environment.

The player should feel like they are operating an investigation workstation
rather than navigating unrelated application pages.

The frontend must provide:

- reliable application launching
- reliable window management
- taskbar behaviour
- desktop icons
- focus management
- minimize / restore
- maximize / restore
- close behaviour
- consistent application windows
- consistent visual language
- polished application interfaces

Existing functionality must remain intact.

------------------------------------------------------------
# PHASE 1
# FRONTEND ARCHITECTURE AUDIT
------------------------------------------------------------

Priority: CRITICAL

Do not modify code immediately.

First inspect the current frontend.

------------------------------------------------------------

## Task 1.1 — Inspect Desktop Architecture

Inspect:

- DesktopPage
- Desktop
- WindowManager
- applicationRegistry
- Desktop context/state
- application hooks
- application services
- taskbar
- desktop icons
- window components
- application components

Document how they currently communicate.

Identify:

- duplicated state
- duplicated logic
- hardcoded application launches
- inconsistent window behaviour
- application lifecycle problems
- styling problems
- dead code
- unused components

Do not rebuild anything before understanding the existing implementation.

Definition of Done:

The existing Desktop architecture is understood and documented in the
handover/task summary.

------------------------------------------------------------

## Task 1.2 — Inspect Every Application

Audit all currently registered applications.

At minimum inspect:

- Terminal
- Email
- Browser
- Files
- Alerts
- ARIA
- Report

For every application determine:

- how it is registered
- how it opens
- how it receives data
- how it closes
- how its state is preserved
- how it is styled
- whether it depends on WindowManager
- whether it contains duplicate window logic

Definition of Done:

Every current application has a known lifecycle and launch path.

------------------------------------------------------------

# PHASE 2
# WINDOW MANAGEMENT FOUNDATION
------------------------------------------------------------

Priority: CRITICAL

Fix the shared window infrastructure before polishing applications.

------------------------------------------------------------

## Task 2.1 — Application Opening

Ensure every application opens through:

applicationRegistry
→ WindowManager
→ Application Component

Do not create application-specific launch paths.

Test every application.

Definition of Done:

Every registered application opens using the same architectural flow.

------------------------------------------------------------

## Task 2.2 — Single Instance Behaviour

Define and implement single-instance behaviour for applications unless
there is a legitimate reason to support multiple instances.

If an application is already open:

Opening it again should focus the existing window.

It must not create duplicate windows.

Definition of Done:

Repeatedly opening an application produces one window.

------------------------------------------------------------

## Task 2.3 — Window Focus

Implement/fix:

- click-to-focus
- active window state
- z-index ordering
- opening brings window to front
- restoring brings window to front
- taskbar focus brings window to front

Test with multiple open applications.

Definition of Done:

The focused application is always visually and logically on top.

------------------------------------------------------------

## Task 2.4 — Minimize

Implement/fix minimize behaviour.

When minimized:

- application remains mounted
- application state remains intact
- window disappears from active desktop view
- taskbar still shows the application

Definition of Done:

Minimize does not destroy application state.

------------------------------------------------------------

## Task 2.5 — Restore

Implement/fix restore behaviour.

Restoring must:

- make the window visible
- preserve application state
- focus the window
- preserve sensible position and size

Definition of Done:

A minimized application can be restored without losing state.

------------------------------------------------------------

## Task 2.6 — Maximize / Restore

Implement/fix:

- maximize
- restore from maximize

The previous sensible window dimensions and position should be preserved
where appropriate.

Definition of Done:

Maximize and restore work consistently across applications.

------------------------------------------------------------

## Task 2.7 — Close

Implement/fix close behaviour.

Closing an application must:

- remove it from WindowManager state
- unmount the application
- remove its running state from the taskbar

Reopening it must create a clean application instance unless the
application architecture explicitly requires persistence.

Definition of Done:

Close and reopen work correctly.

------------------------------------------------------------

# PHASE 3
# WINDOW FRAME
------------------------------------------------------------

Priority: HIGH

Create or improve one reusable window frame.

Do not duplicate window chrome inside individual applications.

------------------------------------------------------------

## Task 3.1 — Window Header

Implement a consistent title bar containing:

- application title
- minimize control
- maximize/restore control
- close control

The active window should have a visually distinguishable focused state.

------------------------------------------------------------

## Task 3.2 — Window Styling

Create a coherent shared window style.

Define:

- border
- radius
- shadow
- title bar height
- spacing
- background
- focus state
- disabled state where needed

Do not redesign individual application interiors yet.

------------------------------------------------------------

## Task 3.3 — Window Dimensions

Define sensible default dimensions.

Suggested starting points:

Terminal:
large

Files:
large

Browser:
large

Report:
large

Email:
medium

ARIA:
medium

Alerts:
small/medium

These are starting points only.

Use the existing UI and content to determine the final values.

------------------------------------------------------------

## Task 3.4 — Window Positioning

Windows should open inside the visible desktop area.

Avoid every application opening at exactly the same position if the existing
architecture supports cascading/offset positioning.

Do not use viewport-specific hardcoded coordinates that break at different
screen sizes.

------------------------------------------------------------

# PHASE 4
# DESKTOP SHELL
------------------------------------------------------------

Priority: HIGH

Improve the Desktop itself.

------------------------------------------------------------

## Task 4.1 — Desktop Layout

Ensure:

- wallpaper fills the available desktop
- desktop icons have a predictable layout
- windows remain inside the usable desktop area
- taskbar does not overlap important content
- desktop scales correctly with viewport changes

------------------------------------------------------------

## Task 4.2 — Desktop Icons

Implement/fix application icons.

Requirements:

- icon
- application name
- hover state
- selected state where appropriate
- launch behaviour

Desktop icons must use the standard application launch mechanism.

They must not contain application business logic.

------------------------------------------------------------

## Task 4.3 — Taskbar

Implement/fix the taskbar.

The taskbar must derive its application state from WindowManager.

It must display:

- running applications
- active application
- minimized applications

Interactions should support:

- focus
- restore
- minimize

Do not create a separate taskbar state store.

------------------------------------------------------------

## Task 4.4 — System Indicators

Audit and polish the system indicators.

Potential indicators include:

- clock
- network
- notifications
- system status
- power/session controls

Use the existing implementation where available.

Do not invent backend functionality merely to create visual indicators.

------------------------------------------------------------

# PHASE 5
# APPLICATION FUNCTIONAL UX
------------------------------------------------------------

Priority: HIGH

Before visual polish, make sure every application behaves correctly.

------------------------------------------------------------

## Task 5.1 — Terminal

Verify:

- opens
- closes
- minimizes
- restores
- maximizes
- focuses
- commands execute
- output scrolls correctly
- terminal state survives minimize/restore
- no duplicate session creation occurs

Do not change backend terminal logic unless a genuine bug is found.

------------------------------------------------------------

## Task 5.2 — Files

Verify:

- opens
- closes
- minimizes
- restores
- directory navigation
- breadcrumb navigation
- file opening
- file viewing
- file state
- FILE_OPENED event integration

Ensure File Manager continues to use the shared virtual filesystem.

Do not create a separate filesystem model.

------------------------------------------------------------

## Task 5.3 — Email

Verify:

- opens
- closes
- minimizes
- restores
- message list
- message selection
- message content
- email events
- incident-specific data

Do not hardcode email content in the frontend.

------------------------------------------------------------

## Task 5.4 — Browser

Verify:

- opens
- closes
- minimizes
- restores
- sidebar
- article navigation
- selected article
- article content
- ARTICLE_OPENED events

Do not introduce external requests.

------------------------------------------------------------

## Task 5.5 — ARIA

Verify:

- opens
- closes
- minimizes
- restores
- hint request
- loading state
- error state
- response display
- hint history/state where applicable

Do not change ARIA backend logic during this phase.

------------------------------------------------------------

## Task 5.6 — Investigation Report

Verify:

- opens
- editor works
- save works
- report state survives minimize/restore
- submission works
- review results display correctly

Preserve the existing submission and evaluation pipeline.

------------------------------------------------------------

## Task 5.7 — Alerts

Verify:

- alert presentation
- opening/closing behaviour
- readable content
- correct relationship with Desktop state

Do not introduce fake alert data if the existing system already provides it.

------------------------------------------------------------

# PHASE 6
# APPLICATION VISUAL POLISH
------------------------------------------------------------

Priority: MEDIUM

Only begin after all application functionality and window behaviour are
stable.

------------------------------------------------------------

## Task 6.1 — Terminal Visual Design

Improve:

- terminal header
- prompt
- output readability
- command area
- scrolling
- spacing
- status presentation
- colours
- typography

Preserve terminal functionality.

------------------------------------------------------------

## Task 6.2 — Email Visual Design

Improve:

- inbox
- message list
- selected message
- unread state
- sender
- timestamp
- subject
- message body
- spacing

Make it feel like a believable mail client.

------------------------------------------------------------

## Task 6.3 — Files Visual Design

Improve:

- file tree
- folder icons
- file icons
- selected item
- breadcrumb
- viewer
- spacing
- typography
- navigation feedback

Make it feel like a believable file manager.

------------------------------------------------------------

## Task 6.4 — Browser Visual Design

Improve:

- browser header
- navigation
- sidebar
- article layout
- selected page
- typography
- spacing

Make it feel like an educational investigation browser rather than a
generic content panel.

------------------------------------------------------------

## Task 6.5 — ARIA Visual Design

Improve:

- assistant identity
- hint presentation
- loading state
- response cards
- hint level
- status
- feedback

ARIA should visually feel like part of the investigation environment.

------------------------------------------------------------

## Task 6.6 — Report Visual Design

Improve:

- editor
- toolbar/actions
- save indicator
- submission button
- review result
- score
- criteria
- strengths
- weaknesses
- feedback

Make the result feel like a completed investigation report rather than a
generic form.

------------------------------------------------------------

## Task 6.7 — Alerts Visual Design

Improve:

- alert hierarchy
- severity indication
- timestamps
- readable presentation
- notification states

------------------------------------------------------------

# PHASE 7
# DESKTOP VISUAL POLISH
------------------------------------------------------------

Priority: MEDIUM

After applications are individually polished, refine the entire Desktop.

------------------------------------------------------------

## Task 7.1 — Visual Language

Create a consistent visual language across:

- wallpaper
- desktop
- windows
- taskbar
- icons
- typography
- colours
- borders
- shadows
- interaction states

The environment should feel like one operating system.

------------------------------------------------------------

## Task 7.2 — Hover States

Add appropriate hover states to:

- icons
- taskbar items
- window controls
- application controls
- navigation items

Do not overuse animation.

------------------------------------------------------------

## Task 7.3 — Active States

Clearly communicate:

- active application
- selected file
- selected email
- selected browser article
- focused window
- minimized window

Do not rely only on colour.

------------------------------------------------------------

## Task 7.4 — Animations

Add subtle animations for:

- opening
- closing
- minimizing
- restoring
- focusing where appropriate
- taskbar interactions

Animations must never delay or block functionality.

Prefer short, subtle transitions.

------------------------------------------------------------

# PHASE 8
# RESPONSIVE BEHAVIOUR
------------------------------------------------------------

Priority: HIGH

Test supported viewport sizes.

Verify:

- desktop remains usable
- windows remain accessible
- taskbar remains visible
- application content remains readable
- no important controls leave the viewport
- no unexpected horizontal overflow
- maximized windows behave correctly

Fix layout issues without introducing viewport-specific hacks.

------------------------------------------------------------

# PHASE 9
# COMPLETE END-TO-END TEST
------------------------------------------------------------

Priority: CRITICAL

Perform a complete real playthrough.

Use the actual application.

Flow:

Mission Dashboard
        ↓
Mission Selection
        ↓
Desktop
        ↓
Email
        ↓
Browser
        ↓
Files
        ↓
Terminal
        ↓
ARIA
        ↓
Report
        ↓
Submission
        ↓
AI Review

During the playthrough:

1. Open Email.
2. Minimize Email.
3. Open Browser.
4. Return to Email through Taskbar.
5. Open Files.
6. Open an evidence file.
7. Minimize Files.
8. Restore Files.
9. Open Terminal.
10. Execute commands.
11. Minimize Terminal.
12. Restore Terminal.
13. Maximize Terminal.
14. Restore Terminal.
15. Open ARIA.
16. Open Report.
17. Edit the report.
18. Save the report.
19. Switch between applications.
20. Submit the investigation.
21. Verify AI Review.
22. Verify session completion.

Definition of Done:

The complete investigation can be performed without frontend errors.

------------------------------------------------------------

# PHASE 10
# REGRESSION TESTING
------------------------------------------------------------

After frontend changes, verify that existing backend systems still work.

Check:

- authentication
- session creation
- investigation loading
- environment loading
- Terminal
- Files
- Email
- Browser
- Discoveries
- Objectives
- ARIA
- Report
- Submission
- Mechanical Score
- AI Review
- XP / progression

Do not modify working backend systems simply because the frontend was
refactored.

------------------------------------------------------------

# PHASE 11
# CODE QUALITY REVIEW
------------------------------------------------------------

After all frontend tasks are complete:

Search for:

- duplicated window logic
- duplicated application launch logic
- duplicated state
- dead components
- unused imports
- unused CSS
- unnecessary props
- hardcoded incident identifiers
- hardcoded application behaviour
- console errors
- React warnings

Clean them up.

Do not perform unrelated refactors.

------------------------------------------------------------

# FINAL DEFINITION OF DONE
------------------------------------------------------------

This frontend phase is complete only when:

[ ] Desktop loads correctly.

[ ] All applications open through the standard registry/WindowManager flow.

[ ] No duplicate application instances appear unexpectedly.

[ ] Windows can be focused.

[ ] Windows can be minimized.

[ ] Windows can be restored.

[ ] Windows can be maximized.

[ ] Windows can return from maximized state.

[ ] Windows can be closed.

[ ] Application state survives minimize/restore.

[ ] Taskbar reflects actual WindowManager state.

[ ] Desktop icons launch applications correctly.

[ ] Terminal works.

[ ] Files works.

[ ] Email works.

[ ] Browser works.

[ ] ARIA works.

[ ] Report works.

[ ] Alerts work.

[ ] Applications have loading/error/empty states where required.

[ ] Applications visually belong to the same Desktop environment.

[ ] Windows remain usable across supported viewport sizes.

[ ] No major React warnings remain.

[ ] No major console errors remain.

[ ] No existing evaluation functionality is broken.

[ ] Complete end-to-end playthrough succeeds.

------------------------------------------------------------
# EXECUTION RULE
------------------------------------------------------------

Work sequentially.

Do not skip tasks.

Do not ask for confirmation between normal tasks.

After completing each task:

1. Inspect the result.
2. Run the appropriate validation.
3. Fix regressions immediately.
4. Continue to the next task.

Do not move to visual polish while core functionality is broken.

Do not move to animations while application/window behaviour is broken.

Do not move to new gameplay systems until this frontend phase reaches
Definition of Done.

If a task is blocked:

1. Identify the blocker.
2. Inspect the relevant implementation.
3. Attempt a safe solution.
4. Document the blocker if it cannot be resolved.

Do not silently work around architectural problems.

------------------------------------------------------------
# FINAL GOAL
------------------------------------------------------------

The player should experience KINETIC BREACH as a coherent simulated
investigation workstation.

The Desktop should feel like an operating environment.

The applications should feel like real tools inside that environment.

The player should be able to move naturally between:

Email
Browser
Files
Terminal
ARIA
Report

without feeling that they are navigating separate web pages.

The underlying investigation, session, discovery, objective, submission,
and evaluation systems must remain intact throughout the frontend work.