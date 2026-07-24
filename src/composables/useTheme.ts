import { ref } from 'vue'

export function useTheme() {
  const isDark = ref(localStorage.getItem('theme') === 'dark')

  const syncTheme = (dark: boolean) => {
    document.documentElement.classList.toggle('dark', dark)
    document.body.classList.toggle('dark', dark)
  }

  syncTheme(isDark.value)

  function toggleTheme() {
    isDark.value = !isDark.value
    syncTheme(isDark.value)
    const scheme = isDark.value ? 'dark' : 'light'
    localStorage.setItem('theme', scheme)
  }

  return { isDark, toggleTheme }
}
