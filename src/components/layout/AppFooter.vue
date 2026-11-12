<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'

const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 dark:text-slate-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div class="flex items-center gap-2">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-900 text-gold-400">
          <AppIcon name="shield" :size="16" />
        </span>
        <span>
          <strong class="font-semibold text-slate-700 dark:text-slate-200">Polícia Civil do Estado do Pará</strong>
          <span class="mx-1.5 text-slate-300 dark:text-slate-700">•</span>
          Utilitário de Patrimônio
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span class="inline-flex items-center gap-1.5">
          <AppIcon name="lock" :size="13" />
          Processamento 100% local no navegador
        </span>
        <span class="text-slate-300 dark:text-slate-700">|</span>
        <span>{{ currentYear }}</span>
      </div>
    </div>
  </footer>
</template>
