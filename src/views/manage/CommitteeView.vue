<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import { auth } from '@/stores/auth'

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

async function load() {
  if (!canRead.value) {
    loading.value = false
    error.value = 'Your account needs read:all to see committees.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    result.value = await api.getCommittees()
  } catch (e) {
    result.value = null
    error.value = e.detail
  } finally {
    loading.value = false
  }
}

// TODO: open the add-committee modal once it exists.
function addCommittee() {}

// TODO: open the edit-committee modal once it exists.
function editCommittee(committee) {}

// TODO: call the delete endpoint once the API exposes one for top-level committees.
async function deleteCommittee(committee) {
  if (!window.confirm(`Delete ${committee.name} (${committee._id})? This cannot be undone.`)) return
}

const categoryNum = (c) => String(c?.category_num ?? '').padStart(2, '0')

const rows = computed(() => {
  const list = (result.value?.data ?? [])
    .filter((c) => !c.is_deleted)
    .sort((a, b) => categoryNum(a).localeCompare(categoryNum(b)) || a._id.localeCompare(b._id))
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((c) =>
    [c._id, c.name, c.category_num].some((v) => String(v ?? '').toLowerCase().includes(q))
  )
})
</script>

<template>
  <header class="head">
    <div>
      <h1>Committees</h1>
      <p class="muted sub">Committees members can be assigned to.</p>
    </div>
    <div class="controls">
      <div class="search">
        <label for="q">Find committee</label>
        <input id="q" v-model="search" type="search" placeholder="Initials, name, category" />
      </div>
      <button v-if="canCreate" class="btn" @click="addCommittee">
        <span class="material-symbols-outlined">add</span>
        Add committee
      </button>
    </div>
  </header>

  <p v-if="error" class="notice" role="alert">{{ error }}</p>
  <p v-else-if="loading" class="muted">Loading committees…</p>

  <template v-else-if="result">
    <p class="count">
      <span class="figure">{{ rows.length }}</span> committees<span v-if="search"> match</span>
    </p>

    <div class="table-wrap panel">
      <table>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Initials</th>
            <th scope="col">Name</th>
            <th v-if="hasAnyAction" scope="col" class="actions-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in rows" :key="c._id">
            <td class="figure">{{ categoryNum(c) }}</td>
            <td class="figure">{{ c._id }}</td>
            <td>{{ c.name }}</td>
            <td v-if="hasAnyAction" class="actions-cell">
              <div class="row-actions">
                <button
                  v-if="canEdit"
                  class="row-btn"
                  :aria-label="`Edit ${c.name}`"
                  @click="editCommittee(c)"
                >
                  <span class="material-symbols-outlined">edit</span>
                  Edit
                </button>
                <button
                  v-if="canDelete"
                  class="row-btn danger"
                  :aria-label="`Delete ${c.name}`"
                  @click="deleteCommittee(c)"
                >
                  <span class="material-symbols-outlined">delete</span>
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="hasAnyAction ? 4 : 3" class="empty">
              {{ search ? 'No committee matches that search.' : 'No committees recorded yet.' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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
