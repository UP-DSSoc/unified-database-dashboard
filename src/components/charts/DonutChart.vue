<script setup>
import { computed, watchEffect } from 'vue'
import * as d3 from 'd3'
import { useChartSize, CHART_COLORS } from './useChartSize'

const props = defineProps({
  // [{ label: string, value: number }]
  data: { type: Array, required: true },
  size: { type: Number, default: 210 },
  centerLabel: { type: String, default: '' }
})

const { host, width } = useChartSize(props.size)
const total = computed(() => props.data.reduce((sum, d) => sum + d.value, 0))

watchEffect(() => {
  const el = host.value
  if (!el) return

  const size = Math.min(props.size, width.value)
  const radius = size / 2
  const rows = props.data

  const svg = d3
    .select(el)
    .selectAll('svg')
    .data([null])
    .join('svg')
    .attr('width', size)
    .attr('height', size)
    .attr('role', 'img')
    .attr('aria-label', `Distribution by ${props.centerLabel || 'category'}`)

  const g = svg
    .selectAll('g.plot')
    .data([null])
    .join('g')
    .attr('class', 'plot')
    .attr('transform', `translate(${radius},${radius})`)

  const color = d3.scaleOrdinal().domain(rows.map((d) => d.label)).range(CHART_COLORS)
  const pie = d3.pie().sort(null).value((d) => d.value)
  const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius - 2)

  g.selectAll('path')
    .data(pie(rows), (d) => d.data.label)
    .join('path')
    .attr('fill', (d) => color(d.data.label))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .attr('d', arc)

  g.selectAll('text.total')
    .data([null])
    .join('text')
    .attr('class', 'total figure')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.1em')
    .text(total.value)

  g.selectAll('text.caption')
    .data([props.centerLabel])
    .join('text')
    .attr('class', 'caption')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.6em')
    .text((d) => d)
})

const legend = computed(() =>
  props.data.map((d, i) => ({
    ...d,
    color: CHART_COLORS[i % CHART_COLORS.length],
    share: total.value ? Math.round((d.value / total.value) * 100) : 0
  }))
)
</script>

<template>
  <div class="donut">
    <div ref="host"></div>
    <ul class="legend">
      <li v-for="row in legend" :key="row.label">
        <span class="swatch" :style="{ background: row.color }"></span>
        <span class="name">{{ row.label }}</span>
        <span class="count figure">{{ row.value }} · {{ row.share }}%</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.donut > div:first-child {
  flex: 0 0 auto;
}

.donut {
  display: flex;
  gap: 1.4rem;
  align-items: center;
  flex-wrap: wrap;
}

.donut :deep(text.total) {
  font-size: 1.35rem;
  font-weight: 500;
  fill: var(--ink);
}

.donut :deep(text.caption) {
  font-size: 0.68rem;
  fill: var(--slate);
}

.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-width: 11rem;
  font-size: 0.85rem;
}

.legend li {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.2rem 0;
  border-bottom: 1px solid var(--rule);
}

.legend li:last-child {
  border-bottom: 0;
}

.name {
  flex: 1;
}

.count {
  font-size: 0.78rem;
  color: var(--slate);
}

.swatch {
  width: 9px;
  height: 9px;
  border-radius: 1px;
}
</style>
