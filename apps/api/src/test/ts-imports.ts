import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

/**
 * The API imports its own modules without an extension, the way its bundler and `tsc` read them;
 * Node resolves ES modules by exact path, so a test that imports the real code would stop at the
 * first `'../../shared/dates'`. This hook appends `.ts` to a relative import that has no extension
 * and exists, so the tests load the shipped graph unmodified.
 *
 * Import it before any dynamic import of feature code. Static imports resolve before this module
 * runs, so the tests name their feature imports with `.ts` and load them from the test body.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts') && !specifier.endsWith('.js')) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(candidate.href))) return { url: candidate.href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
