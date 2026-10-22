export type CategoryKind = 'expense' | 'income'

/** Why two categories cannot be merged. */
export type MergeBlock = 'same' | 'kind'

/**
 * Whether a merge may go ahead. A category merges into another of the same kind: the movements keep
 * their type, and their category has to agree with it.
 */
export const mergeBlock = (
  source: { id: string; kind: CategoryKind },
  target: { id: string; kind: CategoryKind },
): MergeBlock | null => {
  if (source.id === target.id) return 'same'
  if (source.kind !== target.kind) return 'kind'
  return null
}
