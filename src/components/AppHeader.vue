<template>
  <div class="classic-card mb-1.5 p-1 flex items-center gap-1 w-full">
    <div class="flex flex-wrap gap-0.5 items-center flex-1">
      <template v-if="readOnly">
        <span class="classic-status text-[9px] font-bold uppercase tracking-tight opacity-80"
          >PUBLIC · READ-ONLY</span
        >
        <span
          v-if="essText"
          class="classic-status"
          :class="{ 'classic-status-on': essClass === 'on' }"
          ><Zap :size="7" /> {{ essText.toUpperCase() }}</span
        >
      </template>
      <template v-else>
        <button
          type="button"
          class="classic-btn min-w-[28px]"
          :class="{ 'classic-btn-on': dryRun }"
          @click="$emit('send', 'dry_run')"
        >
          <FlaskConical :size="7" /> DRY
        </button>

        <button
          type="button"
          class="classic-btn min-w-[45px]"
          :class="{ 'classic-btn-on': essClass === 'on' }"
          @click="$emit('send', 'ess_mode')"
        >
          <Zap :size="7" /> {{ essText.toUpperCase() }}
        </button>

        <template v-if="showHeaderToggles !== false && headerToggles.length > 0">
          <div class="w-px h-3 bg-slate-300 mx-0.5"></div>

          <button
            type="button"
            v-for="toggle in headerToggles"
            :key="toggle.id"
            class="classic-btn min-w-[55px]"
            :class="{ 'classic-btn-on': toggleStates?.[toggle.id] === 'on' }"
            @click="
              $emit('send', 'toggle', {
                entity: inverterControlFlagKey(toggle.entity) || toggle.entity,
              })
            "
          >
            {{ toggle.label.toUpperCase() }}
          </button>
        </template>
      </template>
    </div>

    <button
      v-if="!readOnly"
      type="button"
      class="classic-btn min-w-[20px]"
      aria-label="Settings"
      @click="$emit('open-settings')"
    >
      <Settings :size="8" />
    </button>
    <button type="button" class="classic-btn min-w-[20px]" @click="$emit('toggle-theme')">
      <Sun v-if="isDark" :size="8" />
      <Moon v-else :size="8" />
    </button>
    <NotificationHistory v-if="!readOnly" />
  </div>
</template>

<script setup lang="ts">
import { FlaskConical, Moon, Settings, Sun, Zap } from '@lucide/vue'
import { inverterControlFlagKey } from '../utils'
import NotificationHistory from './NotificationHistory.vue'

defineProps<{
  dryRun: boolean
  essClass: string
  essText: string
  headerToggles: Array<{ id: string; label: string; entity: string }>
  toggleStates: Record<string, string> | undefined
  isDark: boolean
  showHeaderToggles?: boolean
  /** Public / here.now: status display only — no command buttons. */
  readOnly?: boolean
}>()

defineEmits<{
  send: [action: string, payload?: Record<string, unknown>]
  'toggle-theme': []
  'open-settings': []
}>()
</script>
