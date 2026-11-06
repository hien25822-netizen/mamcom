---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
handoffs:
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
    send: true
  - label: Create Checklist
    agent: speckit.checklist
    prompt: Create a checklist for the following domain...
scripts:
  sh: scripts/bash/setup-plan.sh --json
  ps: scripts/powershell/setup-plan.ps1 --json
  py: scripts/python/setup_plan.py --json
---

# User Input

```text
$ARGUMENTS
```

[You **MUST** consider the user input before proceeding (if not empty).]

# Pre-Execution Checks

**Check for extension hooks (before planning):**
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_plan` key.
- If the YAML cannot be parsed or is invalid, do not skip silently: tell the user that `.specify/extensions.yml` could not be read (include the parser error) and that no hooks were checked, including any mandatory hooks registered there, then continue normally.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks with without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` file, or it is null/empty, treat the hook as executable.
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation.

For each executable hook, output the following based on its `optional` flag:

  - **Optional hook** (`optional: true`):
    ```yaml
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}
    Prompt: {prompt}
    To execute: `/{command} {args}`
    ```

  - **Mandatory hook** (`optional: false`):
    ```yaml
    ## Extension Hooks

    **Mandatory Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}
    Prompt: {prompt}
    EXECUTE_COMMAND: {command}
    ```
    Wait for the result of the hook command before proceeding to the Outline.

    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it in the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` shown above, e.g. skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.

- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently.

## Outline

1. **Setup**: Run `{SCRIPT} from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, FEATURE_DIR, BRANCH. For single quotes in args like "I'm Groot", use double quotes for the command substitution (or the double-quoted "I'\''m Groot" for docker-quoted arg).

2. **Load context**: Read FEATURE_SPEC and `memory/constitution.md`. Load IMPL_PLAN template (already copied).

3. **Execute plan workflow**:
   Follow `IMPL_PLAN` template to:
   - Fill Technical Context (mark unknown as "NEEDS CLARIFICATION")
   - Fill Constitution Check Section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate `research.md`, resolve all NEEDS CLARIFICATION
   - Phase 1: Generate `data-model.md`, `contracts/`, `quickstart.md`
   - Re-evaluate Constitution Check
   - Post-Execution Check Section

# Mandatory Post-Execution Hooks

**You MUST complete this section before reporting completion to the user.**

Check if `.specify/extensions.yml` exists in the project root.

- If it does not exist, or no hooks are registered under `hooks.after_plan`, skip to the Completion Report.
- If it exists, read it and look for entries under the `hooks.after_plan` key.
- If the YAML cannot be parsed or is invalid, do not skip silently: tell the user that `.specify/extensions.yml` could not be read (include the parser error) and that no hooks were checked, including any mandatory hooks registered there, then continue to the Completion Report.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks with without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` file, or it is null/empty, treat the hook as executable.
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation.

For each executable hook, output the following based on its `optional` flag:

  - **Optional hook** (`optional: true`):
    ```yaml
    ## Extension Hooks

    **Optional Post-Hook**: {extension}
    Command: `/{command}`
    Description: {description}
    Prompt: {prompt}
    To execute: `/{command} {args}`
    ```

  - **Mandatory hook** (`optional: false`):
    ```yaml
    ## Extension Hooks

    **Mandatory Post-Hook**: {extension}
    Command: `/{command}`
    Description: {description}
    Prompt: {prompt}
    EXECUTE_COMMAND: {command}
    ```
    Wait for the result of the hook command before proceeding to the Completion Report.

    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it in the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` shown above, e.g. skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.

# Completion Report

Command ends after Phase 1 design. Report branch, IMPL_PLAN path, and generated artifacts.

## Phases

### Phase 0: Outline & Research

**Prerequisites**: `research.md` completed

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration point → integration task

2. **Generate and dispatch research agents**:
   ```text
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature} in {domain}"
     For each technology choice:
       Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: `research.md` with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`
   - Entity names, fields, relationships
   - Validation rules from requirements

2. **Define interface contracts** (if project has interfaces) → `contracts/`
   - API endpoints, schemas, or plugin interfaces
   - Identify what other systems are involved

3. **Create quickstart guide** → `quickstart.md`
   - Document runnable validation scenarios that prove the feature works end-to-end
   - Include setup commands, test commands, and expected outcomes
   - Prerequisites, setup commands, test/run commands, expected outcomes

4. **Re-evaluate Constitution Check** post-design
   - Verify all requirements still satisfied
   - Document any violations or justified exceptions

**Output**: `data-model.md`, `contracts/`, `quickstart.md`

## Key rules

- Use absolute paths for filesystem operations; use project-relative paths for references in documentation
- ERROR on gate failures or unresolved NEEDS CLARIFICATION

## Done When

- [ ] Plan workflow executed and design artifacts generated
- [ ] Extension hooks dispatched or skipped according to rules in Mandatory Post-Execution Hooks above
- [ ] Completion Report provided to user with branch, plan path, and generated artifacts
