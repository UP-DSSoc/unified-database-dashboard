<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import { auth } from '@/stores/auth'
import DataTable from '@/components/table/DataTable.vue'
import TablePager from '@/components/table/TablePager.vue'

const page = ref(1)
const result = ref(null)
const loading = ref(true)
const error = ref('')
const search = ref('')

const canRead = computed(() => auth.can('read:all'))
const canEdit = computed(() => auth.can('update:all'))
const canDelete = computed(() => auth.can('delete:all'))
const hasAnyAction = computed(() => canEdit.value || canDelete.value)

onMounted(load)
watch(page, load)

async function load() {
  if (!canRead.value) {
    loading.value = false
    error.value = 'Your account needs read:all to see user roles.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    result.value = await api.getUserRoles({ page: page.value })
  } catch (e) {
    result.value = null
    error.value = e.detail
  } finally {
    loading.value = false
  }
}

// TODO: open the edit-role modal once the API exposes a user-role update endpoint.
function editRole(role) {}

// TODO: call the delete endpoint once the API exposes one for user roles.
function deleteRole(role) {}

const roleId = (r) => r?._id ?? r?.role_id

const columns = [
  { key: 'role_id', label: 'Role ID', cellClass: 'figure' },
  { key: 'role_name', label: 'Role' },
  { key: 'description', label: 'Description' },
  { key: 'permissions', label: 'Permissions' },
]

const rowActions = computed(() => [
  {
    key: 'edit',
    label: 'Edit',
    icon: 'edit',
    show: canEdit.value,
    ariaLabel: (r) => `Edit ${r.role_name}`,
    onClick: editRole,
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'delete',
    danger: true,
    show: canDelete.value,
    ariaLabel: (r) => `Delete ${r.role_name}`,
    onClick: deleteRole,
  },
])

// Filters the loaded page. Server-side search is not exposed yet.
const rows = computed(() => {
  const list = result.value?.data ?? []
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((r) =>
    [r.role_name, r.description, ...(r.permissions ?? [])].some((v) =>
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
      <h1>User Roles</h1>
      <p class="muted sub">Roles and the permissions they grant to accounts.</p>
    </div>
    <div class="controls">
      <div class="search">
        <label for="q">Find on this page</label>
        <input id="q" v-model="search" type="search" placeholder="Role, description, permission" />
      </div>
    </div>
  </header>

  <p v-if="error" class="notice" role="alert">{{ error }}</p>
  <p v-else-if="loading" class="muted">Loading user roles…</p>

  <template v-else-if="result">
    <p class="count">
      <span class="figure">{{ result.total }}</span> user roles<span v-if="result.total">
        · showing {{ firstOnPage }}–{{ lastOnPage }}</span
      >
    </p>

    <DataTable
      :columns="columns"
      :rows="rows"
      :row-key="roleId"
      :actions="rowActions"
      :show-actions="hasAnyAction"
      :empty-text="
        search
          ? 'No role on this page matches that search. Try another page or clear the search.'
          : 'No user roles recorded yet.'
      "
    >
      <template #cell:permissions="{ value }">
        <span v-if="value?.length" class="perm-list">
          <span v-for="p in value" :key="p" class="perm-chip figure">{{ p }}</span>
        </span>
        <span v-else class="muted">No permissions assigned</span>
      </template>
    </DataTable>

    <TablePager v-model:page="page" :total-pages="result.total_pages" />
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
  min-width: 18rem;
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

.perm-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.perm-chip {
  font-size: 0.72rem;
  padding: 0.1rem 0.45rem;
  background: var(--canvas);
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--ink);
}
</style>
