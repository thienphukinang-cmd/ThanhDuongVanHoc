---
name: superpowers
description: The complete software development methodology for coding agents (obra/superpowers). Use when starting, planning, executing, debugging, or reviewing any software engineering task, enforcing strict TDD, systematic debugging, modular plans, and verification before completion.
license: MIT
metadata:
  author: Jesse Vincent (obra)
  repo: https://github.com/obra/superpowers
  domain: engineering-methodology
  role: master-methodology
---

# Superpowers: Autonomous Agent Engineering Methodology

## Overview
**Superpowers** (`obra/superpowers`) is a battle-tested engineering methodology for AI coding agents. It prevents agents from making impulsive changes, hallucinatory assumptions, or unverified claims. It replaces chaotic prompt-driven coding with a disciplined, reproducible engineering pipeline.

Local repository source: `d:\BaoTang3D\skills\superpowers-main`

---

## The Superpowers Lifecycle

```
User Request
     │
     ▼
1. Brainstorming (brainstorming)
   - Clarify user intent, requirements, constraints
   - Explore architecture alternatives
   - Present concise design chunks for user sign-off
     │
     ▼
2. Implementation Planning (writing-plans)
   - Break design into bite-sized 2–5 minute tasks
   - Specify target file paths, exact code changes, and test commands
     │
     ▼
3. Execution (subagent-driven-development OR executing-plans)
   - Execute tasks sequentially
   - Maintain a living task checklist artifact (task.md)
     │
     ▼
4. Test-Driven Development (test-driven-development)
   - RED: Write failing test / reproduction case
   - GREEN: Implement minimal code to pass test
   - REFACTOR: Clean code while keeping tests green
     │
     ▼
5. Code Review (requesting-code-review & receiving-code-review)
   - Critical review of diffs against specs and guidelines
     │
     ▼
6. Verification Before Completion (verification-before-completion)
   - Run build/test commands (e.g. npm run build, playwright)
   - Never claim completion without fresh command output
     │
     ▼
7. Finish & Merge (finishing-a-development-branch)
   - Clean workspace, commit, and deliver results
```

---

## Core Skills Catalog in Superpowers

All individual Superpower skills are active in `.agents/skills/`:

| Skill Name | Purpose & Trigger |
|------------|-------------------|
| `using-superpowers` | Foundational skill loaded at start of every conversation |
| `brainstorming` | Interactive discovery and design alignment before touching code |
| `writing-plans` | Creating structured step-by-step implementation plans |
| `subagent-driven-development` | Orchestrating autonomous subagents with clear briefs |
| `executing-plans` | Inline execution of implementation plans step by step |
| `test-driven-development` | RED-GREEN-REFACTOR engineering cycle |
| `systematic-debugging` | 4-phase root cause discovery (reproduce, isolate, fix, verify) |
| `verification-before-completion` | Mandatory evidence-first verification before claiming success |
| `requesting-code-review` | Automated or peer review checklist after tasks |
| `receiving-code-review` | Technical rigor in addressing reviewer feedback |
| `using-git-worktrees` | Isolated git worktrees for non-destructive branching |
| `finishing-a-development-branch` | Safe merge, cleanup, and documentation |
| `writing-skills` | Applying TDD to authoring new agent skills |
| `diagnosing-superpowers` | Debugging agent behavior, loops, or missed triggers |
| `dispatching-parallel-agents` | Parallelizing non-dependent workloads |

---

## The Golden Rules of Superpowers
1. **Never guess, always test:** If you cannot verify it with a command or test, you do not know if it works.
2. **Evidence before assertions:** Never say "the bug is fixed" or "the feature works" without first running the verification command in the same turn.
3. **Small steps, fast feedback:** Break tasks into micro-deliverables to catch drift early.
4. **Clean artifacts:** Track progress in task artifacts so both agent and human are in 100% synchronization.
