<template>
  <span v-if="plan || error" class="tariff-cost" :title="details">
    <template v-if="plan">
      <span v-if="cost !== null">≈ {{ money(cost) }} ·</span>
      <span>{{ rateNow }} {{ plan.currency }}/kWh</span>
    </template>
    <span v-else role="alert"> {{ tr('Tariff unavailable') }} </span>
  </span>
</template>
<script setup lang="ts">
import { tr, currentLocale, formatNumber } from '../i18n'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { billingPeriod, currentRate, estimateDailyCost, flatRate, validatePlan } from './model'
import { useLocalTariff } from './useLocalTariff'

const props = withDefaults(defineProps<{
  kwh?: number | null
  tariffScope: string
  configuredTariff?: unknown
  readOnly?: boolean
}>(), { readOnly: false })
const local = useLocalTariff(() => props.tariffScope)
const localMode = computed(() => !props.readOnly && local.mode.value === 'local')
const configured = computed(() => {
  if (props.configuredTariff == null) return { plan: null, error: '' }
  try {
    return { plan: validatePlan(props.configuredTariff), error: '' }
  } catch {
    return { plan: null, error: tr('The controller tariff is invalid. Correct its configuration.') }
  }
})
const plan = computed(() => localMode.value ? local.plan.value : configured.value.plan)
const error = computed(() => localMode.value ? local.error.value : configured.value.error)
const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => { now.value = new Date() }, 30_000)
})
onBeforeUnmount(() => { clearInterval(timer) })
const cost = computed(() => estimateDailyCost(plan.value, props.kwh))
const rateNow = computed(() => plan.value ? formatNumber(currentRate(plan.value, now.value), 4) : '')
const details = computed(() => {
  if (!plan.value) return String(error.value)
  const source = localMode.value ? tr('Local tariff · this device only') : tr('Controller tariff')
  const period = billingPeriod(plan.value, now.value)
  return [
    tr('{source}: {name}. Current rate in {zone}.', { source, name: plan.value.name, zone: plan.value.timeZone }),
    flatRate(plan.value) === null
      ? tr('Daily cost needs interval consumption; today’s total alone is insufficient for time-of-use prices.')
      : tr('Estimated energy cost when daily consumption is available; excludes taxes and other charges.'),
    period ? tr('Billing period: {start} – {end}.', { start: period.start, end: period.end }) : '',
  ].filter(Boolean).join(' ')
})
const money = (value: number) => new Intl.NumberFormat(currentLocale.value, {
  style: 'currency', currency: plan.value?.currency ?? 'USD',
}).format(value)
</script>
<style scoped>
.tariff-cost {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  gap: 4px;
  font-size: inherit;
  line-height: inherit;
  font-weight: inherit;
}
</style>
