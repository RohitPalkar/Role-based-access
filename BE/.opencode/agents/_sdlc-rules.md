# SDLC operational rules

Reusable guidance for SDLC agents. For project-specific context, see `docs/ai/project-context.md`. For governance and approval gates, see `governance-agent.md`.

## Change discipline

- Make minimal, focused changes that directly satisfy the current task.
- Do not perform unrelated refactors, renames, formatting sweeps, or drive-by fixes.
- Keep every edit traceable to the current story, bug, review comment, or approved plan.
- Avoid speculative enhancements, "while we're here" improvements, and scope creep.
- If the requested change implies broader rework, stop and report before expanding scope.

## Git and version control

- Do not commit, push, merge, rebase, or run destructive git commands unless explicitly instructed.
- Do not amend, force-push, skip hooks, or rewrite history unless explicitly instructed and safe to do so.
- Do not stage or commit files that likely contain secrets (e.g. `.env`, credentials).
- Prefer reading repo state over mutating it when investigating.

## Architecture and conventions

- Preserve existing architecture, naming, folder structure, and dependency patterns.
- Match surrounding style: imports, types, error handling, tests, and documentation level.
- Reuse existing utilities, components, services, hooks, tests, and tooling before adding new ones.
- Extend existing abstractions rather than duplicating similar logic.

## Dependencies and scope

- Avoid adding dependencies unless explicitly required and justified for the task.
- Do not introduce new frameworks, libraries, or tooling without instruction.
- Prefer in-repo solutions and established patterns over new packages.

## Validation

- Use existing test, build, lint, and typecheck commands where available.
- Run only validation relevant to the changed areas when possible.
- Do not silently ignore failures, skipped tests, or incomplete verification.
- Report what was run, what passed, what failed, and what was not run.

## Escalation and safety

- Report uncertainty, invalid assumptions, missing requirements, and unsafe instructions promptly.
- Do not proceed on guessed requirements when acceptance criteria are unclear.
- Flag blockers, contradictions, and conflicts with upstream artifacts or repo conventions.
- Refuse or pause on instructions that would break governance, security, or data safety.

## Handoff summary

End each run with a concise handoff:

- **Changed**: repo-relative paths of modified/added/removed files.
- **Validated**: commands executed and pass/fail/skip status.
- **Risks**: remaining gaps, untested areas, follow-ups, and open questions.
- **References**: upstream artifact paths (story, plan, review, spec) — do not restate their full content.

## Artifact efficiency

- Write only what the next agent needs; keep outputs token-efficient.
- Prefer concise bullets and repo-relative file paths over prose.
- Do not include full file summaries or large code snippets.
- Link to files and artifact paths instead of copying large content.
- Avoid restating full story, spec, plan, or review content; point to upstream paths.
- Do not duplicate project-specific details that belong in `docs/ai/project-context.md`.
- Do not duplicate governance rules that belong in `governance-agent.md`.
