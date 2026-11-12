<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { MergeResult } from '../types/asset'

const props = defineProps<{
  mergeResult: MergeResult
}>()

const validation = computed(() => props.mergeResult.validation)
const metadata = computed(() => props.mergeResult.metadata)

const fallbackCount = computed(
  () => props.mergeResult.records.filter((record) => record.recommendationMissing).length,
)

const metadataItems = computed(() => [
  {
    label: 'Nº do Termo',
    value: metadata.value.termNumber || 'Não identificado',
  },
  {
    label: 'Data do documento',
    value: metadata.value.date || 'Não identificada',
  },
  {
    label: 'Chefia da Unidade de Patrimônio',
    value: metadata.value.unitChiefName || 'Não identificada',
  },
  {
    label: 'Titular do Órgão',
    value: metadata.value.agencyHeadName || 'Não identificado',
  },
])

const countItems = computed(() => [
  {
    label: 'Itens no Termo',
    value: validation.value.termoCount,
    tone: 'brand',
  },
  {
    label: 'Registros no Laudo',
    value: validation.value.laudoCount,
    tone: 'brand',
  },
  {
    label: 'RPs cruzados',
    value: validation.value.matchedCount,
    tone: 'success',
  },
  {
    label: 'Com fallback',
    value: fallbackCount.value,
    tone: fallbackCount.value > 0 ? 'warning' : 'neutral',
  },
])

const divergenceMessages = computed(() => {
  const messages: string[] = []

  if (validation.value.termoCount !== validation.value.laudoCount) {
    messages.push(
      `O Termo possui ${validation.value.termoCount} itens e o Laudo possui ${validation.value.laudoCount} registros.`,
    )
  }

  if (validation.value.missingRps.length > 0) {
    messages.push(
      `${validation.value.missingRps.length} RP(s) do Termo não foram localizados no Laudo. A recomendação padrão INCINERAÇÃO foi aplicada nesses itens.`,
    )
  }

  if (validation.value.extraRps.length > 0) {
    messages.push(
      `${validation.value.extraRps.length} RP(s) do Laudo não existem no Termo e foram desconsiderados no cruzamento.`,
    )
  }

  if (validation.value.duplicateTermoRps.length > 0) {
    messages.push(
      `Há RP(s) repetido(s) no Termo: ${validation.value.duplicateTermoRps.join(', ')}.`,
    )
  }

  if (validation.value.duplicateLaudoRps.length > 0) {
    messages.push(
      `Há RP(s) repetido(s) no Laudo: ${validation.value.duplicateLaudoRps.join(', ')}. A primeira ocorrência foi usada.`,
    )
  }

  return messages
})
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
      <div class="flex items-center gap-2">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
          <AppIcon name="table" :size="17" />
        </span>
        <div>
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">Resumo da validação</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Dados identificados nos dois arquivos e conferência dos RPs.
          </p>
        </div>
      </div>
    </div>

    <div class="space-y-5 p-5 sm:p-6">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="item in metadataItems"
          :key="item.label"
          class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950"
        >
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {{ item.label }}
          </p>
          <p class="mt-1 break-words text-sm font-semibold leading-5 text-slate-800 dark:text-slate-100">
            {{ item.value }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          v-for="item in countItems"
          :key="item.label"
          class="rounded-xl border p-3.5"
          :class="
            item.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30'
              : item.tone === 'warning'
                ? 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
          "
        >
          <p
            class="text-[10px] font-bold uppercase tracking-wider"
            :class="
              item.tone === 'success'
                ? 'text-emerald-700 dark:text-emerald-300'
                : item.tone === 'warning'
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-slate-500 dark:text-slate-400'
            "
          >
            {{ item.label }}
          </p>
          <p
            class="mt-1 text-2xl font-bold tabular-nums"
            :class="
              item.tone === 'success'
                ? 'text-emerald-700 dark:text-emerald-300'
                : item.tone === 'warning'
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-slate-900 dark:text-white'
            "
          >
            {{ item.value }}
          </p>
        </div>
      </div>

      <div
        v-if="validation.hasDivergence"
        class="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/30"
        role="alert"
        aria-live="polite"
      >
        <div class="flex items-start gap-2.5">
          <AppIcon name="alert" :size="19" class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div class="min-w-0">
            <p class="text-sm font-bold text-amber-900 dark:text-amber-100">
              Divergência encontrada entre os arquivos
            </p>
            <ul class="mt-2 space-y-1.5 text-xs leading-5 text-amber-800 dark:text-amber-200">
              <li v-for="message in divergenceMessages" :key="message" class="flex gap-2">
                <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                <span>{{ message }}</span>
              </li>
            </ul>

            <div
              v-if="validation.missingRps.length > 0"
              class="mt-3 flex flex-wrap gap-1.5"
              aria-label="RPs sem correspondência no laudo"
            >
              <span
                v-for="rp in validation.missingRps"
                :key="rp"
                class="rounded-md bg-white px-2 py-1 font-mono text-[11px] font-bold text-amber-800 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800"
              >
                {{ rp }}
              </span>
            </div>

            <div
              v-if="validation.extraRps.length > 0"
              class="mt-3 flex flex-wrap gap-1.5"
              aria-label="RPs do laudo sem correspondência no termo"
            >
              <span
                v-for="rp in validation.extraRps"
                :key="rp"
                class="rounded-md bg-white px-2 py-1 font-mono text-[11px] font-bold text-slate-600 ring-1 ring-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
              >
                {{ rp }}
              </span>
            </div>

            <p class="mt-3 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
              Confira os RPs destacados na pré-visualização antes de gerar o DOCX. A recomendação
              INCINERAÇÃO é usada apenas como fallback para os itens sem correspondência.
            </p>
          </div>
        </div>
      </div>

      <div
        v-else
        class="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
        role="status"
        aria-live="polite"
      >
        <AppIcon name="check" :size="18" />
        Os dois arquivos possuem os mesmos RPs. Nenhuma pendência de conferência.
      </div>
    </div>
  </section>
</template>
