# Implementation Plan: [FEATURE]

**Branch**: `#[##-feature-name]` **Date**: [DATE] **Spec**: [link]
**Input**: Feature specification from `specs/[##-feature-name]/spec.md`

**Note**: This template is filled in by the `__SPECKIT_COMMAND_PLAN__` command, its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLM or NEEDS CLARIFICATION]
**Storage**: [e.g., PostgreSQL, CoreData, files or N/A]
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [e.g., library, web app, mobile/desktop app or NEEDS CLARIFICATION]
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]
**Constraints**: [domain-specific, e.g., <100ms memory, offline-capable or NEEDS CLARIFICATION]
**Scale/Scope**: [domain-specific, e.g., 10k users, 10M lines, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[##-feature-name]/
├── plan.md              # This file (the implementation plan output)
├── research.md          # Phase 0 output (created by __SPECKIT_COMMAND_RESEARCH__ command)
├── data-model.md        # Phase 1 output (created by __SPECKIT_COMMAND_TASKS__ command - NOT created by __SPECKIT_COMMAND_PLAN__ command)
├── quickstart.md        # Phase 1 output (created by __SPECKIT_COMMAND_TASKS__ command - NOT created by __SPECKIT_COMMAND_PLAN__ command)
├── contracts/           # Phase 1 output (created by __SPECKIT_COMMAND_TASKS__ command - NOT created by __SPECKIT_COMMAND_PLAN__ command)
└── tasks.md             # Phase 2 output (created by __SPECKIT_COMMAND_TASKS__ command - NOT created by __SPECKIT_COMMAND_PLAN__ command)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused option lines. The delivered plan must not
  include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (default)
src/
├── models/
├── services/
├── cli/
├── lib/
tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/
```

**Structure Decision**: [e.g., single project vs. web app; backend/frontend split rationale]

## Complexity Tracking

> **Fill ONLY if Checkboxes [X] are checked in [Section 3.5](#3-5-complexity-tracking).**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| e.g., 4th project | [e.g., why 3 projects insufficient] | [e.g., coupling, deployment complexity] |
| e.g., Repository pattern | [e.g., direct DB access insufficient] | [why direct DB access insufficient] |

**Gate**: Must pass before Phase 1 design. Re-check after Phase 1 design.

## Phase 0: Research

<!--
  ACTION REQUIRED: Replace the content in this section with findings from
  __SPECKIT_COMMAND_RESEARCH__ command.
-->

[to be filled by __SPECKIT_COMMAND_RESEARCH__ command]

## Phase 1: Design & Contracts

<!--
  ACTION REQUIRED: Design, contracts, and data model are created by
  __SPECKIT_COMMAND_TASKS__ command.
-->

[to be filled by __SPECKIT_COMMAND_TASKS__ command]
