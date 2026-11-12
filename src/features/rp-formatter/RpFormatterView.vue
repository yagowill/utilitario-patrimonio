<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatRpInput } from './services/rpFormatter'

const rawInput = ref('')
const copyStatus = ref<'idle' | 'copied' | 'error'>('idle')
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined

const result = computed(() => formatRpInput(rawInput.value))
const hasInput = computed(() => result.value.totalCount > 0)

const copyButtonLabel = computed(() => {
  if (copyStatus.value === 'copied') {
    return 'Copiado!'
  }

  if (copyStatus.value === 'error') {
    return 'Não foi possível copiar'
  }

  return 'Copiar'
})

function clearFeedbackTimer(): void {
  if (copyFeedbackTimer) {
    clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = undefined
  }
}

function scheduleFeedbackReset(): void {
  clearFeedbackTimer()
  copyFeedbackTimer = setTimeout(() => {
    copyStatus.value = 'idle'
  }, 2500)
}

async function copyFormattedRps(): Promise<void> {
  if (!result.value.formatted) {
    return
  }

  try {
    await navigator.clipboard.writeText(result.value.formatted)
    copyStatus.value = 'copied'
    rawInput.value = ''
  } catch {
    copyStatus.value = 'error'
  }

  scheduleFeedbackReset()
}

function clearAll(): void {
  rawInput.value = ''
  copyStatus.value = 'idle'
  clearFeedbackTimer()
}

onBeforeUnmount(clearFeedbackTimer)
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
    <section class="mb-8">
      <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200">
        <AppIcon name="copy" :size="14" />
        Ferramenta de apoio
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-brand-950 dark:text-white sm:text-4xl">
        Formatador de RPs
      </h1>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
        Cole a lista de registros patrimoniais copiada da planilha. A ferramenta remove os repetidos,
        mostra a contagem e devolve os RPs no formato separado por vírgulas para consulta no sistema.
      </p>
    </section>

    <div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <label for="rp-input" class="block text-sm font-bold text-slate-800 dark:text-slate-100">
              RPs para formatar
            </label>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Separe os números por espaço, vírgula ou quebra de linha.
            </p>
          </div>
          <button
            v-if="hasInput"
            type="button"
            class="focus-ring shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            @click="clearAll"
          >
            Limpar
          </button>
        </div>

        <textarea
          id="rp-input"
          v-model="rawInput"
          rows="9"
          autocomplete="off"
          spellcheck="false"
          class="focus-ring scrollbar-thin w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-sm leading-6 text-slate-800 placeholder:font-sans placeholder:text-slate-400 transition focus:border-brand-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:bg-slate-950"
          placeholder="Ex.: 069801 69657 069801 12345 69657"
          aria-describedby="rp-input-help"
        />
        <p id="rp-input-help" class="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Zeros à esquerda são preservados. Duplicados são apenas sinalizados e removidos da saída.
        </p>

        <div class="mt-5 grid grid-cols-3 gap-3" aria-live="polite">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Informados
            </p>
            <p class="mt-1 text-xl font-bold tabular-nums text-slate-800 dark:text-white">
              {{ result.totalCount }}
            </p>
          </div>
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Únicos
            </p>
            <p class="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {{ result.uniqueCount }}
            </p>
          </div>
          <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/60 dark:bg-rose-950/40">
            <p class="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Duplicados
            </p>
            <p class="mt-1 text-xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
              {{ result.duplicateCount }}
            </p>
          </div>
        </div>
      </section>

      <section class="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Resultado formatado</h2>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Pronto para copiar e colar no sistema.
            </p>
          </div>
          <button
            type="button"
            class="focus-ring inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition"
            :class="
              copyStatus === 'error'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                : copyStatus === 'copied'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-brand-900 text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-brand-700 dark:hover:bg-brand-600'
            "
            :disabled="!hasInput"
            @click="copyFormattedRps"
          >
            <AppIcon :name="copyStatus === 'copied' ? 'check' : 'copy'" :size="15" />
            {{ copyButtonLabel }}
          </button>
        </div>

        <div class="flex-1">
          <textarea
            id="rp-output"
            :value="result.formatted"
            rows="9"
            readonly
            class="scrollbar-thin h-full min-h-52 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-6 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="O resultado aparecerá aqui..."
            aria-label="RPs formatados, separados por vírgulas"
          />
        </div>

        <div
          v-if="result.duplicateCount > 0"
          class="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40"
          role="status"
        >
          <div class="flex items-start gap-2">
            <AppIcon name="alert" :size="17" class="mt-0.5 shrink-0 text-rose-600 dark:text-rose-300" />
            <div class="min-w-0">
              <p class="text-xs font-bold text-rose-800 dark:text-rose-200">
                {{ result.duplicateCount }}
                {{ result.duplicateCount === 1 ? 'RP duplicado encontrado' : 'RPs duplicados encontrados' }}
              </p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="(duplicate, index) in result.duplicates"
                  :key="`${duplicate}-${index}`"
                  class="rounded-md bg-white px-2 py-1 font-mono text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800"
                >
                  {{ duplicate }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="hasInput"
          class="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          role="status"
        >
          <AppIcon name="check" :size="16" />
          Nenhum RP duplicado. Lista pronta para uso.
        </div>

        <p class="mt-4 text-[11px] leading-5 text-slate-400 dark:text-slate-500">
          O botão Copiar também limpa a entrada para a próxima lista.
        </p>
      </section>
    </div>
  </div>
</template>
