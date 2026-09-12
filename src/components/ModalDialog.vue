<template>
  <dialog
    v-if="open"
    ref="dialog"
    :aria-label="label"
    class="fixed inset-0 m-0 h-full w-full max-h-none max-w-none border-0 p-0"
    @click.self="emit('close')"
    @keydown.esc.prevent="emit('close')"
    @cancel.prevent="emit('close')"
  >
    <slot />
  </dialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

defineProps<{ open: boolean; label: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)

// Native modal dialogs contain keyboard focus, make the background inert,
// and restore focus to the opener when closed.
watch(dialog, (current, previous) => {
  if (previous?.open) previous.close()
  if (current && !current.open) current.showModal()
}, { flush: 'post' })
onBeforeUnmount(() => dialog.value?.close())
</script>
