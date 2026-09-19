<script setup>
import { onMounted, ref } from 'vue'
import { api } from '@/api/client'

const props = defineProps({
  record: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const loading = ref(true)
const error = ref('')
const history = ref([])

const member = props.record.member

const PROFILE_FIELDS = [
  { key: 'student_number', label: 'Student Number' },
  { key: 'pronouns',       label: 'Pronouns' },
  { key: 'birthday',       label: 'Birthday' },
  { key: 'contact_number', label: 'Contact Number' },
  { key: 'personal_email', label: 'Personal Email' },
  { key: 'up_mail',        label: 'UP Mail' },
]

const fullName = (m) =>
  [m?.first_name, m?.middle_name, m?.last_name, m?.suffix].filter(Boolean).join(' ')

const formatValue = (val) => (val == null || val === '' ? '—' : val)

onMounted(async () => {
  try {
    const res = await api.getSingleMemberHistory({ dssoc_id: props.record.dssoc_id })
    const list = Array.isArray(res) ? res : (res?.data ?? [])
    history.value = [...list].sort((a, b) => {
      if (a.year !== b.year) return Number(a.year) - Number(b.year)
      return String(a.semester).localeCompare(String(b.semester))
    })
  } catch (e) {
    error.value = e.detail || 'Failed to load affiliation history.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="reaff-modal-title">

        <div class="modal-header">
          <div>
            <h3 id="reaff-modal-title">{{ fullName(member) }}</h3>
            <span class="dssoc-id figure">{{ record.dssoc_id }}</span>
          </div>
          <button class="close-btn" aria-label="Close" @click="emit('close')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <!-- Member Profile -->
          <section class="section">
            <h4 class="section-title">Member Profile</h4>
            <dl class="fields">
              <div v-for="f in PROFILE_FIELDS" :key="f.key" class="field-row">
                <dt>{{ f.label }}</dt>
                <dd>{{ formatValue(member?.[f.key]) }}</dd>
              </div>
            </dl>
          </section>

          <!-- Affiliation History -->
          <section class="section">
            <h4 class="section-title">
              Affiliation History
              <span v-if="!loading && !error" class="count-badge">{{ history.length }}</span>
            </h4>

            <p v-if="loading" class="muted small">Loading history…</p>
            <p v-else-if="error" class="notice small">{{ error }}</p>
            <template v-else-if="history.length">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>Semester</th>
                    <th>Designation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(h, i) in history" :key="h._id ?? i">
                    <td class="figure">{{ h.year }}{{ h.semester }}</td>
                    <td
                      class="figure desig"
                      :class="`desig-${h.designation?.toLowerCase()}`"
                    >{{ h.designation }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
            <p v-else class="muted small">No affiliation history found.</p>
          </section>
        </div>

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

.dssoc-id {
  font-size: 0.78rem;
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

.close-btn:hover {
  background: var(--rule);
  color: var(--ink);
}

.close-btn .material-symbols-outlined {
  font-size: 1.2rem;
}

/* Body */
.modal-body {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Section */
.section {
  padding-top: 1.25rem;
}

.section-title {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--slate);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--rule);
  color: var(--ink);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  letter-spacing: 0;
  text-transform: none;
}

/* Profile fields */
.fields {
  margin: 0;
  display: flex;
  flex-direction: column;
}

.field-row {
  display: grid;
  grid-template-columns: 10rem 1fr;
  gap: 0.5rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--rule);
  align-items: baseline;
}

.field-row:last-child {
  border-bottom: none;
}

dt {
  font-size: 0.8rem;
  color: var(--slate);
}

dd {
  margin: 0;
  font-size: 0.88rem;
  word-break: break-word;
}

/* History table */
.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.history-table th {
  text-align: left;
  font-weight: 500;
  font-size: 0.75rem;
  color: var(--slate);
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--rule);
}

.history-table td {
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid #eef0ec;
}

.history-table tbody tr:last-child td {
  border-bottom: none;
}

.desig {
  font-size: 0.8rem;
}

.desig-associate {
  background-color: #af83c8;
  color: #fff !important;
}

.desig-fellow {
  background-color: #9729d5;
  color: #fff !important;
}

.small {
  font-size: 0.85rem;
  margin: 0;
}
</style>
