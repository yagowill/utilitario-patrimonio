import type {
  LaudoAssetRecord,
  LaudoParseResult,
  MergeResult,
  MergeValidation,
  MergedAssetRecord,
  TermoParseResult,
} from '../types/asset'

export const DEFAULT_SITUATION = 'INSERVÍVEL'
export const DEFAULT_RECOMMENDATION = 'INCINERAÇÃO'

function inferSituationFromReason(reason?: string): string {
  if (!reason) {
    return DEFAULT_SITUATION
  }

  const normalized = reason
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  if (normalized.includes('INSERVIBILIDADE') || normalized.includes('INSERVIVEL')) {
    return 'INSERVÍVEL'
  }
  if (normalized.includes('OBSOLESCENCIA') || normalized.includes('OBSOLETO')) {
    return 'OBSOLETO'
  }
  if (normalized.includes('IRRECUPERABILIDADE') || normalized.includes('IRRECUPERAVEL')) {
    return 'IRRECUPERÁVEL'
  }
  if (normalized.includes('ANTIECONOMICO')) {
    return 'ANTIECONÔMICO'
  }
  if (normalized.includes('OCIOSO')) {
    return 'OCIOSO'
  }

  return reason.trim().toUpperCase() || DEFAULT_SITUATION
}

function findDuplicateValues(values: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value)
      continue
    }

    seen.add(value)
  }

  return [...duplicates]
}

function buildLaudoMap(records: LaudoAssetRecord[]): Map<string, LaudoAssetRecord> {
  const map = new Map<string, LaudoAssetRecord>()

  for (const record of records) {
    // Em caso de RP repetido no laudo, a primeira ocorrência prevalece.
    if (!map.has(record.rp)) {
      map.set(record.rp, record)
    }
  }

  return map
}

/**
 * Cruza o Termo de Baixa com o Laudo de Avaliação usando o RP como chave.
 * A ordem original do termo é preservada. RPs ausentes no laudo recebem
 * a recomendação padrão INCINERAÇÃO e são sinalizados para conferência.
 */
export function mergeAssetRecords(
  termo: TermoParseResult,
  laudo: LaudoParseResult,
): MergeResult {
  const laudoMap = buildLaudoMap(laudo.records)
  const termoRps = termo.records.map((record) => record.rp)
  const laudoRps = laudo.records.map((record) => record.rp)
  const termoRpSet = new Set(termoRps)
  const laudoRpSet = new Set(laudoRps)

  const records: MergedAssetRecord[] = termo.records.map((record) => {
    const laudoRecord = laudoMap.get(record.rp)
    const hasLaudoSituation = !!laudoRecord?.situation?.trim()
    const situation = hasLaudoSituation
      ? laudoRecord!.situation.trim().toUpperCase()
      : inferSituationFromReason(record.reason)
    const recommendation = laudoRecord?.recommendation?.trim().toUpperCase() || DEFAULT_RECOMMENDATION

    return {
      ...record,
      situation,
      situationMissing: !hasLaudoSituation,
      recommendation,
      recommendationMissing: !laudoRecord || !laudoRecord.recommendation?.trim(),
    }
  })

  const missingRps = [...new Set(termoRps.filter((rp) => !laudoRpSet.has(rp)))]
  const extraRps = [...new Set(laudoRps.filter((rp) => !termoRpSet.has(rp)))]
  const duplicateTermoRps = findDuplicateValues(termoRps)
  const duplicateLaudoRps = findDuplicateValues(laudoRps)
  const matchedCount = records.filter((record) => !record.recommendationMissing).length

  const validation: MergeValidation = {
    termoCount: termo.records.length,
    laudoCount: laudo.records.length,
    matchedCount,
    missingRps,
    extraRps,
    duplicateTermoRps,
    duplicateLaudoRps,
    hasDivergence:
      termo.records.length !== laudo.records.length ||
      missingRps.length > 0 ||
      extraRps.length > 0 ||
      duplicateTermoRps.length > 0 ||
      duplicateLaudoRps.length > 0,
  }

  return {
    metadata: termo.metadata,
    records,
    validation,
  }
}
