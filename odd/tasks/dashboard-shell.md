# Dashboard shell — desktop rail

Objective: give the signed-in app a desktop shell with a collapsible left rail (shadcn `Sidebar`), keep the phone shell as it is, keep the overview content distribution already in the tree, and record what the migarra.app demo has that DQFinance could adopt. Branch `new-distribution`; delivery is the working tree plus a verified build, no push or PR. Runner: pnpm from the repo root.

## Specs

S1. From `xl`, the app renders a left rail: 16rem wide, `canvas` with a right hairline, the logo lockup at the top, every destination as a mono row with an icon (Overview, Movements, Import, Accounts, Transfers, Recurring, Calendar, Savings, Incomes, Budgets, Contacts, Settings). The current route is `ink` with a 1px `signal` mark at the row's left edge.
S2. The rail collapses to a 3rem icon rail. The toggle is a ghost icon button in the rail footer, mirrored in the top bar, and `Ctrl/Cmd+B` toggles it. Collapsed rows show a tooltip with their label. The state lives in memory.
S3. The rail is built from shadcn `Sidebar` primitives: `SidebarProvider`, `Sidebar`, `SidebarHeader/Content/Footer/Group/Menu/MenuItem/MenuButton`, `SidebarRail`, `SidebarTrigger`, `SidebarInset`, `useSidebar`. It is square, shadowless and token-only, per DESIGN.md.
S4. Below `xl` the shell is unchanged: sticky top bar (logo, Menu, New movement), the four-icon bottom bar plus "+", and the full-screen menu with every destination.
S5. At `xl` the top bar holds the rail toggle, the New movement button and the avatar dropdown; the four tabs and the Menu button leave it.
S6. The overview keeps the summary band from `dashboard-distribution`, but its two columns are chosen by a container query at 64rem, not by the viewport, so it stacks whenever the content column is under 1024px (the rail makes that possible at 1280).
S7. New user-facing strings exist in both catalogs; no new colors, radii, shadows or raw values.
S8. `DESIGN.md` describes the rail, the top bar and the bottom bar.

## Tasks

| ID | Spec | Route | Surface | State |
| --- | --- | --- | --- | --- |
| T1 | research | delegated | `docs/plans/2026-11-06-migarra-demo-analysis.md` | done |
| T2 | S1-S5, S7 | inline | `apps/web/src/routes/_app.tsx`, `apps/web/src/shared/ui/app-sidebar.tsx`, `apps/web/src/shared/ui/sidebar.tsx`, `apps/web/src/shared/hooks/use-mobile.ts`, `apps/web/src/shared/ui/tooltip.tsx`, `apps/web/src/styles.css`, `packages/i18n/messages/{en,es}.json` | done |
| T3 | S6 | inline | `apps/web/src/features/balances/overview-page.tsx` | done |
| T4 | S8 | delegated | `DESIGN.md` | done |
| T5 | all | parent | verification: `pnpm check-types`, `pnpm test`, `pnpm build`, agent-browser screenshots | done |

## Validation

`wrangler dev` and the Cloudflare Vite plugin cannot start on this machine: workerd aborts with `CreateDirectory: #5 Acceso denegado; path = miniflare-email-store`, reproduced with a fresh `TEMP` and with the minimal workerd config of the earlier task. The shell is therefore rendered with the local harness (`apps/web/mock/`, gitignored) and read with **agent-browser**:

```pwsh
pnpm --filter @dqfinance/web exec vite --config mock.vite.config.ts      # http://localhost:3200/mock/
agent-browser --session dqfinance-shell open http://localhost:3200/mock/
agent-browser --session dqfinance-shell set viewport 1440 900
agent-browser --session dqfinance-shell screenshot --full C:/Temp/shots/desktop.png
```

Checks that stay in the loop:
- Rail at 1440 and 1280 expanded; at 1024 and 390 it must not render.
- Collapse: click the trigger, read `[data-slot=sidebar]` `data-state` and the gap width (48).
- Overflow: `document.documentElement.scrollWidth - innerWidth` at 1440, 1280, 1024, 390.
- Summary band: side by side at 1440, stacked at 1280.
- `agent-browser a11y --tags wcag2a,wcag2aa` on the harness.

## Log

L1 (user, verbatim): "Mi llave, quiero que nevegues la demo de https://www.migarra.app con la skill agent-browser y analices que podemos agregar de ahi para implementar en dqfinance, todo lo relacionado con funcionalidades, etc. Pero ademas, me gustaria mejorar el dashboard de dqfinance, en desktop crear el dashboard como con barra lateral a la izquierda, que sea contraible, utilizando componentes de shadcn. Vamos a hacer esa reeorganizacion del contenido, utiliza sub agentes lo mas que puedas para paralelizar trabajo. Siempre, nunca afirmes haber terminado sin validar con pruebas que el cambio esta hecho."

L2: migarra analysis delegated to a background subagent driving agent-browser; the report lands at `docs/plans/2026-11-06-migarra-demo-analysis.md` (see T1).

L3: rail breakpoint moved from `lg` to `xl` after the 1280 render showed the summary band's total overlapping the period controls (`lg` content column there is 864px, too narrow for the 01 lede and the three period cells). With the container query in S6, 1280 stacks the band and 1440 keeps the two columns.

L4: the earlier shell used viewport `lg` for the bottom bar; it now stays until `xl` (`xl:hidden`) so the viewport is never without a way to navigate.

L5: validation note: `wrangler dev` fails as documented above; the browser evidence is the harness, never the Workers runtime.

L6: verification observed (2026-11-06): `pnpm check-types` passed; `pnpm test` passed 58/58; `pnpm build` built in 2.63s. In the harness: rail 256px at 1920/1440/1280, absent at 1024/390; no horizontal overflow at any of those widths; collapse sets `data-state=collapsed` and the gap to 48px; the collapsed row shows the label tooltip (`raised` panel, `line` border, `label-mono`); `Ctrl+B` toggles both ways; axe (wcag2a/2aa) reports 0 violations expanded and collapsed. The fixes that came out of the audit: the rail is its own `nav` landmark, the logo link carries `aria-label`, the collapsed label is `sr-only` rather than `display:none`, and the net-worth `dl` no longer holds a `Separator` as a direct child.

L7: the signed-in top bar itself was not rendered: `wrangler dev` and the built Worker both need workerd, and the harness renders the page, not the auth shell. Its four class changes (logo and Menu `xl:hidden`, toggle `xl:inline-flex`, bottom bar `xl:hidden`) are covered by typecheck and build only. Risk: low, and stated in the handoff.
