<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { MergedAssetRecord } from '../types/asset'

const props = defineProps<{
  records: MergedAssetRecord[]
}>()

const showOnlyPending = ref(false)

const pendingCount = computed(
  () => props.records.filter((record) => record.recommendationMissing).length,
)

const visibleRecords = computed(() => {
  if (!showOnlyPending.value) {
    return props.records
  }

  return props.records.filter((record) => record.recommendationMissing)
})

const itemCountLabel = computed(() => {
  const total = props.records.length
  return `${total} ${total === 1 ? 'item' : 'itens'}`
})
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div class="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div class="flex items-center gap-2">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
          <AppIcon name="table" :size="17" />
        </span>
        <div>
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">Pré-visualização do cruzamento</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Confira os dados antes de gerar o arquivo institucional.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {{ itemCountLabel }}
        </span>

        <button
          v-if="pendingCount > 0"
          type="button"
          class="focus-ring inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition"
          :class="
            showOnlyPending
              ? 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'
              : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-amber-800 dark:hover:text-amber-300'
          "
          :aria-pressed="showOnlyPending"
          @click="showOnlyPending = !showOnlyPending"
        >
          <AppIcon name="alert" :size="13" />
          Somente pendências ({{ pendingCount }})
        </button>
      </div>
    </div>

    <div class="scrollbar-thin max-h-[70vh] overflow-auto">
      <table class="w-full min-w-[900px] border-collapse text-left text-xs">
        <caption class="sr-only">
          Tabela com os itens do Termo de Baixa cruzados com as recomendações do Laudo de Avaliação.
        </caption>
        <thead class="sticky top-0 z-10 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
          <tr>
            <th scope="col" class="w-20 border-b border-slate-200 px-4 py-3 text-center dark:border-slate-700">
              Nº
            </th>
            <th scope="col" class="w-32 border-b border-slate-200 px-4 py-3 text-center dark:border-slate-700">
              Nº do RP
            </th>
            <th scope="col" class="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              Descrição do bem
            </th>
            <th scope="col" class="w-40 border-b border-slate-200 px-4 py-3 text-center dark:border-slate-700">
              Situação do bem
            </th>
            <th scope="col" class="w-44 border-b border-slate-200 px-4 py-3 text-center dark:border-slate-700">
              Recomendação
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr
            v-for="record in visibleRecords"
            :key="`${record.order}-${record.rp}`"
            class="transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
            :class="
              record.recommendationMissing
                ? 'bg-amber-50/70 dark:bg-amber-950/20'
                : 'bg-white dark:bg-slate-900'
            "
          >
            <td class="px-4 py-3 text-center font-semibold tabular-nums text-slate-500 dark:text-slate-400">
              {{ record.order }}
            </td>
            <td class="px-4 py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-100">
              {{ record.rp }}
            </td>
            <td class="px-4 py-3 leading-5 text-slate-700 dark:text-slate-200">
              {{ record.description }}
            </td>
            <td class="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
              {{ record.situation }}
            </td>
            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex flex-col items-center gap-1 font-bold"
                :class="
                  record.recommendationMissing
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                "
              >
                {{ record.recommendation }}
                <span
                  v-if="record.recommendationMissing"
                  class="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800"
                >
                  fallback
                </span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="visibleRecords.length === 0"
        class="flex flex-col items-center justify-center px-6 py-12 text-center"
      >
        <span class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
          <AppIcon name="check" :size="22" />
        </span>
        <p class="text-sm font-bold text-slate-800 dark:text-slate-100">
          Nenhuma pendência para conferir
        </p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Todos os itens possuem recomendação localizada no laudo.
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 sm:px-6">
      <span class="inline-flex items-center gap-1.5">
        <span class="h-2 w-2 rounded-full bg-amber-400" />
        Linhas em amarelo usam a recomendação padrão INCINERAÇÃO.
      </span>
      <span class="inline-flex items-center gap-1.5">
        <AppIcon name="lock" :size="12" />
        Nenhum arquivo é enviado para servidores.
      </span>
    </div>
  </section>
</template>
