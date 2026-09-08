<script setup>
import { watchEffect } from 'vue'
import * as d3 from 'd3'
import { useChartSize, CHART_COLORS } from './useChartSize'

const props = defineProps({
  // [{ group: string, series: string, value: number }]
  data: { type: Array, required: true },
  height: { type: Number, default: 260 },
  colors: { type: Array, default: () => CHART_COLORS }
})

const { host, width } = useChartSize()

watchEffect(() => {
  const el = host.value
  if (!el) return

  const rows = props.data
  const groups = [...new Set(rows.map((d) => d.group))]
  const series = [...new Set(rows.map((d) => d.series))]

  const w = width.value
  const margin = { top: 8, right: 8, bottom: 46, left: 38 }
  const innerW = Math.max(80, w - margin.left - margin.right)
  const innerH = props.height - margin.top - margin.bottom

  const svg = d3
    .select(el)
    .selectAll('svg')
    .data([null])
    .join('svg')
    .attr('width', w)
    .attr('height', props.height)

  const g = svg
    .selectAll('g.plot')
    .data([null])
    .join('g')
    .attr('class', 'plot')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const x0 = d3.scaleBand().domain(groups).range([0, innerW]).paddingInner(0.25)
  const x1 = d3.scaleBand().domain(series).range([0, x0.bandwidth()]).padding(0.12)
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => d.value) || 1])
    .nice()
    .range([innerH, 0])
  const color = d3.scaleOrdinal().domain(series).range(props.colors)

  g.selectAll('g.y-axis')
    .data([null])
    .join('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y).ticks(4).tickSize(-innerW))
    .call((sel) => sel.select('.domain').remove())

  g.selectAll('g.x-axis')
    .data([null])
    .join('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .call((sel) => sel.select('.domain').attr('stroke', 'var(--rule)'))
    .selectAll('text')
    .call(wrap, x0.bandwidth())

  g.selectAll('rect.bar')
    .data(rows, (d) => `${d.group}|${d.series}`)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', (d) => x0(d.group) + x1(d.series))
    .attr('width', x1.bandwidth())
    .attr('fill', (d) => color(d.series))
    .transition()
    .duration(320)
    .attr('y', (d) => y(d.value))
    .attr('height', (d) => innerH - y(d.value))

  g.selectAll('text.value')
    .data(rows, (d) => `${d.group}|${d.series}`)
    .join('text')
    .attr('class', 'value figure')
    .attr('x', (d) => x0(d.group) + x1(d.series) + x1.bandwidth() / 2)
    .attr('y', (d) => y(d.value) - 5)
    .attr('text-anchor', 'middle')
    .text((d) => d.value)
})

// Long designation names ("Conditional Fellow") need wrapping under their group.
function wrap(text, w) {
  text.each(function () {
    const node = d3.select(this)
    const words = node.text().split(/\s+/)
    node.text(null)
    let line = []
    let tspan = node.append('tspan').attr('x', 0).attr('dy', '1.1em')
    for (const word of words) {
      line.push(word)
      tspan.text(line.join(' '))
      if (tspan.node().getComputedTextLength() > w && line.length > 1) {
        line.pop()
        tspan.text(line.join(' '))
        line = [word]
        tspan = node.append('tspan').attr('x', 0).attr('dy', '1.05em').text(word)
      }
    }
  })
}
</script>

<template>
  <div>
    <div ref="host" class="chart"></div>
    <ul class="legend">
      <li v-for="(s, i) in [...new Set(data.map((d) => d.series))]" :key="s">
        <span class="swatch" :style="{ background: colors[i % colors.length] }"></span>{{ s }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.chart :deep(text) {
  font-size: 11.5px;
  fill: var(--slate);
}

.chart :deep(text.value) {
  font-family: var(--figure);
  font-size: 10.5px;
  fill: var(--ink);
}

.chart :deep(.y-axis line) {
  stroke: var(--rule);
}

.legend {
  display: flex;
  gap: 1rem;
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  font-size: 0.8rem;
  color: var(--slate);
}

.swatch {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 0.35rem;
  border-radius: 1px;
}
</style>
