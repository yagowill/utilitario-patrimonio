<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import FileDropZone from './components/FileDropZone.vue'
import MergedTablePreview from './components/MergedTablePreview.vue'
import ValidationSummary from './components/ValidationSummary.vue'
import { useTermoMerge } from './composables/useTermoMerge'
import { buildMergedDocxFilename } from './services/docxGenerator'

const {
  termoFile,
  laudoFile,
  termoResult,
  laudoResult,
  termoStatus,
  laudoStatus,
  termoError,
  laudoError,
  downloadStatus,
  downloadError,
  mergeResult,
  isBusy,
  canGenerate,
  selectTermo,
  selectLaudo,
  removeTermo,
  removeLaudo,
  resetAll,
  generateDocx,
} = useTermoMerge()

const outputFilename = computed(() =>
  mergeResult.value ? buildMergedDocxFilename(mergeResult.value) : '',
)

const pendingCount = computed(
  () =>
    mergeResult.value?.records.filter((record) => record.recommendationMissing).length ?? 0,
)

const hasAnyFile = computed(() => !!termoFile.value || !!laudoFile.value)

const waitingMessage = computed(() => {
  if (termoStatus.value === 'loading' || laudoStatus.value === 'loading') {
    return ''
  }

  if (termoStatus.value === 'success' && laudoStatus.value === 'idle') {
    return 'Termo de Baixa lido com sucesso. Agora selecione o Laudo de Avaliação para concluir o cruzamento.'
  }

  if (laudoStatus.value === 'success' && termoStatus.value === 'idle') {
    return 'Laudo de Avaliação lido com sucesso. Agora selecione o Termo de Baixa para concluir o cruzamento.'
  }

  return ''
})

const generateButtonLabel = computed(() => {
  if (downloadStatus.value === 'generating') {
    return 'Gerando DOCX...'
  }

  return 'Gerar e Baixar DOCX'
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
    <section class="mb-8">
      <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-gold-300 bg-gold-300/15 px-3 py-1 text-xs font-bold text-gold-600 dark:border-gold-600/60 dark:bg-gold-400/10 dark:text-gold-300">
        <AppIcon name="sparkles" :size="14" />
        Nova ferramenta
      </div>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-brand-950 dark:text-white sm:text-4xl">
            Termo Merge
          </h1>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Cruze o <strong class="font-semibold text-slate-800 dark:text-slate-100">Termo de Baixa de Bens Móveis</strong>
            com o <strong class="font-semibold text-slate-800 dark:text-slate-100">Laudo de Avaliação de Bens Móveis</strong>
            e gere a publicação institucional em <strong class="font-semibold text-slate-800 dark:text-slate-100">.docx</strong>,
            pronta para revisão e assinatura.
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          <AppIcon name="lock" :size="15" />
          Processamento local, sem upload
        </div>
      </div>
    </section>

    <div class="mb-6 grid gap-4 sm:grid-cols-3">
      <div class="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-white">1</span>
        <div>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-100">Selecione os dois PDFs</p>
          <p class="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">Termo de Baixa e Laudo de Avaliação.</p>
        </div>
      </div>
      <div class="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-white">2</span>
        <div>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-100">Confira o cruzamento</p>
          <p class="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">Valide RPs, contagens e pendências.</p>
        </div>
      </div>
      <div class="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-white">3</span>
        <div>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-100">Gere o DOCX</p>
          <p class="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">Baixe a publicação pronta para assinatura.</p>
        </div>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <FileDropZone
        input-id="termo-pdf"
        badge="PDF 1"
        title="Termo de Baixa de Bens Móveis"
        description="Arquivo com a tabela de bens baixados, número do termo, datas e assinaturas."
        :file="termoFile"
        :status="termoStatus"
        :error="termoError"
        :page-count="termoResult?.pageCount"
        :item-count="termoResult?.records.length"
        @select="selectTermo"
        @remove="removeTermo"
      />

      <FileDropZone
        input-id="laudo-pdf"
        badge="PDF 2"
        title="Laudo de Avaliação de Bens Móveis"
        description="Arquivo com os RPs avaliados, situação do bem e recomendação de cada bem."
        :file="laudoFile"
        :status="laudoStatus"
        :error="laudoError"
        :page-count="laudoResult?.pageCount"
        :item-count="laudoResult?.records.length"
        @select="selectLaudo"
        @remove="removeLaudo"
      />
    </div>

    <div
      v-if="waitingMessage"
      class="mt-4 flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-xs font-medium leading-5 text-brand-800 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-200"
      role="status"
    >
      <AppIcon name="info" :size="16" class="mt-0.5 shrink-0" />
      {{ waitingMessage }}
    </div>

    <div v-if="mergeResult" class="mt-6 space-y-6">
      <ValidationSummary :merge-result="mergeResult" />

      <MergedTablePreview :records="mergeResult.records" />

      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Gerar publicação</h2>
            <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              O DOCX será baixado com o nome
              <code class="break-all rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {{ outputFilename }}
              </code>
            </p>
            <p v-if="pendingCount > 0" class="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              <AppIcon name="alert" :size="13" />
              {{ pendingCount }} {{ pendingCount === 1 ? 'item usará' : 'itens usarão' }} a recomendação padrão INCINERAÇÃO.
            </p>
          </div>

          <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              class="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
              :disabled="isBusy"
              @click="resetAll"
            >
              <AppIcon name="refresh" :size="17" />
              Nova consulta
            </button>

            <button
              type="button"
              class="focus-ring inline-flex min-w-52 items-center justify-center gap-2 rounded-xl bg-brand-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-700 dark:hover:bg-brand-600"
              :disabled="!canGenerate"
              @click="generateDocx"
            >
              <span
                v-if="downloadStatus === 'generating'"
                class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              <AppIcon v-else name="download" :size="18" />
              {{ generateButtonLabel }}
            </button>
          </div>
        </div>

        <div
          v-if="downloadStatus === 'success'"
          class="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
          role="status"
          aria-live="polite"
        >
          <AppIcon name="check" :size="16" />
          DOCX gerado com sucesso. O download foi iniciado pelo navegador.
        </div>

        <div
          v-if="downloadStatus === 'error'"
          class="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
          role="alert"
          aria-live="polite"
        >
          <AppIcon name="alert" :size="16" class="mt-0.5 shrink-0" />
          {{ downloadError }}
        </div>
      </section>
    </div>

    <section
      v-else-if="!hasAnyFile"
      class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60"
    >
      <span class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <AppIcon name="upload" :size="22" />
      </span>
      <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">
        Comece selecionando os dois arquivos PDF
      </h2>
      <p class="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500 dark:text-slate-400">
        Os arquivos são lidos diretamente no seu navegador. Nenhum documento é enviado para
        servidores externos.
      </p>
    </section>

    <p class="mt-6 text-center text-[11px] leading-5 text-slate-400 dark:text-slate-500">
      Esta ferramenta não substitui a conferência humana. Revise o DOCX antes de assinar ou publicar.
    </p>
  </div>
</template>
