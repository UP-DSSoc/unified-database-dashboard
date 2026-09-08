<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { api, latestSemester, semesterCode } from '../api/client'
import { auth } from '../stores/auth'

// GET /members?year&sem is the endpoint that carries member names — it returns
// everyone who reaffiliated in that semester. GET /reaffiliations returns the
// fact rows only (year, designation, classification), with no name attached.

const semesters = ref([])
const selected = ref(null)
const page = ref(1)
const result = ref(null)
const loading = ref(true)
const error = ref('')
const search = ref('')

const canRead = computed(() => auth.can('read:all', 'read:member'))

onMounted(async () => {
  try {
    const meta = await api.semesters()
    semesters.value = [...meta.data].sort(
      (a, b) => b.year - a.year || b.semester.localeCompare(a.semester)
    )
    const latest = latestSemester(meta.data)
    selected.value = latest ? semesterCode(latest.year, latest.semester) : '2425B'
  } catch {
    selected.value = '2425B'
  }
})

watch(selected, () => {
  page.value = 1
  load()
})
watch(page, load)

async function load() {
  if (!selected.value) return
  if (!canRead.value) {
    loading.value = false
    error.value = 'Your account needs read:member or read:all to see this list.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    result.value = await api.members({
      year: selected.value.slice(0, 4),
      sem: selected.value.slice(4),
      page: page.value
    })
  } catch (e) {
    result.value = null
    error.value = e.detail
  } finally {
    loading.value = false
  }
}

const fullName = (m) =>
  [m.first_name, m.middle_name, m.last_name, m.suffix].filter(Boolean).join(' ')

// Filters the loaded page. Server-side name search is not exposed yet.
const rows = computed(() => {
  const list = result.value?.data ?? []
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((m) =>
    [fullName(m), m.student_number, m.up_mail, m._id]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
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
      <h1>Reaffiliations</h1>
      <p class="muted sub">Members who reaffiliated in the selected semester.</p>
    </div>
    <div class="controls">
      <div>
        <label for="sem">Semester</label>
        <select id="sem" v-model="selected">
          <option v-for="s in semesters" :key="`${s.year}${s.semester}`" :value="`${s.year}${s.semester}`">
            {{ s.year }}{{ s.semester }}
          </option>
          <option v-if="!semesters.length" :value="selected">{{ selected }}</option>
        </select>
      </div>
      <div class="search">
        <label for="q">Find on this page</label>
        <input id="q" v-model="search" type="search" placeholder="Name, student number, email" />
      </div>
    </div>
  </header>

  <p v-if="error" class="notice" role="alert">{{ error }}</p>
  <p v-else-if="loading" class="muted">Loading {{ selected }}…</p>

  <template v-else-if="result">
    <p class="count">
      <span class="figure">{{ result.total }}</span> members reaffiliated in {{ selected }}<span
        v-if="result.total"
      >
        · showing {{ firstOnPage }}–{{ lastOnPage }}</span
      >
    </p>

    <div class="table-wrap panel">
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">DSSOC ID</th>
            <th scope="col">Student number</th>
            <th scope="col">UP mail</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in rows" :key="m.dssoc_id">
            <td>{{ fullName(m) }}</td>
            <td class="figure">{{ m._id }}</td>
            <td class="figure">{{ m.student_number || '—' }}</td>
            <td>{{ m.up_mail || '—' }}</td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="4" class="empty">
              {{
                search
                  ? 'No one on this page matches that search. Try another page or clear the search.'
                  : 'No reaffiliations recorded for this semester yet.'
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
</style>
