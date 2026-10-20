# Landing page and guest mode

Goal (user, 2026-10-20): answer the [user feedback](./2026-10-20-user-feedback.md) with a landing page (images, Open
Graph, a theme to use) and a guest mode built on the Better Auth docs, where the guest must **not** reach the MCP server.

Decisions taken with the user before the work started:

| Question | Decision |
| --- | --- |
| "A theme to use" | The landing uses the app's current dark theme. No light mode: [DESIGN.md](../../DESIGN.md) decides "Dark only". |
| How deep the guest goes | A guest signs in as an anonymous user and finds the app **seeded with sample data**. Full app, no MCP. |
| Where the images come from | **Real screenshots** of the running app, plus a composed Open Graph image. Nothing invented. |
| Privacy and terms | The footer links to the **repository** (LICENSE, README). No new legal pages. |

## What the feedback asked for

1. A broken logo on the sign-in card. It is not a broken path: `/logo.svg` is served and loads. The dq ligature is a
   hollow square bowl drawn with hairlines, and the sign-in title rendered it at `1.2em` (about 14 px wide), where the
   counter closes up and the mark reads as a missing-image glyph. The sign-up page renders the same lockup at `h-7`
   (28 px) and looks right, which is why only the sign-in screen was reported. **Fix: render the lockup at `h-7`, the
   same size as the corner lockup.**
2. Nothing to see before signing up. The landing page answers it: the promise, the feature list, real screens.
3. No footer, privacy or terms links. The footer carries the repository links.

## Guest mode, in depth

### What a guest is

A **guest** is a Better Auth **anonymous user**: a real `user` row with `is_anonymous = true`, a session cookie, and
no email the person owns. The plugin is `@better-auth/core`'s `anonymous()`: it adds the column, the
`POST /sign-in/anonymous` endpoint, and the linking behaviour when the guest later signs up.

The alternatives were considered and rejected:

| Option | Why not |
| --- | --- |
| A shared "demo" account with a fixed password | Every guest shares one ledger, so one guest's edits show up in another guest's session. Also teaches the wrong thing: the demo would be a real account. |
| A read-only mirror of a demo ledger | The feedback asks for a demo "to test it in depth". A guest that cannot record a movement cannot test the one thing the project is for (an assistant recording expenses on its own). |
| A token in the browser, no server-side user | Nothing to own data with, and every query would need a second identity path. The app already owns its data by `user_id`. |

The anonymous plugin is the smallest thing that gives a guest a real identity: the whole app keeps working unchanged
because ownership is still "the session's `userId`".

### What a guest may and may not do

| | Guest | Account |
| --- | --- | --- |
| Read the app, seeded with sample data | yes | yes |
| Record movements, accounts, transfers | yes | yes |
| Connect an AI agent over MCP | **no** | yes |
| Sign up with an email | yes, and the demo data goes with it | - |

The guest is a first-class user of the app. The only thing it cannot do is hand its data to an agent, which is the
one path where somebody else's software acts on the money.

### The demo data

`POST /api/demo` seeds a guest's ledger once: settings (country, timezone, USD), the default categories, one bank
with a checking and a savings product, a cash wallet, a credit card, a few contacts, a spread of income and expenses
over the last six months, two recurring expenses, and one balance adjustment that opens the checking account.

It respects the domain rules: money is integer cents and always positive (the `type` carries the sign), the opening
balance is a `balance_adjustment` and not a fake movement (D2), and the transactions are plain income and expenses
(D3: no transfer, no adjustment). The seed is **idempotent**: it does nothing when the user already has settings, so
it is safe to call on every load of the app shell.

### Keeping the agent out of the guest's money

Two layers, because the first one is a courtesy and the second one is the rule.

1. **No token is issued.** The OAuth authorization endpoint refuses an anonymous session, so the agent never gets an
   access token for a guest. The refusal is a plain `403` and not a scope challenge: a guest cannot fix it by
   granting a scope, and a challenge would send the agent through consent again for nothing.
2. **`/mcp` refuses it anyway.** Every MCP request looks up the user behind the token's `sub` and answers `403` when
   the user is anonymous or gone. This is the authoritative check: it also covers a token issued before the guest
   signed up, whose `sub` points to a user that no longer exists.

The consent screen refuses too, so the agent's author sees why instead of a mystery `403`.

### The guest becomes a real account

The anonymous plugin links the account on sign-up and deletes the anonymous user. The demo data is linked with it
through `onLinkAccount`, which moves the rows to the new user's `user_id`. Moving them is the point: a person who
played with the app and then signed up keeps what they built.

The data moves in one statement per table, over the tables that carry `user_id` (`demo/move-guest-data.ts`). The
plugin's own cleanup deletes the anonymous user afterwards; the demo rows are already gone by then, so nothing is
orphaned. Verified: after the sign-up the new account answers with the guest's balance.

## The landing page

`/` is the signed-out home. It keeps the app's editorial language: near-monochrome, one lilac signal, square
corners, hairlines, `type-*` scale, and the numbered `// 0X` sections of the signed-in pages.

1. **Top bar**: the lockup, the language picker, "Sign in" and "Create account".
2. **Hero**: the same two-tone statement the auth screens use, one paragraph, and the two calls to action: "Try the
   demo" (a guest, seeded) and "Create an account".
3. **01 What it does**: the feature list, as hairline rows.
4. **02 The screens**: real screenshots of the app.
5. **03 The agent**: the MCP server, what a client gets, and the note that a guest cannot connect one.
6. **Footer**: the repository links (README, LICENSE), the licence, and the copyright.

Signed-in visitors keep the old behaviour: `/` sends them to the overview.

## Open Graph

`og:title`, `og:description`, `og:type`, `og:site_name`, `og:image` (a 1200x630 image composed of the brand and a
real screen), `og:image:width` and `og:image:height`, plus the Twitter card. The image URL is absolute, built from
the request's origin, because a crawler cannot resolve a relative one.

The origin comes from the request, read by a server function (`shared/request-origin.ts`) and put in the root route's
loader, so the tags are rendered on the server. That needed Paraglide's server middleware in `apps/web/src/server.ts`:
without it the server renders the base locale while the browser renders the cookie's, and the page React hydrates does
not match the one the server sent (React error 418). The middleware also adds `Vary: Cookie, Accept-Language`.

The image is composed by hand in `scripts/og.html` and captured from the dev server; the header of that file says how.
The screens it uses are real captures of the app, in `apps/web/public/screens/`.

## Steps

1. Fix the sign-in logo size. **Done**: the lockup is drawn at `h-7`, the same size as the corner one.
2. API: the `anonymous()` plugin, the `is_anonymous` column, the migration. **Done** (`0005_rapid_thaddeus_ross.sql`).
3. API: `features/demo/`, the seed and its route. **Done**: the plan is `demo-ledger.ts` (pure), the write is
   `seed-demo.ts`, and the handoff is `move-guest-data.ts`.
4. API: refuse the guest at `/oauth2/authorize` and at `/mcp`. **Done** and verified: the authorization answers
   `403 GUEST_MCP_DENIED` for a guest and the normal flow for an account.
5. Web: the anonymous client, the "Try the demo" button, the guest banner in the shell, the consent refusal.
   **Done**.
6. Web: the landing page and its images. **Done**.
7. Web: the Open Graph tags and image. **Done**.
8. Docs: architecture, mcp, screens, glossary, the feedback log, DESIGN. **Done**.
9. `pnpm check-types && pnpm test && pnpm build`. **Done**.

## Still open

- The demo ledger is fixed data in the code. A demo per language, or a random one, would need a seed that reads the
  locale.
- The guest's data is moved on sign-up, but there is no way to reset a guest's demo ledger from the app.
- The Open Graph image is composed by hand, not generated at build time.
- On the local runtime, the first request that follows a demo seed sometimes fails at the transport level
  (`fetch failed`); the next one succeeds and the data is complete. It has not been seen in production, but it has not
  been ruled out either.
