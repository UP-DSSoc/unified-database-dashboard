import { onBeforeUnmount, onMounted, ref } from 'vue'

// Charts are drawn to the width the container actually gets, so the grid can
// reflow without the SVG scaling its text.
export function useChartSize(fallback = 560) {
  const host = ref(null)
  const width = ref(fallback)
  let observer

  onMounted(() => {
    if (!host.value) return
    observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) width.value = w
    })
    observer.observe(host.value)
  })

  onBeforeUnmount(() => observer?.disconnect())

  return { host, width }
}

export const CHART_COLORS = ['#7b1113', '#0f4a34', '#3e5c76', '#b8842b', '#6b5b95', '#4c5654']
