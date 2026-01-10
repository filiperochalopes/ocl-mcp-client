# AGENTS instructions

## Skills
A skill is a set of local instructions stored in a `SKILL.md` file. This repo currently offers the following skills:

1. **skill-creator** – Guide for creating effective skills; use when a user wants to add or update a skill. (`/Users/filipelopes/.codex/skills/.system/skill-creator/SKILL.md`)
2. **skill-installer** – Guide for installing Codex skills from curated lists or GitHub repos; use when a user asks for skill installation. (`/Users/filipelopes/.codex/skills/.system/skill-installer/SKILL.md`)

## How to use skills

1. If the user names a skill (with `$SkillName` or plain text) *or* the task clearly matches a skill’s description, load that skill for the turn. Multiple mentions mean use them all.
2. Only load the skill’s `SKILL.md` file and read the necessary sections to follow its workflow.
3. If `SKILL.md` points to extra folders (for example, `references/`, `scripts/`, or `assets/`), access only the specific files you need rather than the whole directory.
4. Prefer running or patching scripts provided by the skill instead of retyping large code blocks when applicable.
5. Reuse assets or templates exposed by a skill instead of recreating them if a fit exists.

## Coordination and sequencing

- When multiple skills apply, choose the minimal set that satisfies the request and mention the order you used them.
- After deciding on a skill, call it out briefly (“using skill-creator for …”). If you skip an obvious skill, explain why.
- Do not reuse a skill across turns unless the user re-requests it or the context demands it.

## Context hygiene

- Keep the loaded context small: summarize long sections rather than copying them wholesale.
- Avoid heavy reference-chasing; prefer opening files directly referenced by `SKILL.md`.
- Only load additional files when you need them for the request.

## Safety and fallback

- If a named skill is missing or blocked, say so, then continue with the best fallback approach.
- If the skill points to scripts or tools but you cannot run them (e.g., missing permissions), note the limitation and proceed manually.
- When in doubt, clarify the user’s intent before proceeding, especially if the skill instructions conflict with higher-level directives.
