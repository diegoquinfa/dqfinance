/**
 * The wildcards of a LIKE, escaped, so a `%` in the search is a literal percent sign
 * and never matches every row.
 */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`)
