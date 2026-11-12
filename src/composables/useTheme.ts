import { readonly, ref } from 'vue'

const STORAGE_KEY = 'utilitario-patrimonio-theme'

const isDark = ref(false)
let initialized = false

function applyTheme(value: boolean): void {
  isDark.value = value

  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('dark', value)
  document.documentElement.style.colorScheme = value ? 'dark' : 'light'

  try {
    localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light')
  } catch {
    // A preferência continua válida durante a sessão mesmo sem armazenamento local.
  }
}

function initializeTheme(): void {
  if (initialized || typeof window === 'undefined') {
    return
  }

  initialized = true

  try {
    const savedTheme = localStorage.getItem(STORAGE_KEY)
    const shouldUseDark =
      savedTheme === 'dark' ||
      (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)

    isDark.value = shouldUseDark
    document.documentElement.classList.toggle('dark', shouldUseDark)
    document.documentElement.style.colorScheme = shouldUseDark ? 'dark' : 'light'
  } catch {
    isDark.value = false
  }
}

/**
 * Controla o tema claro/escuro compartilhado por toda a aplicação.
 */
export function useTheme() {
  initializeTheme()

  const toggleTheme = (): void => {
    applyTheme(!isDark.value)
  }

  return {
    isDark: readonly(isDark),
    toggleTheme,
  }
}
