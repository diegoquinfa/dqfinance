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

/** What the merge does with the source's budget. */
export type BudgetMerge = 'none' | 'move' | 'drop'

/**
 * What happens to the source's budget when its category merges into another. A user has one budget
 * per category (its unique key is the user and the category), so when the target already has one the
 * target's limit wins and the source's is dropped; otherwise the source's budget moves over.
 */
export const budgetMerge = (sourceHasBudget: boolean, targetHasBudget: boolean): BudgetMerge => {
  if (!sourceHasBudget) return 'none'
  return targetHasBudget ? 'drop' : 'move'
}
