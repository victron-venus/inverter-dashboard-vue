<template>
  <section :aria-label="tr('Electricity tariff')" class="tariff-settings">
    <h2> {{ tr('Electricity tariff') }} </h2>
    <span v-if="cost !== null" :title="tr('Estimated energy cost; excludes taxes and other charges')"
      >≈ {{ money(cost) }}</span
    >
    <button
      v-if="!readOnly && (localMode || controllerWritable)"
      type="button"
      class="tariff-open"
      :disabled="!localMode && !controllerWritable"
      @click="openEditor"
    >
      {{ plan ? tr('Edit tariff') : tr('Set tariff') }}
    </button>
    <span
      v-if="plan && cost === null"
      :title="tr('Time-of-use daily cost needs interval consumption; today’s total alone is insufficient.')"
      >{{ rateNow }} {{ plan.currency }}/kWh {{ tr('now') }}</span
    >
    <span
      v-if="period"
      :title="tr('Billing period in {zone}; energy invoice total requires interval data.', { zone: plan?.timeZone ?? '' })"
    > {{ tr('Billing period:') }} {{ period.start }} – {{ period.end }}
    </span>
    <span v-if="plan">{{
      localMode ? tr('Local tariff · this device only') : tr('Controller tariff')
    }}</span>
    <button v-if="!readOnly" type="button" class="tariff-open" @click="toggleMode">
      {{ localMode ? tr('Use controller tariff') : tr('Use a local tariff on this device') }}
    </button>
    <span v-if="!plan && !localMode"> {{ tr('No controller tariff configured') }} </span>
    <button
      v-if="plan && !readOnly"
      type="button"
      class="tariff-open"
      @click="intervalsOpen = true"
    > {{ tr('Interval energy cost') }} </button>
    <IntervalEnergy
      @keydown.esc.stop
      v-if="plan && intervalsOpen && !readOnly"
      :plan="plan"
      :tariff-scope="tariffScope"
      @close="intervalsOpen = false"
    />
    <span v-if="error" role="alert">{{ error }}</span>
    <TariffEditor
      @keydown.esc.stop
      v-if="editorOpen && !readOnly"
      :plan="plan"
      :tariff-scope="tariffScope"
      :persist="localMode"
      :save-plan="localMode ? undefined : saveRemote"
      :clear-label="localMode ? tr('Clear local tariff') : tr('Clear controller tariff')"
      @saved="saved"
      @close="editorOpen = false"
    />
  </section>
</template>
<script setup lang="ts">
import { errorText, type DisplayText } from '../i18n/messages'

import { localizedError } from '../i18n/messages'
import { tr, currentLocale, formatNumber } from '../i18n'
import { computed, defineAsyncComponent, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import {
  billingPeriod,
  currentRate,
  estimateDailyCost,
  validatePlan,
  type TariffPlan,
} from './model'
import { setTariffMode, useLocalTariff } from './useLocalTariff'
const props = withDefaults(
  defineProps<{
    kwh?: number | null
    tariffScope: string
    readOnly?: boolean
    configuredTariff?: unknown
    controllerWritable?: boolean
    controllerRevision?: string
    savePlan?: (plan: TariffPlan | null, revision: string) => Promise<void>
  }>(),
  {
    readOnly: false,
  }
)
const TariffEditor = defineAsyncComponent(() => import('./TariffEditor.vue'))
const editorOpen = ref(false)
const local = useLocalTariff(() => props.tariffScope)
const localMode = computed(() => local.mode.value === 'local')
const actionError = ref<DisplayText>('')
function toggleMode() {
  try {
    setTariffMode(props.tariffScope, localMode.value ? 'controller' : 'local')
    actionError.value = ''
  } catch (cause) {
    actionError.value = errorText(cause, 'Tariff preference could not be saved.')
  }
}
const editorRevision = ref('')
const intervalsOpen = ref(false)
const IntervalEnergy = defineAsyncComponent(() => import('./IntervalEnergy.vue'))

const configured = computed(() => {
  if (props.configuredTariff == null) return { plan: null, error: '' }
  try {
    return { plan: validatePlan(props.configuredTariff), error: '' }
  } catch {
    return {
      plan: null,
      error: tr('The controller tariff is invalid. Correct its configuration.'),
    }
  }
})
const plan = computed(() => (localMode.value ? local.plan.value : configured.value.plan))
const error = computed(() => actionError.value || (localMode.value ? local.error.value : configured.value.error))
const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | undefined
watch([() => props.tariffScope, localMode], () => {
  editorOpen.value = false
  intervalsOpen.value = false
  actionError.value = ''
})
onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 30_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
const period = computed(() => (plan.value ? billingPeriod(plan.value, now.value) : null))
const cost = computed(() => estimateDailyCost(plan.value, props.kwh))
const rateNow = computed(() => (plan.value ? formatNumber(currentRate(plan.value, now.value), 4) : ''))
const money = (value: number) =>
  new Intl.NumberFormat(currentLocale.value, {
    style: 'currency',
    currency: plan.value?.currency ?? 'USD',
  }).format(value)
function saved(_value: TariffPlan | null) {
  actionError.value = ''
  editorOpen.value = false
}
function openEditor() {
  editorRevision.value = props.controllerRevision ?? ''
  editorOpen.value = true
}
async function saveRemote(value: TariffPlan | null) {
  if (!props.savePlan || !editorRevision.value)
    throw localizedError('Controller tariff editing is unavailable')
  await props.savePlan(value, editorRevision.value)
}
</script>
<style scoped>
.tariff-settings {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
}
.tariff-open {
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
</style>
