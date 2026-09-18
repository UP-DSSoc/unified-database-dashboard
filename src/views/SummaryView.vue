<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { api, latestSemester, semesterCode } from '../api/client'
import { auth } from '../stores/auth'
import BarChart from '../components/charts/BarChart.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import GroupedBarChart from '../components/charts/GroupedBarChart.vue'

const semesters = ref([])
const selected = ref(null) // "2425B"
const analytics = ref(null)
const loading = ref(true)
const error = ref('')

const canRead = computed(() => auth.can('read:all', 'read:reaff'))

onMounted(async () => {
  try {
    const meta = await api.semesters()
    semesters.value = [...meta.data].sort(
      (a, b) => b.year - a.year || b.semester.localeCompare(a.semester)
    )
    const latest = latestSemester(meta.data)
    selected.value = latest ? semesterCode(latest.year, latest.semester) : '2425B'
  } catch {
    // The semester list is a convenience; the latest semester is the fallback.
    selected.value = '2425B'
  }
})

watch(selected, load)

async function load() {
  if (!selected.value) return
  if (!canRead.value) {
    loading.value = false
    error.value = 'Your account needs read:reaff or read:all to see these numbers.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    analytics.value = await api.getReaffiliationsSummary(selected.value)
  } catch (e) {
    analytics.value = null
    error.value = e.detail
  } finally {
    loading.value = false
  }
}

const sem = computed(() => analytics.value?.queried_semester)
const otherSem = computed(() => (sem.value === 'A' ? 'B' : 'A'))
const semLabel = (s) => (s === 'A' ? 'First semester' : 'Second semester')

const totalThis = computed(
  () => analytics.value?.total_by_semester.find((d) => d.semester === sem.value)?.count ?? 0
)
const totalOther = computed(
  () => analytics.value?.total_by_semester.find((d) => d.semester === otherSem.value)?.count ?? 0
)
const change = computed(() => totalThis.value - totalOther.value)

const deferrals = computed(
  () => analytics.value?.deferrals_by_semester.find((d) => d.semester === sem.value)?.count ?? 0
)

const fellows = computed(() =>
  (analytics.value?.designation_by_semester ?? [])
    .filter((d) => d.semester === sem.value && d.designation?.includes('Fellow'))
    .reduce((sum, d) => sum + d.count, 0)
)

const designationRows = computed(() =>
  (analytics.value?.designation_by_semester ?? []).map((d) => ({
    group: d.designation || 'Unlisted',
    series: semLabel(d.semester),
    value: d.count
  }))
)

const committeeRows = computed(() =>
  (analytics.value?.members_by_committee ?? [])
    .filter((d) => d.semester === sem.value)
    .map((d) => ({ label: d.committee || 'Unassigned', value: d.count }))
    .sort((a, b) => b.value - a.value)
)

const campusRows = computed(() =>
  (analytics.value?.members_by_campus ?? [])
    .map((d) => ({ label: d.campus_name || d.campus_id || 'Unknown', value: d.count }))
    .slice(0, 6)
)

const yearLevelRows = computed(() =>
  (analytics.value?.members_by_year_level ?? [])
    .filter((d) => d.count > 0)
    .map((d) => ({ label: d.year_level || 'Not stated', value: d.count }))
)

const degreeRows = computed(() =>
  (analytics.value?.classification_by_degree_program ?? [])
    .filter((d) => d.degree_name)
    .slice(0, 10)
    .map((d) => ({ label: d.degree_name, value: d.count }))
)

const academicYear = computed(() => {
  const y = String(analytics.value?.academic_year ?? '')
  return y.length === 4 ? `AY 20${y.slice(0, 2)}–20${y.slice(2)}` : y
})
</script>

<template>
  <header class="head">
    <div>
      <h1>Reaffiliation summary</h1>
      <p class="muted sub">
        {{ analytics ? `${academicYear}, ${semLabel(sem).toLowerCase()}` : selected }}
      </p>
    </div>
    <div class="picker">
      <label for="sem">Semester</label>
      <select id="sem" v-model="selected">
        <option v-for="s in semesters" :key="`${s.year}${s.semester}`" :value="`${s.year}${s.semester}`">
          {{ s.year }}{{ s.semester }}
        </option>
        <option v-if="!semesters.length" :value="selected">{{ selected }}</option>
      </select>
    </div>
  </header>

  <p v-if="error" class="notice" role="alert">{{ error }}</p>
  <p v-else-if="loading" class="muted">Loading {{ selected }}…</p>

  <div v-else-if="analytics" class="board">
    <section class="headline panel">
      <div class="figure-block">
        <p class="big figure">{{ totalThis }}</p>
        <p class="big-label">members reaffiliated this semester</p>
      </div>
      <dl class="side">
        <div>
          <dt>{{ semLabel(otherSem) }}</dt>
          <dd class="figure">{{ totalOther }}</dd>
        </div>
        <div>
          <dt>Change across the year</dt>
          <dd class="figure" :class="change < 0 ? 'down' : 'up'">
            {{ change > 0 ? '+' : '' }}{{ change }}
          </dd>
        </div>
        <div>
          <dt>Fellows</dt>
          <dd class="figure">{{ fellows }}</dd>
        </div>
        <div>
          <dt>Deferrals</dt>
          <dd class="figure">{{ deferrals }}</dd>
        </div>
      </dl>
    </section>

    <section class="panel wide">
      <h2>Designations across both semesters</h2>
      <p class="panel-note">Standing held at the time of each reaffiliation.</p>
      <GroupedBarChart :data="designationRows" :height="250" />
    </section>

    <section class="panel">
      <h2>Campus</h2>
      <p class="panel-note">Resolved from each member's degree program.</p>
      <DonutChart :data="campusRows" center-label="members" />
    </section>

    <section class="panel">
      <h2>Committees</h2>
      <p class="panel-note">Assignments recorded for this semester.</p>
      <BarChart :data="committeeRows" :label-width="170" color="#0f4a34" />
    </section>

    <section class="panel">
      <h2>Year level</h2>
      <p class="panel-note">Undergraduate standing at reaffiliation.</p>
      <BarChart :data="yearLevelRows" :label-width="90" color="#3e5c76" />
    </section>

    <section class="panel wide">
      <h2>Largest degree programs</h2>
      <p class="panel-note">Top ten across the academic year, both semesters combined.</p>
      <BarChart :data="degreeRows" :label-width="230" color="#b8842b" />
    </section>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  padding-bottom: 1.1rem;
  margin-bottom: 1.4rem;
  border-bottom: 1px solid var(--rule);
}

.sub {
  margin: 0.2rem 0 0;
  font-size: 0.9rem;
}

.picker {
  min-width: 8.5rem;
}

.board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}

.wide {
  grid-column: 1 / -1;
}

.headline {
  grid-column: 1 / -1;
  display: flex;
  gap: 2.5rem;
  align-items: center;
  flex-wrap: wrap;
  border-left: 4px solid var(--maroon);
}

.big {
  margin: 0;
  font-size: 3.6rem;
  line-height: 1;
  font-weight: 500;
}

.big-label {
  margin: 0.3rem 0 0;
  color: var(--slate);
  font-size: 0.9rem;
  max-width: 12rem;
}

.side {
  display: flex;
  gap: 2.2rem;
  margin: 0;
  flex-wrap: wrap;
}

.side dt {
  color: var(--slate);
  font-size: 0.82rem;
}

.side dd {
  margin: 0.15rem 0 0;
  font-size: 1.5rem;
}

.down {
  color: var(--maroon);
}

.up {
  color: var(--forest);
}

@media (max-width: 900px) {
  .board {
    grid-template-columns: 1fr;
  }
}
</style>
