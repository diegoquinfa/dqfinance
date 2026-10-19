import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BYTE_LIMIT, TOKEN_LIMIT, buildReport, isIgnored, tokens } from './check-file-size.mjs'

test('the limit is 5,000 tokens at 4 bytes per token', () => {
  assert.equal(TOKEN_LIMIT, 5_000)
  assert.equal(BYTE_LIMIT, 20_000)
  assert.equal(tokens(20_000), 5_000)
  assert.equal(tokens(626_717), 156_679.25)
})

test('ignores what no agent authors: lockfiles, codegen, build output and binaries', () => {
  const ignored = [
    'pnpm-lock.yaml',
    'apps/web/package-lock.json',
    'apps/api/worker-configuration.d.ts',
    'apps/api/src/features/auth/auth.schema.ts',
    'apps/api/migrations/0000_broad_groot.sql',
    'apps/api/migrations/meta/0000_snapshot.json',
    'apps/web/src/routeTree.gen.ts',
    'packages/i18n/src/paraglide/messages/en.js',
    'packages/i18n/project.inlang/cache/plugins/x',
    'packages/i18n/messages/en.json',
    'packages/i18n/messages/es.json',
    'apps/web/public/logo.png',
    'apps/web/public/fonts/Geist.woff2',
    'internal/thing.lock',
    'skills-lock.json',
    '.agents/skills/hono/SKILL.md',
    '.agents/skills/design-taste-frontend-v2-experimental/SKILL.md',
  ]
  for (const file of ignored) assert.equal(isIgnored(file), true, file)
})

test('checks authored files, including paths that look like the ignored ones', () => {
  const checked = [
    'apps/api/src/features/transactions/create-transaction.ts',
    'apps/web/src/features/balances/compute-balances.ts',
    'apps/api/migrations.routes.ts',
    'apps/web/public/favicon.svg',
    'scripts/check-file-size.mjs',
    'DESIGN.md',
    'GLOSSARY.md',
    '.githooks/pre-commit',
    'apps/web/src/skills/thing.ts',
    'packages/i18n/messages/en.json5',
    'apps/web/messages/en.json',
  ]
  for (const file of checked) assert.equal(isIgnored(file), false, file)
})

test('the failure report names the file, the numbers and how to split it', () => {
  const report = buildReport([{ file: 'apps/api/src/features/foo/everything.ts', bytes: 33_728 }])

  assert.match(report, /ERROR: 1 staged file exceeds 5,000 tokens \(20,000 bytes, 1 token = 4 bytes\)/)
  assert.match(report, /apps\/api\/src\/features\/foo\/everything\.ts/)
  assert.match(report, /8,432 tokens, 33,728 bytes, 13,728 over the limit/)
  for (const instruction of [
    'Split at a concept seam',
    'One file, one job',
    'create-thing.ts, list-things.ts, thing.schema.ts, thing.routes.ts, thing.tools.ts',
    'types and zod schemas',
    'constants and literals',
    'tests and fixtures',
    'Extract the pure logic',
    'git add <paths>',
    'git commit --no-verify',
  ]) {
    assert.ok(report.includes(instruction), `report is missing: ${instruction}`)
  }
})

test('pluralises the heading for more than one file', () => {
  const report = buildReport([
    { file: 'a.ts', bytes: 20_001 },
    { file: 'b.ts', bytes: 40_000 },
  ])
  assert.match(report, /ERROR: 2 staged files exceed 5,000 tokens/)
  assert.match(report, /10,000 tokens, 40,000 bytes/)
})
