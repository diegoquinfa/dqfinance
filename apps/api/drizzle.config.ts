import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/features/**/*.schema.ts',
  // Same folder as wrangler.jsonc migrations_dir: drizzle-kit writes SQL, wrangler applies it to D1.
  out: './migrations',
})
