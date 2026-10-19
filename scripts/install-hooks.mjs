/**
 * Points git at the hooks committed in .githooks, so the pre-commit size check runs for everyone.
 * Runs from `pnpm install` (the root "prepare" script). Quiet on success; it warns instead of
 * failing the install when git is unavailable (installing from a tarball, for example).
 */
import { execFileSync } from 'node:child_process'

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' })
} catch {
  console.log('Could not install the git hooks. Run: git config core.hooksPath .githooks')
}
