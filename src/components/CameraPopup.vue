<template>
  <ModalDialog
    :open="visible && !!cameraEvent"
    :label="`Live camera: ${cameraEvent?.camera ?? ''}`"
    class="z-50 bg-black/80 flex items-center justify-center p-4"
    @close="close"
  >
    <div v-if="cameraEvent" class="bg-slate-900 rounded-lg overflow-hidden max-w-3xl w-full shadow-xl">
      <div class="flex items-center justify-between px-3 py-2">
        <span class="text-xs font-bold text-red-500 flex items-center gap-1">
          <Video :size="12" /> LIVE: {{ cameraEvent.camera }}
        </span>
        <button type="button" aria-label="Close camera" autofocus class="text-slate-400 hover:text-white" @click="close">✕</button>
      </div>
      <video autoplay controls class="w-full h-full" :src="cameraEvent.url">
        Your browser does not support the video tag.
      </video>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
import ModalDialog from './ModalDialog.vue'
import { Video } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { state } from '../composables/useInverterState'

const visible = ref(false)
// Latest event wins; re-showing on a new URL keeps the popup fresh.
const cameraEvent = computed(() => state.value.camera_event ?? null)

watch(
  () => cameraEvent.value?.url,
  (url) => {
    if (url) visible.value = true
  }
)

function close() {
  visible.value = false
}

defineExpose({ close })
</script>
