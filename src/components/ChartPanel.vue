<template>
  <div class="classic-card h-full overflow-hidden relative">
    <VChart class="chart-wrap w-full" :option="chartOption" :autoresize="true" />
    <div
      v-if="isEmpty"
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-slate-400"
    >
      Waiting for history…
    </div>
  </div>
</template>

<script setup lang="ts">
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'

// Register ECharts components
use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent])

const props = defineProps<{
  chartOption: any
}>()

const isEmpty = computed(() => {
  const series = props.chartOption?.series
  if (!Array.isArray(series) || series.length === 0) return true
  return series.every((s: { data?: unknown[] }) => !s.data || s.data.length === 0)
})
</script>

<style scoped>
.chart-wrap {
  min-height: 250px; /* Reduced height to match old versions and improve density */
}
</style>
