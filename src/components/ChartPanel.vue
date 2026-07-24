<template>
  <div class="classic-card h-full overflow-hidden">
    <VChart class="chart-wrap w-full" :option="chartOption" :autoresize="true" />
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
import VChart from 'vue-echarts'

// Register ECharts components
use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent])

defineProps<{
  chartOption: any
}>()
</script>

<style scoped>
.chart-wrap {
  min-height: 250px; /* Reduced height to match old versions and improve density */
}
</style>
