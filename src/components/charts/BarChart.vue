<script setup>
import { watchEffect } from 'vue'
import * as d3 from 'd3'
import { useChartSize } from './useChartSize'

const props = defineProps({
  // [{ label: string, value: number }]
  data: { type: Array, required: true },
  color: { type: String, default: '#7b1113' },
  rowHeight: { type: Number, default: 26 },
  labelWidth: { type: Number, default: 150 }
})

const { host, width } = useChartSize()

watchEffect(() => {
  const el = host.value
  if (!el) return

  const rows = props.data
  const w = width.value
  const margin = { top: 4, right: 44, bottom: 0, left: props.labelWidth }
  const innerW = Math.max(60, w - margin.left - margin.right)
  const innerH = rows.length * props.rowHeight
  const h = innerH + margin.top

  const svg = d3
    .select(el)
    .selectAll('svg')
    .data([null])
    .join('svg')
    .attr('width', w)
    .attr('height', h)

  const g = svg
    .selectAll('g.plot')
    .data([null])
    .join('g')
    .attr('class', 'plot')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => d.value) || 1])
    .range([0, innerW])

  const y = d3
    .scaleBand()
    .domain(rows.map((d) => d.label))
    .range([0, innerH])
    .padding(0.28)

  const row = g
    .selectAll('g.row')
    .data(rows, (d) => d.label)
    .join((enter) => {
      const gr = enter.append('g').attr('class', 'row')
      gr.append('rect')
      gr.append('text').attr('class', 'cat')
      gr.append('text').attr('class', 'val')
      return gr
    })
    .attr('transform', (d) => `translate(0,${y(d.label)})`)

  row
    .select('rect')
    .attr('height', y.bandwidth())
    .attr('fill', props.color)
    .transition()
    .duration(320)
    .attr('width', (d) => Math.max(1, x(d.value)))

  row
    .select('text.cat')
    .attr('x', -10)
    .attr('y', y.bandwidth() / 2)
    .attr('dy', '0.34em')
    .attr('text-anchor', 'end')
    .text((d) => d.label)

  row
    .select('text.val')
    .attr('class', 'val figure')
    .attr('y', y.bandwidth() / 2)
    .attr('dy', '0.34em')
    .attr('x', (d) => x(d.value) + 7)
    .text((d) => d.value)
})
</script>

<template>
  <div ref="host" class="chart"></div>
</template>

<style scoped>
.chart :deep(text) {
  font-size: 12px;
  fill: var(--ink);
}

.chart :deep(text.cat) {
  fill: var(--slate);
}

.chart :deep(text.val) {
  font-family: var(--figure);
  font-variant-numeric: tabular-nums;
}
</style>
