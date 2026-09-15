<template>
  <div v-if="rows.length" class="classic-card mb-1 overflow-hidden" data-testid="active-loads">
    <div class="classic-header py-0 px-2 flex items-center gap-1.5 h-[22px]">
      <Zap :size="10" /> Active Loads
    </div>
    <div class="divide-y divide-slate-50 dark:divide-slate-800/30">
      <div
        v-for="load in rows"
        :key="load.id"
        data-testid="active-load"
        class="flex justify-between items-center px-2 py-0.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
      >
        <span
          class="text-[11px] font-medium text-slate-600 dark:text-slate-400 capitalize tracking-tight"
          >{{ load.name }}</span
        >
        <span class="text-[11px] font-bold" :class="load.isGeneration ? 'text-battery' : 'text-slate-700 dark:text-slate-300'"
          >{{ Math.floor(load.value) }}W</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Zap } from '@lucide/vue'
import { computed } from 'vue'
import type { ActiveLoad } from '../nativeSections'

const props = defineProps<{
  loads?: ActiveLoad[]
  /** Compatibility for library consumers; the app uses native instance identities. */
  sortedLoads?: Array<[string, number]>
}>()
const rows = computed(() => props.loads ?? (props.sortedLoads ?? []).map(([name, value]) => ({
  id: name, name: name.replace(/_/g, ' '), value, isGeneration: value < 0,
})))
</script>
