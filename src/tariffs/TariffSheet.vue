<template>
  <section ref="container" class="tariff-sheet" :aria-label="tr('Weekly electricity rates')" />
</template>
<script setup lang="ts">
import { localized, type DisplayText, localizedError } from '../i18n/messages'
import { tr, formatDate, currentLocale } from '../i18n'
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { createUniver, LocaleType } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import enUS from '@univerjs/preset-sheets-core/locales/en-US'
import deDE from '@univerjs/preset-sheets-core/locales/de-DE'
import frFR from '@univerjs/preset-sheets-core/locales/fr-FR'
import ruRU from '@univerjs/preset-sheets-core/locales/ru-RU'
import '@univerjs/preset-sheets-core/lib/index.css'
import { DAYS, SLOTS, slotLabel, type RateGrid } from './model'

const props = defineProps<{ rates: RateGrid }>()
const container = ref<HTMLElement | null>(null)
const headers = [tr('Local time'), ...DAYS.map((_, day) => formatDate(new Date(Date.UTC(2024, 0, 1 + day)), { weekday: 'long', timeZone: 'UTC' }))]
let runtime: ReturnType<typeof createUniver> | undefined
const emit = defineEmits<{ error: [message: DisplayText] }>()

onMounted(() => {
  if (!container.value) return
  try {
    runtime = createUniver({
      locale: ({ de: LocaleType.DE_DE, fr: LocaleType.FR_FR, ru: LocaleType.RU_RU } as Partial<Record<string, LocaleType>>)[currentLocale.value] ?? LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: enUS, [LocaleType.DE_DE]: deDE, [LocaleType.FR_FR]: frFR, [LocaleType.RU_RU]: ruRU },
      presets: [
        UniverSheetsCorePreset({
          container: container.value,
          header: false,
          toolbar: false,
          formulaBar: false,
          footer: false,
          contextMenu: false,
        }),
      ],
    })
    const workbook = runtime.univerAPI.createWorkbook({
      id: 'electricity-tariff',
      name: tr('Weekly rates'),
      sheetOrder: ['week'],
      sheets: {
        week: {
          id: 'week',
          name: tr('Weekly rates'),
          rowCount: SLOTS + 1,
          columnCount: 8,
          defaultColumnWidth: 105,
          defaultRowHeight: 28,
          columnData: { 0: { w: 150 } },
          freeze: { startRow: 1, startColumn: 1, xSplit: 1, ySplit: 1 },
        },
      },
    })
    workbook
      .getActiveSheet()
      .getRange(0, 0, SLOTS + 1, 8)
      .setValues([
        headers,
        ...props.rates.map((row, slot) => [slotLabel(slot), ...row.map((rate) => rate ?? '')]),
      ])
  } catch {
    emit('error', localized('The spreadsheet could not be opened. Close the editor and try again.'))
  }
})
onBeforeUnmount(() => runtime?.univer.dispose())

async function getRates(): Promise<RateGrid> {
  const workbook = runtime?.univerAPI.getActiveWorkbook()
  if (!workbook) throw localizedError('The spreadsheet is still loading.')
  await workbook.endEditingAsync(true)
  const snapshot = workbook.save()
  if (snapshot.sheetOrder.length !== 1 || snapshot.sheetOrder[0] !== 'week')
    throw localizedError('Keep the single weekly tariff sheet.')
  const data = snapshot.sheets.week.cellData ?? {}
  if (headers.some((label, column) => data[0]?.[column]?.v !== label))
    throw localizedError('Keep the original day headings and edit only the rate cells.')
  return Array.from({ length: SLOTS }, (_, slot) => {
    if (data[slot + 1]?.[0]?.v !== slotLabel(slot))
      throw localizedError('Keep the original time labels and edit only the rate cells.')
    return DAYS.map((_, day) => {
      const cell = data[slot + 1]?.[day + 1]
      if (cell?.f || cell?.p)
        throw localizedError('Enter numeric prices directly; formulas and rich text are not tariff rates.')
      if (cell?.v === undefined || cell.v === null || cell.v === '') return null
      if (typeof cell.v !== 'number')
        throw localizedError('Enter a numeric price for {day}, {time}.', { day: headers[day + 1], time: slotLabel(slot) })
      return cell.v
    })
  })
}
defineExpose({ getRates })
</script>
<style scoped>
.tariff-sheet {
  height: 440px;
  min-height: 300px;
  width: 100%;
  color: #20252b;
  background: white;
}
</style>
