<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import { auth } from '@/stores/auth'
import DataTable from '@/components/table/DataTable.vue'
import TablePager from '@/components/table/TablePager.vue'
import AddModal from '@/components/generic/AddModal.vue'

const page = ref(1)
const result = ref(null)
const loading = ref(true)
const error = ref('')
const search = ref('')

// Add-degree modal, plus the state AddModal renders while the create runs.
const adding = ref(false)
const creating = ref(false)
const createError = ref('')

// Campuses back the campus dropdown. Loaded on first open and kept after, so
// reopening the modal does not refetch.
const campuses = ref([])
const campusesLoading = ref(false)
const campusesError = ref('')

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

// TODO: edit campus list
async function loadCampuses() {
  if (campuses.value.length || campusesLoading.value) return
  campusesLoading.value = true
  campusesError.value = ''
  try {
    const res = await api.getCampuses()
    campuses.value = res?.data ?? []
    console.warn("Value of campus", campuses?.value)
  } catch (e) {
    campusesError.value = e?.detail || 'Could not load campuses.'
  } finally {
    campusesLoading.value = false
  }
}

function addDegree() {
  createError.value = ''
  adding.value = true
  loadCampuses()
}

function cancelAdd() {
  adding.value = false
  createError.value = ''
}

async function createDegree(values) {
  creating.value = true
  createError.value = ''
  try {
    await api.addDegree(values)
    adding.value = false
    await load()
  } catch (e) {
    // Kept in the modal so the typed values survive and can be retried.
    createError.value = e?.detail || 'Failed to add degree program.'
  } finally {
    creating.value = false
  }
}

// TODO: open the edit-degree modal once it exists.
function editDegree(degree) {}

// TODO: call the delete endpoint once the API exposes one for degree programs.
async function deleteDegree(degree) {
  if (!window.confirm(`Delete ${degree.course_name}? This cannot be undone.`)) return
}

const degreeId = (d) => d?.id ?? d?._id ?? d?.degree_id

const columns = [
  { key: 'course_name', label: 'Course' },
  { key: 'campus_id', label: 'Campus', cellClass: 'figure' },
  { key: 'college', label: 'College', cellClass: 'figure' },
]

// The campus identifier is the document key; fall back in case the endpoint
// names it differently.
const campusId = (c) => c?.campus_id

// POST /campus/{campus_id}/degrees takes all four keys; college and
// college_long accept null, so they are left optional here.
const addFields = computed(() => [
  {
    key: 'campus_id',
    label: 'Campus',
    type: 'select',
    required: true,
    options: campuses.value.map((c) => ({
      value: campusId(c),
      label: c.campus_name ? `${c.campus_name} (${c?._id ?? c?.id})` : campusId(c),
    })),
    optionsLoading: campusesLoading.value,
    hint: campusesError.value,
  },
  {
    key: 'course_name',
    label: 'Course name',
    type: 'string',
    required: true,
    placeholder: 'Computer Science',
  },
  {
    key: 'college',
    label: 'College',
    type: 'string',
    placeholder: 'ENG',
    hint: 'College abbreviation. Optional.',
  },
  {
    key: 'college_long',
    label: 'College (full name)',
    type: 'string',
    placeholder: 'College of Engineering',
    hint: 'Optional.',
  },
])

const rowActions = computed(() => [
  {
    key: 'edit',
    label: 'Edit',
    icon: 'edit',
    show: canEdit.value,
    ariaLabel: (d) => `Edit ${d.course_name}`,
    onClick: editDegree,
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'delete',
    danger: true,
    show: canDelete.value,
    ariaLabel: (d) => `Delete ${d.course_name}`,
    onClick: deleteDegree,
  },
])

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

    <DataTable
      :columns="columns"
      :rows="rows"
      :row-key="degreeId"
      :actions="rowActions"
      :show-actions="hasAnyAction"
      :empty-text="
        search
          ? 'No degree program on this page matches that search. Try another page or clear the search.'
          : 'No degree programs recorded yet.'
      "
    />

    <TablePager v-model:page="page" :total-pages="result.total_pages" />
  </template>

  <AddModal
    v-if="adding"
    title="Add degree program"
    description="Records a degree program under a campus."
    submit-label="Add degree program"
    :fields="addFields"
    :busy="creating"
    :error="createError"
    @close="cancelAdd"
    @submit="createDegree"
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
</style>
