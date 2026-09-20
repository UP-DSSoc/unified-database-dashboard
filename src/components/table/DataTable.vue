<script setup>
/**
 * Generic read-only data table.
 *
 * Columns are declared as objects; the actions column can be driven two ways:
 *
 *   1. Declaratively — pass `:actions="[...]"` and the table renders a
 *      RowActions button group (what CommitteeView / DegreeProgramView need).
 *   2. Via the `actions` scoped slot — take over the cell entirely, e.g. to
 *      render a RowActionMenu (what ReaffiliationsView needs).
 *
 * The slot wins when both are supplied.
 */
import { computed, useSlots } from 'vue'
import RowActions from './RowActions.vue'
import { readPath, visibleActions } from './useActionDef'

const props = defineProps({
  /**
   * [{ key, label, cellClass, headerClass, format, empty, align }]
   * - `key`       reads the value off the row; dotted paths work
   *               (`member.up_mail`) and it also names the `cell:<key>` slot.
   * - `format`    `(value, row) => displayValue`, for derived columns.
   * - `empty`     placeholder when the value is null/undefined/''. Default '—'.
   * - `cellClass` string, or `(row) => string`, applied to the <td>.
   */
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  /** Property name on the row, or `(row, index) => key`. */
  rowKey: { type: [String, Function], default: '_id' },
  /** Declarative action buttons — see RowActions. Ignored if the slot is used. */
  actions: { type: Array, default: () => [] },
  /**
   * Force the actions column on or off. Left null, the column appears when
   * the `actions` slot is filled or `actions` is non-empty. Views normally
   * pass their permission check here.
   */
  showActions: { type: Boolean, default: null },
  actionsLabel: { type: String, default: 'Actions' },
  /** Narrow actions column, for a single icon button rather than a button row. */
  compactActions: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Nothing to show yet.' },
})

const slots = useSlots()

const hasActionsContent = computed(
  () => Boolean(slots.actions) || props.actions.length > 0
)

const actionsVisible = computed(() =>
  props.showActions === null ? hasActionsContent.value : props.showActions && hasActionsContent.value
)

const colspan = computed(() => props.columns.length + (actionsVisible.value ? 1 : 0))

function keyFor(row, index) {
  if (typeof props.rowKey === 'function') return props.rowKey(row, index)
  return readPath(row, props.rowKey) ?? index
}

function rawValue(row, col) {
  return col.key ? readPath(row, col.key) : undefined
}

function display(row, col) {
  const value = col.format ? col.format(rawValue(row, col), row) : rawValue(row, col)
  if (value === null || value === undefined || value === '') return col.empty ?? '—'
  return value
}

function cellClasses(row, col) {
  const extra = typeof col.cellClass === 'function' ? col.cellClass(row) : col.cellClass
  return [extra, col.align === 'right' ? 'align-right' : null]
}

const rowActionsFor = (row) => visibleActions(props.actions, row)
</script>

<template>
  <div class="table-wrap panel">
    <table>
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key ?? col.label"
            scope="col"
            :class="[col.headerClass, col.align === 'right' ? 'align-right' : null]"
            :style="col.width ? { width: col.width } : null"
          >
            {{ col.label }}
          </th>
          <th
            v-if="actionsVisible"
            scope="col"
            class="actions-th"
            :class="{ compact: compactActions }"
          >
            {{ actionsLabel }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(row, i) in rows" :key="keyFor(row, i)">
          <td v-for="col in columns" :key="col.key ?? col.label" :class="cellClasses(row, col)">
            <slot :name="`cell:${col.key}`" :row="row" :value="rawValue(row, col)" :index="i">
              {{ display(row, col) }}
            </slot>
          </td>

          <td
            v-if="actionsVisible"
            class="actions-cell"
            :class="{ compact: compactActions }"
          >
            <slot name="actions" :row="row" :index="i">
              <RowActions :actions="rowActionsFor(row)" :row="row" />
            </slot>
          </td>
        </tr>

        <tr v-if="!rows.length">
          <td :colspan="colspan" class="empty">
            <slot name="empty">{{ emptyText }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap {
  padding: 0;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th {
  text-align: left;
  font-weight: 500;
  font-size: 0.78rem;
  color: var(--slate);
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--rule);
  white-space: nowrap;
}

td {
  padding: 0.6rem 1rem;
  border-bottom: 1px solid #eef0ec;
}

tbody tr:last-child td {
  border-bottom: 0;
}

td.figure {
  font-size: 0.83rem;
  color: var(--slate);
}

.align-right {
  text-align: right;
}

.empty {
  color: var(--slate);
  padding: 2rem 1rem;
  text-align: center;
}

/* ── Actions column ── */

.actions-th {
  text-align: right;
  padding-right: 1rem;
}

.actions-cell {
  text-align: right;
  padding: 0.35rem 0.75rem;
  white-space: nowrap;
}

.actions-th.compact {
  width: 3rem;
  padding-right: 0.75rem;
}

.actions-cell.compact {
  width: 3rem;
  padding: 0.3rem 0.5rem;
}
</style>
