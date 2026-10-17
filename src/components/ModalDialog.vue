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
let opener: HTMLElement | null = null

function closeDialog(previous: HTMLDialogElement | null) {
  previous?.close()
  // v-if removes the dialog before the post-flush watcher runs, so browsers
  // cannot reliably restore focus through the native close algorithm alone.
  const target = opener
  opener = null
  if (target?.isConnected) target.focus({ preventScroll: true })
}

// Native modal dialogs contain keyboard focus and make the background inert.
watch(dialog, (current, previous) => {
  if (previous) closeDialog(previous)
  if (current && !current.open) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    current.showModal()
  }
}, { flush: 'post' })
onBeforeUnmount(() => closeDialog(dialog.value))
</script>
