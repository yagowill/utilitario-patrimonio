/** Item de texto extraído de uma página de PDF. */
export interface PdfTextItem {
  text: string
  x: number
  y: number
  width: number
  height: number
}

/** Conteúdo textual de uma página, já normalizado para coordenadas de tela. */
export interface PdfPageText {
  pageNumber: number
  width: number
  height: number
  items: PdfTextItem[]
}

export interface TermoMetadata {
  termNumber: string
  date: string
  unitChiefName: string
  agencyHeadName: string
}

/** Registro extraído do Termo de Baixa de Bens Móveis. */
export interface TermoAssetRecord {
  order: number
  rp: string
  description: string
  reason: string
}

/** Registro extraído do Laudo de Avaliação de Bens Móveis. */
export interface LaudoAssetRecord {
  order?: number
  rp: string
  situation: string
  recommendation: string
}

export interface TermoParseResult {
  metadata: TermoMetadata
  records: TermoAssetRecord[]
  pageCount: number
}

export interface LaudoParseResult {
  records: LaudoAssetRecord[]
  pageCount: number
}

/** Registro final usado na pré-visualização e na geração do DOCX. */
export interface MergedAssetRecord extends TermoAssetRecord {
  situation: string
  recommendation: string
  /** Indica que o RP não foi localizado no laudo e a recomendação padrão foi aplicada. */
  recommendationMissing: boolean
  /** Indica que a situação não foi localizada no laudo e o fallback foi aplicado. */
  situationMissing?: boolean
}

export interface MergeValidation {
  termoCount: number
  laudoCount: number
  matchedCount: number
  missingRps: string[]
  extraRps: string[]
  duplicateTermoRps: string[]
  duplicateLaudoRps: string[]
  hasDivergence: boolean
}

export interface MergeResult {
  metadata: TermoMetadata
  records: MergedAssetRecord[]
  validation: MergeValidation
}
