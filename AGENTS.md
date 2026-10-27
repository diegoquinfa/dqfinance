<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

Always use the skill ponytail

# DQFinance — agent rules

## Invariants

- **Money** is integer cents (`amount_cents`), always positive; `type` carries the sign. Convert with `toCents`/`fromCents` from `apps/api/src/shared/money.ts`. Cents for every currency, not ISO minor units: ICU reports 0 digits for COP.
- **Ownership:** every query on user data filters by `userId`, taken only from the session (`requireSession`) or the MCP token's `sub`.
- **Balances** are computed, never stored (design D1); editing one inserts a `balance_adjustment` (D2). Transfers and adjustments are never income or expense (D3).

## Read before

- Writing code, adding a feature, adding a user-facing string, editing a generated file, or a commit the size hook refused: [CODING_STANDARDS.md](./CODING_STANDARDS.md).
- Placing a file, importing across features, deriving a balance or a source, or changing `turbo.json`: [docs/architecture.md](./docs/architecture.md).
- Writing an MCP tool, changing the OAuth flow, or creating the auth instance: [docs/mcp.md](./docs/mcp.md).
- Naming a domain noun: [GLOSSARY.md](./GLOSSARY.md).
- Building UI: [DESIGN.md](./DESIGN.md), and [docs/screens.md](./docs/screens.md) for what a route holds.
- Changing the data model or a design decision (D1–D16): [the domain design](./docs/plans/2026-10-18-finance-domain-design.md).
- Choosing what to build next: the domain design, then the [redesign follow-ups](./docs/plans/2026-10-19-web-redesign.md#follow-ups-not-built).

## Parallel work

One checkout is the default. Several agents can work in the same tree at once when their files are disjoint;
the parent commits. Use a worktree **only** when the work would collide or must not mix: the same file, an
experiment to throw away, or a long feature that must leave the working tree alone.

- `git worktree add .worktrees/<feature> -b <branch>` — always inside `.worktrees/`, which is gitignored. One
  branch per worktree; the agent commits on it and the parent merges. A checkout outside the repo is denied by
  the sandbox, so do not put a worktree beside the repository.
- A fresh worktree has no `node_modules`. Once, with full sandbox access:
  `pnpm install --frozen-lockfile --offline --store-dir "$env:LOCALAPPDATA\pnpm\store"`, then
  `pnpm --filter @dqfinance/i18n build` (the paraglide output is gitignored, so `tsc` fails without it).
  After that it runs sandboxed: `node <file>.test.ts`, `node ../../node_modules/typescript/bin/tsc --noEmit`.
- Install one worktree at a time; pnpm serializes on a store lock.
- `git config core.longpaths true` is required to remove a worktree later: the `node_modules` paths pass 260.
- Remove it with `git worktree remove --force .worktrees/<feature>`; the branch stays.

## Before you finish

`pnpm check-types && pnpm test && pnpm build` from the root must pass.
