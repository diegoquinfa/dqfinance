/**
 * The slice of the R2 bucket the documents feature uses, spelled out so the Worker-only `R2Bucket`
 * name never reaches the AppType that apps/web type-checks. An R2Bucket satisfies it.
 */
export type DocumentBucket = {
  put(key: string, value: Blob, options: { httpMetadata: { contentType: string } }): Promise<unknown>
  get(key: string): Promise<{ body: ReadableStream } | null>
  delete(key: string): Promise<void>
}
