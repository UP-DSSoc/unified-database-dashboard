<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import { auth } from '@/stores/auth'

const page = ref(1)
const result = ref(null)
const loading = ref(true)
const error = ref('')
const search = ref('')

const canRead = computed(() => auth.can('read:all'))
const canCreate = computed(() => auth.can('create:all'))
const canEdit = computed(() => auth.can('update:all'))
const canDelete = computed(() => auth.can('delete:all'))
const hasAnyAction = computed(() => canEdit.value || canDelete.value)

onMounted(load)
watch(page, load)

async function load() {
  if (!canRead.value) {
    loading.value = false
    error.value = 'Your account needs read:all to see degree programs.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    result.value = await api.getDegrees({ page: page.value })
  } catch (e) {
    result.value = null
    error.value = e.detail
  } finally {
    loading.value = false
  }
}

// TODO: open the add-degree modal once it exists.
function addDegree() {}

// TODO: open the edit-degree modal once it exists.
function editDegree(degree) {}

// TODO: call the delete endpoint once the API exposes one for degree programs.
async function deleteDegree(degree) {
  if (!window.confirm(`Delete ${degree.course_name}? This cannot be undone.`)) return
}

const degreeId = (d) => d?.id ?? d?._id ?? d?.degree_id

// Filters the loaded page. Server-side search is not exposed yet.
const rows = computed(() => {
  const list = result.value?.data ?? []
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((d) =>
    [d.course_name, d.campus_id, d.college].some((v) =>
      String(v ?? '').toLowerCase().includes(q)
    )
  )
})

const firstOnPage = computed(() =>
  result.value?.total ? (result.value.page - 1) * result.value.page_size + 1 : 0
)
const lastOnPage = computed(() =>
  Math.min(result.value?.page * result.value?.page_size, result.value?.total ?? 0)
)
</script>

<template>
  <header class="head">
    <div>
      <h1>Degree Programs</h1>
      <p class="muted sub">Degree programs members can be enrolled in.</p>
    </div>
    <div class="controls">
      <div class="search">
        <label for="q">Find on this page</label>
        <input id="q" v-model="search" type="search" placeholder="Course, campus, college" />
      </div>
      <button v-if="canCreate" class="btn" @click="addDegree">
        <span class="material-symbols-outlined">add</span>
        Add degree program
      </button>
    </div>
  </header>

  <p v-if="error" class="notice" role="alert">{{ error }}</p>
  <p v-else-if="loading" class="muted">Loading degree programs…</p>

  <template v-else-if="result">
    <p class="count">
      <span class="figure">{{ result.total }}</span> degree programs<span v-if="result.total">
        · showing {{ firstOnPage }}–{{ lastOnPage }}</span
      >
    </p>

    <div class="table-wrap panel">
      <table>
        <thead>
          <tr>
            <th scope="col">Course</th>
            <th scope="col">Campus</th>
            <th scope="col">College</th>
            <th v-if="hasAnyAction" scope="col" class="actions-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in rows" :key="degreeId(d)">
            <td>{{ d.course_name }}</td>
            <td class="figure">{{ d.campus_id }}</td>
            <td class="figure">{{ d.college || '—' }}</td>
            <td v-if="hasAnyAction" class="actions-cell">
              <div class="row-actions">
                <button
                  v-if="canEdit"
                  class="row-btn"
                  :aria-label="`Edit ${d.course_name}`"
                  @click="editDegree(d)"
                >
                  <span class="material-symbols-outlined">edit</span>
                  Edit
                </button>
                <button
                  v-if="canDelete"
                  class="row-btn danger"
                  :aria-label="`Delete ${d.course_name}`"
                  @click="deleteDegree(d)"
                >
                  <span class="material-symbols-outlined">delete</span>
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="hasAnyAction ? 4 : 3" class="empty">
              {{
                search
                  ? 'No degree program on this page matches that search. Try another page or clear the search.'
                  : 'No degree programs recorded yet.'
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="result.total_pages > 1" class="pager">
      <button class="btn btn-quiet" :disabled="page <= 1" @click="page--">Previous</button>
      <span class="figure">Page {{ result.page }} of {{ result.total_pages }}</span>
      <button class="btn btn-quiet" :disabled="page >= result.total_pages" @click="page++">
        Next
      </button>
    </nav>
  </template>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding-bottom: 1.1rem;
  margin-bottom: 1.2rem;
  border-bottom: 1px solid var(--rule);
}

.sub {
  margin: 0.2rem 0 0;
  font-size: 0.9rem;
}

.controls {
  display: flex;
  gap: 0.9rem;
  align-items: flex-end;
}

.search {
  min-width: 15rem;
}

.count {
  margin: 0 0 0.8rem;
  color: var(--slate);
  font-size: 0.9rem;
}

.count .figure {
  color: var(--ink);
  font-size: 1rem;
}

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

.empty {
  color: var(--slate);
  padding: 2rem 1rem;
  text-align: center;
}

.pager {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--slate);
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

.row-actions {
  display: inline-flex;
  gap: 0.4rem;
}

.row-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--ink);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}

.row-btn:hover {
  background: #fff;
  border-color: var(--slate);
}

.row-btn .material-symbols-outlined {
  font-size: 1rem;
  color: var(--slate);
}

.row-btn.danger {
  color: #c0392b;
}

.row-btn.danger .material-symbols-outlined {
  color: #c0392b;
}

.row-btn.danger:hover {
  border-color: #c0392b;
}
</style>
