<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import AppIcon from '@/components/ui/AppIcon.vue'

const route = useRoute()
const { isDark, toggleTheme } = useTheme()

const navigation = [
  {
    label: 'Formatador de RPs',
    description: 'Organize e confira listas de RPs',
    to: '/',
    icon: 'copy' as const,
  },
  {
    label: 'Termo Merge',
    description: 'Cruze o termo com o laudo e gere o DOCX',
    to: '/termo-merge',
    icon: 'sparkles' as const,
  },
]

const isCurrentRoute = (path: string): boolean => route.path === path

const themeLabel = computed(() => (isDark.value ? 'Ativar tema claro' : 'Ativar tema escuro'))
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
    <div class="bg-brand-950 text-white">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100 sm:px-6 lg:px-8">
        <span>Estado do Pará</span>
        <span class="hidden sm:inline">Polícia Civil do Estado do Pará</span>
        <span>Utilitário de Patrimônio</span>
      </div>
    </div>

    <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div class="flex items-center justify-between gap-4">
        <RouterLink to="/" class="focus-ring flex min-w-0 items-center gap-3 rounded-xl">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-gold-400 shadow-sm ring-1 ring-brand-800/20 dark:bg-brand-800">
            <AppIcon name="shield" :size="26" :stroke-width="1.6" />
          </span>
          <span class="min-w-0">
            <span class="block truncate text-base font-bold leading-tight text-brand-950 dark:text-white sm:text-lg">
              Utilitário de Patrimônio
            </span>
            <span class="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              Polícia Civil do Estado do Pará
            </span>
          </span>
        </RouterLink>

        <button
          type="button"
          class="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-600 dark:hover:text-white lg:hidden"
          :aria-label="themeLabel"
          :title="themeLabel"
          @click="toggleTheme"
        >
          <AppIcon :name="isDark ? 'sun' : 'moon'" :size="18" />
        </button>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
        <nav aria-label="Ferramentas" class="grid grid-cols-1 gap-2 sm:flex sm:items-center">
          <RouterLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="focus-ring group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:px-3.5"
            :class="
              isCurrentRoute(item.to)
                ? 'bg-brand-900 text-white shadow-sm dark:bg-brand-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-brand-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'
            "
            :aria-current="isCurrentRoute(item.to) ? 'page' : undefined"
          >
            <AppIcon
              :name="item.icon"
              :size="18"
              class="shrink-0"
              :class="isCurrentRoute(item.to) ? 'text-gold-400' : 'text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-300'"
            />
            <span class="flex flex-col leading-tight">
              <span>{{ item.label }}</span>
              <span
                class="hidden text-[10px] font-medium sm:block"
                :class="isCurrentRoute(item.to) ? 'text-brand-100' : 'text-slate-400 dark:text-slate-500'"
              >
                {{ item.description }}
              </span>
            </span>
          </RouterLink>
        </nav>

        <button
          type="button"
          class="focus-ring hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-600 dark:hover:text-white lg:flex"
          :aria-label="themeLabel"
          :title="themeLabel"
          @click="toggleTheme"
        >
          <AppIcon :name="isDark ? 'sun' : 'moon'" :size="18" />
        </button>
      </div>
    </div>
  </header>
</template>
