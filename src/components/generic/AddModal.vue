<script setup>
/**
 * Form dialog for creating a record, driven by a field schema.
 *
 * The caller describes the form with `fields` and owns the operation: `submit`
 * fires with the collected values and the modal stays open so the caller can
 * drive `busy` while the request runs and surface `error` in place if it
 * fails. The caller closes it by dropping the `v-if` once the create succeeds.
 *
 * A field descriptor:
 *   key             key this field's value takes in the emitted payload
 *   label           visible label; falls back to `key`
 *   type            'string' | 'number' | 'boolean' | 'select' (default 'string')
 *   required        blocks submit while empty
 *   default         initial value
 *   placeholder     string/number/select only
 *   hint            helper text under the field
 *   disabled        renders the control read-only
 *   options         select only — ['UPD'] or [{ value, label }]
 *   optionsLoading  select only — shows a loading placeholder
 *   checkboxLabel   boolean only — text beside the box; falls back to `label`
 *   min/max/step    number only, forwarded to the input and range-checked
 *
 * Values are normalised on submit: numbers come through as Number, blank
 * optional text comes through as null (the key is always present), and
 * booleans are always true/false.
 */
import { onMounted, onUnmounted, reactive, ref } from 'vue'

const props = defineProps({
  title: { type: String, default: 'Add Record' },
  /** Optional sentence under the title. */
  description: { type: String, default: '' },
  /** Field descriptors — see the block comment above. */
  fields: { type: Array, required: true },
  submitLabel: { type: String, default: 'Add' },
  /** Replaces `submitLabel` while the caller's create runs. */
  busyLabel: { type: String, default: 'Adding…' },
  cancelLabel: { type: String, default: 'Cancel' },
  /** Disables the form and shows progress while the caller's create runs. */
  busy: { type: Boolean, default: false },
  /** Message from a failed create, rendered above the buttons. */
  error: { type: String, default: '' },
})

const emit = defineEmits(['close', 'submit'])

const typeOf = (field) => field.type || 'string'

function initialValue(field) {
  if (field.default !== undefined) return field.default
  return typeOf(field) === 'boolean' ? false : ''
}

// Built once on open. `fields` is deliberately not watched: callers pass
// computed schemas whose options arrive after a fetch, and rebuilding the form
// on that would discard whatever has already been typed. Options render
// straight from props, so they stay live regardless.
const form = reactive(
  Object.fromEntries(props.fields.map((f) => [f.key, initialValue(f)]))
)

// Per-field messages, keyed like `form`. Populated on submit, and cleared for
// a field as soon as it is edited.
const fieldErrors = reactive({})

const panel = ref(null)

/** Normalises `{ value, label }` and bare-string options to the former. */
const optionsOf = (field) =>
  (field.options ?? []).map((o) =>
    o !== null && typeof o === 'object' ? o : { value: o, label: String(o) }
  )

function clearError(key) {
  fieldErrors[key] = ''
}

/** Returns a message when `field` rejects its current value, else ''. */
function validate(field) {
  const value = form[field.key]
  const label = field.label || field.key

  if (typeOf(field) === 'boolean') return ''

  const blank = value === '' || value === null || value === undefined
  if (blank) return field.required ? `${label} is required.` : ''

  if (typeOf(field) === 'number') {
    const n = Number(value)
    if (Number.isNaN(n)) return `${label} must be a number.`
    if (field.min !== undefined && n < field.min) return `${label} must be ${field.min} or more.`
    if (field.max !== undefined && n > field.max) return `${label} must be ${field.max} or less.`
  }
  return ''
}

/** Trims text, coerces numbers, and turns blank optional fields into null. */
function payloadValue(field) {
  const value = form[field.key]
  switch (typeOf(field)) {
    case 'boolean':
      return Boolean(value)
    case 'number':
      return value === '' || value === null ? null : Number(value)
    default: {
      const text = typeof value === 'string' ? value.trim() : value
      return text === '' || text === undefined ? null : text
    }
  }
}

function submit() {
  if (props.busy) return

  let valid = true
  for (const field of props.fields) {
    const message = validate(field)
    fieldErrors[field.key] = message
    if (message) valid = false
  }
  if (!valid) {
    // Put the caret on the first problem rather than making the user hunt.
    panel.value?.querySelector('[aria-invalid="true"]')?.focus()
    return
  }

  emit('submit', Object.fromEntries(props.fields.map((f) => [f.key, payloadValue(f)])))
}

// A form mid-request should not close under the user, so Escape, the overlay
// and the × are all ignored while `busy`.
function close() {
  if (!props.busy) emit('close')
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  panel.value?.querySelector('input, select')?.focus()
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="close">
      <div
        ref="panel"
        class="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-modal-title"
      >

        <div class="modal-header">
          <div>
            <h3 id="add-modal-title">{{ title }}</h3>
            <p v-if="description" class="sub">{{ description }}</p>
          </div>
          <button class="close-btn" aria-label="Close" :disabled="busy" @click="close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form class="modal-body" novalidate @submit.prevent="submit">

          <div v-for="field in fields" :key="field.key" class="field">

            <!-- Checkbox carries its own inline label, so the block label is
                 skipped to avoid announcing the name twice. -->
            <label v-if="typeOf(field) !== 'boolean'" :for="`add-${field.key}`">
              {{ field.label || field.key }}
              <span v-if="field.required" class="req" aria-hidden="true">*</span>
            </label>

            <select
              v-if="typeOf(field) === 'select'"
              :id="`add-${field.key}`"
              v-model="form[field.key]"
              :disabled="busy || field.disabled || field.optionsLoading"
              :aria-invalid="fieldErrors[field.key] ? 'true' : undefined"
              :aria-describedby="fieldErrors[field.key] ? `err-${field.key}` : undefined"
              @change="clearError(field.key)"
            >
              <option value="" disabled>
                {{ field.optionsLoading ? 'Loading…' : field.placeholder || 'Select one' }}
              </option>
              <option v-for="o in optionsOf(field)" :key="o.value" :value="o.value">
                {{ o.label }}
              </option>
            </select>

            <label
              v-else-if="typeOf(field) === 'boolean'"
              class="check"
              :for="`add-${field.key}`"
            >
              <input
                :id="`add-${field.key}`"
                v-model="form[field.key]"
                type="checkbox"
                :disabled="busy || field.disabled"
              />
              <span>{{ field.checkboxLabel || field.label || field.key }}</span>
            </label>

            <input
              v-else
              :id="`add-${field.key}`"
              v-model="form[field.key]"
              :type="typeOf(field) === 'number' ? 'number' : 'text'"
              :placeholder="field.placeholder"
              :min="field.min"
              :max="field.max"
              :step="field.step"
              :disabled="busy || field.disabled"
              :aria-invalid="fieldErrors[field.key] ? 'true' : undefined"
              :aria-describedby="fieldErrors[field.key] ? `err-${field.key}` : undefined"
              @input="clearError(field.key)"
            />

            <p v-if="fieldErrors[field.key]" :id="`err-${field.key}`" class="field-error">
              {{ fieldErrors[field.key] }}
            </p>
            <p v-else-if="field.hint" class="hint">{{ field.hint }}</p>

          </div>

          <p v-if="error" class="notice" role="alert">{{ error }}</p>

          <div class="modal-footer">
            <button type="button" class="btn btn-quiet" :disabled="busy" @click="close">
              {{ cancelLabel }}
            </button>
            <button type="submit" class="btn" :disabled="busy">
              {{ busy ? busyLabel : submitLabel }}
            </button>
          </div>

        </form>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(22, 25, 26, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  padding: 1rem;
}

.modal-panel {
  background: var(--surface);
  border-radius: 0.5rem;
  border: 1px solid var(--rule);
  box-shadow: 0 8px 32px rgba(22, 25, 26, 0.18);
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Header */
.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--rule);
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}

.modal-header h3 {
  margin: 0 0 0.2rem;
  font-size: 1rem;
}

.sub {
  margin: 0;
  font-size: 0.82rem;
  color: var(--slate);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.15rem;
  border-radius: 4px;
  color: var(--slate);
  display: flex;
  align-items: center;
  line-height: 1;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
}

.close-btn:hover:not(:disabled) {
  background: var(--rule);
  color: var(--ink);
}

.close-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.close-btn .material-symbols-outlined {
  font-size: 1.2rem;
}

/* Body */
.modal-body {
  padding: 1.25rem 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Fields */
.field label {
  margin-bottom: 0.35rem;
}

.req {
  color: var(--maroon);
}

/* Checkbox sits inline with its text rather than filling the row. */
.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink);
  cursor: pointer;
}

.check input {
  width: auto;
  margin: 0;
  accent-color: var(--maroon);
}

.check input:disabled {
  cursor: not-allowed;
}

.field-error {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  color: #c0392b;
}

.hint {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  color: var(--slate);
}

.notice {
  margin: 0;
}

/* Footer — the submit button sits at the lower right. */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 1rem 0;
  margin-top: 0.25rem;
  border-top: 1px solid var(--rule);
  background: var(--surface);
  position: sticky;
  bottom: 0;
}
</style>
