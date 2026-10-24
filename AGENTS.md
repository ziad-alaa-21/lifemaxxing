<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Engineering Reliability Runtime (Gravitas)

Always apply the Gravitas engineering reliability runtime (`.agents/skills/gravitas/SKILL.md`) to all implementation, debugging, refactoring, and review tasks:

1. **Ground before mutating**: Read and inspect target files, callers, and existing tests before making code changes.
2. **Stay in declared scope**: Maintain strict blast-radius boundaries. Only touch files relevant to the active task.
3. **Completion needs evidence**: Every completion claim must be substantiated with executable evidence (e.g. tests passing, compiler/linter output, deterministic reproducer). Never claim done based on self-review alone.
4. **Never exact-retry a failure**: Change diagnosis, context, or strategy before re-attempting a failed command or test.
5. **Satisfy the contract**: Acceptance criteria and required validators gate completion.
6. **Say what you can't verify**: Explicitly state any unverified assumptions or environment limits.

Output structure for completed engineering tasks:
- **What Changed**: Files modified, line deltas, and behavior changes.
- **Evidence**: Verifiable test, build, lint, or script output demonstrating correctness.
- **Why**: Rationale for the technical decisions made.
