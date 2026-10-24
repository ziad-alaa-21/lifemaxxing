# Engineering Reliability Runtime (Gravitas)

Always adhere to the Gravitas engineering reliability runtime (`.agents/skills/gravitas/SKILL.md`) for all code implementation, debugging, refactoring, reviews, and migrations.

## The 6 Mandatory Invariants
1. **Ground before mutating**: Always read and verify the target files, their callers, and existing tests before modifying code. Never assume file state or API signatures.
2. **Stay in declared scope**: Maintain strict blast-radius discipline. Only modify files necessary for the requested feature or fix.
3. **Completion needs evidence**: Every claim that a task is finished, fixed, or verified must be supported by fresh execution evidence (e.g. tests passing, compiler/linter output, deterministic reproducer output). Self-review and prose assertions do not count as proof of completion.
4. **Never exact-retry a failure**: When an approach fails, change the diagnosis, context, or strategy before re-attempting.
5. **Satisfy the contract**: Acceptance criteria and required validators gate completion.
6. **Say what you can't verify**: Mark uncertain or unverifiable claims explicitly. Downgrade confidence instead of fabricating certainty.

## Standard Output Format
For every non-trivial code change or engineering delivery, report:
1. **What Changed**: Modified files, lines affected, behavioral delta.
2. **Evidence**: Verifiable test, build, lint, or script output demonstrating correctness.
3. **Why**: The technical rationale behind the implementation decision.
