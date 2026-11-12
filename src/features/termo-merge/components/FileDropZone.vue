<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { PdfParseStatus } from '../composables/useTermoMerge'

const props = defineProps<{
  inputId: string
  title: string
  description: string
  badge: string
  file: File | null
  status: PdfParseStatus
  error: string | null
  pageCount?: number
  itemCount?: number
}>()

const emit = defineEmits<{
  select: [file: File]
  remove: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const isSuccess = computed(() => props.status === 'success')
const isLoading = computed(() => props.status === 'loading')
const hasError = computed(() => props.status === 'error')

const formattedFileSize = computed(() => {
  if (!props.file) {
    return ''
  }

  const sizeInKb = props.file.size / 1024

  if (sizeInKb < 1024) {
    return `${sizeInKb.toFixed(1)} KB`
  }

  return `${(sizeInKb / 1024).toFixed(1)} MB`
})

const resultSummary = computed(() => {
  if (!isSuccess.value) {
    return ''
  }

  const items = props.itemCount ?? 0
  const pages = props.pageCount ?? 0
  return `${items} ${items === 1 ? 'item lido' : 'itens lidos'} • ${pages} ${pages === 1 ? 'página' : 'páginas'}`
})

function openFilePicker(): void {
  if (isLoading.value) {
    return
  }

  fileInput.value?.click()
}

function selectFile(file: File | undefined): void {
  if (!file) {
    return
  }

  emit('select', file)
}

function handleInputChange(event: Event): void {
  const target = event.target as HTMLInputElement
  selectFile(target.files?.[0])
  target.value = ''
}

function handleDrop(event: DragEvent): void {
  isDragging.value = false
  selectFile(event.dataTransfer?.files?.[0])
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openFilePicker()
  }
}
</script>

<template>
  <article
    class="flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-slate-900 sm:p-6"
    :class="
      hasError
        ? 'border-rose-300 dark:border-rose-900'
        : isSuccess
          ? 'border-emerald-300 dark:border-emerald-900'
          : 'border-slate-200 dark:border-slate-800'
    "
  >
    <div class="mb-4 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <span class="mb-2 inline-flex items-center rounded-md bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950 dark:text-brand-200 dark:ring-brand-800">
          {{ badge }}
        </span>
        <h2 class="text-base font-bold text-slate-900 dark:text-white">
          {{ title }}
        </h2>
        <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {{ description }}
        </p>
      </div>

      <span
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        :class="
          hasError
            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
            : isSuccess
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
        "
      >
        <AppIcon :name="hasError ? 'alert' : isSuccess ? 'check' : 'file'" :size="20" />
      </span>
    </div>

    <div
      role="button"
      tabindex="0"
      class="focus-ring group relative flex min-h-48 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition"
      :class="
        isDragging
          ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/50'
          : hasError
            ? 'border-rose-300 bg-rose-50/50 hover:bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20 dark:hover:bg-rose-950/30'
            : isSuccess
              ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30'
              : 'border-slate-300 bg-slate-50/60 hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-brand-500 dark:hover:bg-brand-950/20'
      "
      :aria-label="`Selecionar ${title}`"
      :aria-describedby="`${inputId}-help`"
      @click="openFilePicker"
      @keydown="handleKeydown"
      @dragenter.prevent="isDragging = true"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <input
        :id="inputId"
        ref="fileInput"
        type="file"
        accept=".pdf,application/pdf"
        class="sr-only"
        @click.stop
        @change="handleInputChange"
      />

      <template v-if="isLoading">
        <span class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
          <span class="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
        <p class="text-sm font-bold text-brand-900 dark:text-brand-100">Lendo PDF...</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          O processamento é feito localmente e pode levar alguns segundos.
        </p>
      </template>

      <template v-else-if="file">
        <span
          class="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
          :class="
            hasError
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
              : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
          "
        >
          <AppIcon :name="hasError ? 'alert' : 'file'" :size="22" />
        </span>

        <p class="max-w-full break-words text-sm font-bold text-slate-800 dark:text-slate-100">
          {{ file.name }}
        </p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {{ formattedFileSize }}
        </p>

        <p
          v-if="isSuccess"
          class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        >
          <AppIcon name="check" :size="13" />
          {{ resultSummary }}
        </p>

        <p
          v-else-if="hasError"
          class="mt-3 max-w-sm text-xs font-medium leading-5 text-rose-700 dark:text-rose-300"
          role="alert"
        >
          {{ error }}
        </p>

        <button
          type="button"
          class="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-rose-800 dark:hover:text-rose-300"
          @click.stop="emit('remove')"
        >
          <AppIcon name="trash" :size="13" />
          Remover arquivo
        </button>
      </template>

      <template v-else>
        <span class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-brand-900 dark:group-hover:text-brand-200">
          <AppIcon name="upload" :size="22" />
        </span>
        <p class="text-sm font-bold text-slate-700 dark:text-slate-200">
          Arraste o PDF aqui
        </p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          ou clique para selecionar o arquivo
        </p>
        <p :id="`${inputId}-help`" class="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
          Apenas PDF com texto selecionável • até 50 MB
        </p>
      </template>
    </div>
  </article>
</template>
