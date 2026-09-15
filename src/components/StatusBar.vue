<template>
  <div
    class="flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-slate-500 mt-1.5 pb-1"
    data-testid="status-bar"
  >
    <div v-if="haEnabled" class="flex items-center gap-1">
      <div
        class="w-1.5 h-1.5 rounded-full shadow-inner transition-colors ring-1 ring-slate-400 dark:ring-slate-500"
        :class="haConnected ? 'bg-green-500' : 'bg-slate-500 dark:bg-slate-700'"
      ></div>
      <span>{{ $t('status.ha') }}</span>
    </div>

    <span v-if="haEnabled" class="opacity-30 mx-0.5">|</span>

    <div class="flex items-center gap-1" data-testid="uptime">
      <span class="text-slate-500 dark:text-slate-500">{{ $t('status.uptime') }}:</span>
      <span class="text-slate-500 dark:text-white">{{ uptime === undefined ? '—' : formatUptime(uptime) }}</span>
    </div>

    <span class="opacity-30 mx-0.5">|</span>

    <div class="flex items-center gap-1" data-testid="transport-status"
      :data-connected="mqttConnected" :title="$t(mqttConnected ? 'status.connected' : 'status.disconnected')">
      <div
        class="w-1.5 h-1.5 rounded-full shadow-inner transition-colors ring-1 ring-slate-400 dark:ring-slate-500"
        :class="mqttConnected ? 'bg-green-500' : 'bg-slate-500 dark:bg-slate-700'"
      ></div>
      <span class="text-slate-500 dark:text-white">{{ dataSource === 'igw' ? 'IGW' : $t('status.mqtt') }}</span>
    </div>

    <span class="opacity-30 mx-0.5">|</span>
    <span data-testid="telemetry-quality" role="status" :title="telemetryTitle"
      :class="quality === 'live' ? 'text-slate-500' : 'text-orange-500'">
      {{ $t(`status.telemetry${quality}`) }}
    </span>

    <span class="opacity-30 mx-0.5">|</span>
    <span class="text-slate-500 dark:text-slate-500 font-medium">
      {{ $t('status.desktop') }} {{ appVersion }}
    </span>

    <span v-if="stateVersion" class="opacity-30 mx-0.5">|</span>
    <span v-if="stateVersion" class="text-slate-500 dark:text-slate-500 font-medium">
      {{ $t('status.control') }} {{ stateVersion }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import type { InverterState } from '../composables/useInverterState'
import { formatUptime } from '../utils'

const { t: $t } = useI18n()

const props = defineProps<{
  haEnabled: boolean
  haConnected: boolean
  mqttConnected: boolean
  dataSource?: string
  telemetry?: InverterState['telemetry']
  haMqttConnected?: boolean | null
  uptime?: number
  appVersion: string
  stateVersion?: string
}>()

const quality = computed(() => {
  const value = props.telemetry?.quality
  if (value === 'live' && !props.mqttConnected) return 'stale'
  return value === 'live' || value === 'stale' ? value : 'unknown'
})
const telemetryTitle = computed(() => {
  const source = props.telemetry?.source?.toUpperCase()
  const observed = props.telemetry?.observed_at
  const timestamp = observed == null ? undefined : new Date(observed)
  const received = timestamp && Number.isFinite(timestamp.getTime())
    ? `${$t('status.receivedAt')}: ${timestamp.toLocaleString()}`
    : $t('status.telemetryunknown')
  const parts = [source, received]
  if (props.telemetry?.timestamp_source === 'local_receipt') parts.push($t('status.localReceipt'))
  if (props.telemetry?.timestamp_source === 'gateway_observation') parts.push($t('status.gatewayObservation'))
  return parts.filter(Boolean).join(' · ')
})
</script>
