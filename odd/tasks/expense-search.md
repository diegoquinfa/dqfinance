# Expense search

## Objective

Find the movements the user is thinking of, from the web or from an agent, by what they were.

Proposal 11 in [2026-10-21-feature-proposals.md](../docs/plans/2026-10-21-feature-proposals.md).

## Problem

The only way to find a movement today is to filter by source and date and read. "What did I pay at Web Sunday
last month?" means opening two screens and reading rows.

## Why this shape

- **Three fields, never the amounts.** The title, the description and the category say what the movement *was*.
  An amount search finds nothing useful and reads like a balance lookup.
- **Keywords, not a language model.** "expenses at Web Sunday" is a phrase with filler in it. The search takes
  the words that carry meaning and looks for all of them, anywhere in those three fields. A phrase that starts
  with "expenses", "gastos", "at" or "en" still finds the movement, without an agent in the loop.
- **Compact for agents.** A tool that returns twenty objects costs twenty times the tokens of a line each. The
  search returns one line per movement, and the agent asks for the detail of the ones that matter.

## Scope

- `GET /api/transactions?q=...` filters the list by the words of the query.
- The web's movements screen gets a search field, kept in the URL like the other filters.
- MCP tool `search_transactions`: one line per movement, newest first.

## Out of scope

- Full-text search over the notes, and any index beyond what SQLite already does.
- Ranking, relevance, or fuzzy matching.
- Searching amounts, dates, contacts or sources (the existing filters already cover those).

## Constraints

- Every query filters by `userId`, taken from the session.
- The words are matched with a parameterized `LIKE`: the user's text never reaches SQL as code.
- The matching is case-insensitive and accent-tolerant enough for a name typed without accents.

## TDD

`search-terms.ts` (pure) with a `node:test` file beside it: which words survive, and how they are escaped.

## Delivery

Chain strategy: `feature-branch-chain`.

| Slice | Branch | Base | Holds |
| --- | --- | --- | --- |
| 1 | `feat/proposals-09-categories` | tracker | `categories` |
| 2 | `feat/proposals-11-search` | slice 1 | `search` |

## Tasks

- [ ] `search` API: the query terms, the filter, the compact tool.
- [ ] `search` web: the search field in the movements screen.

## Acceptance

- "Web Sunday" finds the movements titled "Web Sunday", and "expenses at Web Sunday" finds them too.
- A query of only filler words matches everything, instead of nothing.
- The search never reaches a movement of another user.
- The MCP tool returns one line per movement, with the id, so the agent can ask for the detail.
- `pnpm check-types && pnpm test && pnpm build` from the root passes at feature close.
