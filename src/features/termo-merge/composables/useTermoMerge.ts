import { computed, ref, shallowRef } from 'vue'
import type {
  LaudoParseResult,
  MergeResult,
  TermoParseResult,
} from '../types/asset'
import { mergeAssetRecords } from '../services/assetMerger'
import { downloadMergedDocx } from '../services/docxGenerator'
import { parseLaudoPdf, parseTermoPdf } from '../services/pdfParser'

export type PdfParseStatus = 'idle' | 'loading' | 'success' | 'error'
export type DownloadStatus = 'idle' | 'generating' | 'success' | 'error'

const MAX_FILE_SIZE = 50 * 1024 * 1024

function validatePdfFile(file: File): string | null {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  if (!isPdf) {
    return 'Selecione um arquivo no formato PDF.'
  }

  if (file.size === 0) {
    return 'O arquivo selecionado está vazio.'
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'O arquivo excede o limite de 50 MB.'
  }

  return null
}

function describePdfError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''

  if (/password/i.test(message)) {
    return 'O PDF está protegido por senha. Remova a proteção e tente novamente.'
  }

  if (/invalid|missing pdf|unexpected server response/i.test(message)) {
    return 'Não foi possível abrir o PDF. Verifique se o arquivo está íntegro.'
  }

  return 'Não foi possível ler o PDF. Verifique se o arquivo é válido e se o texto não está digitalizado como imagem.'
}

/**
 * Orquestra o upload, a leitura dos dois PDFs, o cruzamento e a geração do DOCX.
 */
export function useTermoMerge() {
  const termoFile = shallowRef<File | null>(null)
  const laudoFile = shallowRef<File | null>(null)
  const termoResult = shallowRef<TermoParseResult | null>(null)
  const laudoResult = shallowRef<LaudoParseResult | null>(null)
  const termoStatus = ref<PdfParseStatus>('idle')
  const laudoStatus = ref<PdfParseStatus>('idle')
  const termoError = ref<string | null>(null)
  const laudoError = ref<string | null>(null)
  const downloadStatus = ref<DownloadStatus>('idle')
  const downloadError = ref<string | null>(null)

  let termoRequestId = 0
  let laudoRequestId = 0
  let downloadFeedbackTimer: ReturnType<typeof setTimeout> | undefined

  const mergeResult = computed<MergeResult | null>(() => {
    if (!termoResult.value || !laudoResult.value) {
      return null
    }

    return mergeAssetRecords(termoResult.value, laudoResult.value)
  })

  const isBusy = computed(
    () =>
      termoStatus.value === 'loading' ||
      laudoStatus.value === 'loading' ||
      downloadStatus.value === 'generating',
  )

  const canGenerate = computed(
    () =>
      !!mergeResult.value &&
      mergeResult.value.records.length > 0 &&
      !isBusy.value,
  )

  function clearDownloadFeedback(): void {
    if (downloadFeedbackTimer) {
      clearTimeout(downloadFeedbackTimer)
      downloadFeedbackTimer = undefined
    }
  }

  function scheduleDownloadFeedbackReset(): void {
    clearDownloadFeedback()
    downloadFeedbackTimer = setTimeout(() => {
      downloadStatus.value = 'idle'
      downloadError.value = null
    }, 4000)
  }

  async function selectTermo(file: File): Promise<void> {
    const requestId = ++termoRequestId
    termoFile.value = file
    termoResult.value = null
    termoError.value = null
    downloadStatus.value = 'idle'
    downloadError.value = null

    const validationError = validatePdfFile(file)

    if (validationError) {
      termoStatus.value = 'error'
      termoError.value = validationError
      return
    }

    termoStatus.value = 'loading'

    try {
      const result = await parseTermoPdf(file)

      if (requestId !== termoRequestId) {
        return
      }

      if (result.records.length === 0) {
        termoStatus.value = 'error'
        termoError.value =
          'Nenhum item da tabela do Termo foi encontrado. Confira se o PDF contém a tabela de bens baixados com texto selecionável.'
        return
      }

      termoResult.value = result
      termoStatus.value = 'success'
    } catch (error) {
      if (requestId !== termoRequestId) {
        return
      }

      termoStatus.value = 'error'
      termoError.value = describePdfError(error)
    }
  }

  async function selectLaudo(file: File): Promise<void> {
    const requestId = ++laudoRequestId
    laudoFile.value = file
    laudoResult.value = null
    laudoError.value = null
    downloadStatus.value = 'idle'
    downloadError.value = null

    const validationError = validatePdfFile(file)

    if (validationError) {
      laudoStatus.value = 'error'
      laudoError.value = validationError
      return
    }

    laudoStatus.value = 'loading'

    try {
      const result = await parseLaudoPdf(file)

      if (requestId !== laudoRequestId) {
        return
      }

      if (result.records.length === 0) {
        laudoStatus.value = 'error'
        laudoError.value =
          'Nenhum RP da tabela do Laudo foi encontrado. Confira se o PDF contém a tabela de avaliação com texto selecionável.'
        return
      }

      laudoResult.value = result
      laudoStatus.value = 'success'
    } catch (error) {
      if (requestId !== laudoRequestId) {
        return
      }

      laudoStatus.value = 'error'
      laudoError.value = describePdfError(error)
    }
  }

  function removeTermo(): void {
    termoRequestId += 1
    termoFile.value = null
    termoResult.value = null
    termoStatus.value = 'idle'
    termoError.value = null
    downloadStatus.value = 'idle'
    downloadError.value = null
  }

  function removeLaudo(): void {
    laudoRequestId += 1
    laudoFile.value = null
    laudoResult.value = null
    laudoStatus.value = 'idle'
    laudoError.value = null
    downloadStatus.value = 'idle'
    downloadError.value = null
  }

  function resetAll(): void {
    termoRequestId += 1
    laudoRequestId += 1
    termoFile.value = null
    laudoFile.value = null
    termoResult.value = null
    laudoResult.value = null
    termoStatus.value = 'idle'
    laudoStatus.value = 'idle'
    termoError.value = null
    laudoError.value = null
    downloadStatus.value = 'idle'
    downloadError.value = null
    clearDownloadFeedback()
  }

  async function generateDocx(): Promise<void> {
    if (!mergeResult.value || !canGenerate.value) {
      return
    }

    downloadStatus.value = 'generating'
    downloadError.value = null

    try {
      await downloadMergedDocx(mergeResult.value)
      downloadStatus.value = 'success'
    } catch {
      downloadStatus.value = 'error'
      downloadError.value =
        'Não foi possível gerar o DOCX. Tente novamente ou reduza a quantidade de itens.'
    }

    scheduleDownloadFeedbackReset()
  }

  return {
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
  }
}
