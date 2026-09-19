<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { api, latestSemester, semesterCode } from '../api/client'
import { auth } from '../stores/auth'
import SingleReaffiliation from '../components/reaffiliation/SingleReaffiliation.vue'

const semesters = ref([])
const selected = ref(null)
const page = ref(1)
const result = ref(null)
const loading = ref(true)
const error = ref('')
const search = ref('')

const canRead = computed(() => auth.can('read:all', 'read:member'))
const canEditMember = computed(() => auth.can('update:all', 'update:member'))
const canEditReaff = computed(() => auth.can('update:all', 'update:reaff'))
const canDelete = computed(() => auth.can('delete:all', 'delete:reaff'))
const hasAnyAction = computed(
  () => canRead.value || canEditMember.value || canEditReaff.value || canDelete.value
)

const openMenu = ref(null)
const editExpanded = ref(false)
const viewRecord = ref(null)
const menuPos = ref({ top: 0, left: 0 })

function toggleMenu(id, event) {
  if (openMenu.value === id) {
    openMenu.value = null
    editExpanded.value = false
  } else {
    openMenu.value = id
    editExpanded.value = false
    const rect = event.currentTarget.getBoundingClientRect()
    menuPos.value = { top: rect.bottom + 4, left: rect.right }
  }
}

function closeMenu() {
  openMenu.value = null
  editExpanded.value = false
}

function onDocClick() {
  if (openMenu.value !== null) closeMenu()
}

onMounted(async () => {
  document.addEventListener('click', onDocClick)
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

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
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
    result.value = await api.getReaffiliations({
      year: selected.value.slice(0, 4),
      sem: selected.value.slice(4),
      include_member_data: true,
      page: page.value,
    })
    console.warn(result?.value)
  } catch (e) {
    result.value = null
    error.value = e.detail
  } finally {
    loading.value = false
  }
}

async function deleteReaff(id) {
  console.warn("ID selected", id)
  if (!window.confirm('Delete this reaffiliation record? This cannot be undone.')) return
  closeMenu()
  try {
    await api.deleteReaffiliation(id)
    await load()
  } catch (e) {
    error.value = e?.detail || 'Failed to delete reaffiliation.'
  }
}

const fetchId = (m) => m?.id ?? m?._id

const fullName = (m) =>
  [m.first_name, m.middle_name, m.last_name, m.suffix].filter(Boolean).join(' ')

const lNFnName = (m) => `${m?.last_name}, ${m?.first_name} ${m?.middle_name} ${m?.suffix}`

// const sortMembers = (a, b) => -1

// Filters the loaded page. Server-side name search is not exposed yet.
const rows = computed(() => {
  const list = result?.value?.data ?? []
  console.warn("list", list)
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((r) =>
    [r?.member.student_number, r?.member.up_mail, r?.member._id]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  )
  // ).sort(sortMembers(a?.member?.last_name, b?.member?.last_name))
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
            <!-- Name: LN, FN -->
            <th scope="col">Name</th>
            <th scope="col">DSSOC ID</th>
            <th scope="col">Designation</th>
            <th scope="col">Student Number</th>
            <th scope="col">UP Mail</th>
            <th v-if="hasAnyAction" scope="col" class="actions-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in rows" :key="m?.dssoc_id">
            <td>{{ lNFnName(m?.member) }}</td>
            <td class="figure">{{ m?.dssoc_id }}</td>
            <td class="figure" :class="`desig-${m?.designation?.toLowerCase()}`">{{ m?.designation }}</td>
            <td class="figure">{{ m?.member?.student_number || '—' }}</td>
            <td>{{ m?.member?.up_mail || '—' }}</td>
            <td v-if="hasAnyAction" class="actions-cell">
              <div class="menu-wrap" @click.stop>
                <button
                  class="icon-btn"
                  :class="{ active: openMenu === m.dssoc_id }"
                  :aria-label="`Actions for ${lNFnName(m.member)}`"
                  :aria-expanded="String(openMenu === m.dssoc_id)"
                  @click="toggleMenu(m.dssoc_id, $event)"
                >
                  <span class="material-symbols-outlined">more_horiz</span>
                </button>
                <Teleport to="body">
                  <div
                    v-if="openMenu === m.dssoc_id"
                    class="action-menu"
                    :style="{ top: menuPos.top + 'px', left: menuPos.left + 'px' }"
                    @click.stop
                  >
                    <button v-if="canRead" class="action-btn" @click="viewRecord = m; closeMenu()">
                      <span class="material-symbols-outlined">visibility</span>
                      View
                    </button>

                    <div v-if="canEditMember || canEditReaff">
                      <button class="action-btn" @click="editExpanded = !editExpanded">
                        <span class="material-symbols-outlined">more_horiz</span>
                        Edit
                        <span class="material-symbols-outlined caret">{{
                          editExpanded ? 'expand_less' : 'expand_more'
                        }}</span>
                      </button>
                      <div v-if="editExpanded" class="sub-menu">
                        <button v-if="canEditMember" class="action-btn sub-btn" @click="closeMenu">
                          Edit Member
                        </button>
                        <button v-if="canEditReaff" class="action-btn sub-btn" @click="closeMenu">
                          Edit Reaffiliation
                        </button>
                      </div>
                    </div>

                    <button v-if="canDelete" class="action-btn danger" @click="deleteReaff(fetchId(m))">
                      <span class="material-symbols-outlined">delete</span>
                      Delete
                    </button>
                  </div>
                </Teleport>
              </div>
            </td>
          </tr>
          <tr v-if="!rows?.length">
            <td :colspan="hasAnyAction ? 6 : 5" class="empty">
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

  <SingleReaffiliation
    v-if="viewRecord"
    :record="viewRecord"
    @close="viewRecord = null"
  />
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

.desig-associate {
  background-color: #af83c8;
  color: #fff !important;
}

.desig-fellow {
  background-color: #9729d5;
  color: #fff !important;
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
  width: 3rem;
  padding-right: 0.75rem;
}

.actions-cell {
  width: 3rem;
  text-align: right;
  padding: 0.3rem 0.5rem;
}

.menu-wrap {
  position: relative;
  display: inline-block;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.3rem;
  border-radius: 4px;
  color: var(--slate);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, color 0.12s;
  line-height: 1;
}

.icon-btn:hover,
.icon-btn.active {
  background: var(--rule, #e8eae6);
  color: var(--ink);
}

.icon-btn .material-symbols-outlined {
  font-size: 1.25rem;
}

.action-menu {
  position: fixed;
  transform: translateX(-100%);
  background: #fff;
  border: 1px solid var(--rule, #e8eae6);
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  min-width: 11rem;
  z-index: 9999;
  overflow: hidden;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--ink);
  transition: background 0.1s;
  white-space: nowrap;
}

.action-btn:hover {
  background: var(--rule, #f0f2ee);
}

.action-btn .material-symbols-outlined {
  font-size: 1rem;
  color: var(--slate);
  flex-shrink: 0;
}

.action-btn.danger {
  color: #c0392b;
}

.action-btn.danger .material-symbols-outlined {
  color: #c0392b;
}

.caret {
  margin-left: auto;
  font-size: 1rem !important;
  color: var(--slate) !important;
}

.sub-menu {
  border-top: 1px solid var(--rule, #e8eae6);
}

.sub-btn {
  padding-left: 2.25rem;
  font-size: 0.82rem;
  color: var(--slate);
}

.sub-btn:hover {
  color: var(--ink);
}
</style>
