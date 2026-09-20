/**
 * Shared helpers for the table component library.
 *
 * Action definitions accept either static values or per-row functions, so a
 * caller can write `danger: true` or `ariaLabel: (row) => `Delete ${row.name}``
 * without the components caring which form was used.
 */

/** Resolves a value that may be a plain value or a `(row) => value` function. */
export function resolve(value, row) {
  return typeof value === 'function' ? value(row) : value
}

/** Keeps only the actions whose `show` resolves truthy for this row. */
export function visibleActions(actions, row) {
  return (actions ?? []).filter((a) => resolve(a.show ?? true, row))
}

/** Reads `member.up_mail`-style dotted paths off a row. */
export function readPath(row, path) {
  if (row == null || !path) return undefined
  if (!path.includes('.')) return row[path]
  return path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), row)
}
