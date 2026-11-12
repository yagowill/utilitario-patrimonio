export interface RpFormatResult {
  /** RPs na ordem em que apareceram pela primeira vez. */
  uniqueRps: string[]
  /** Cada ocorrência extra de um RP já visto. */
  duplicates: string[]
  totalCount: number
  uniqueCount: number
  duplicateCount: number
  /** Lista pronta para uso no sistema, separada por vírgulas. */
  formatted: string
}

/**
 * Reproduz a regra da ferramenta original:
 * - a entrada é dividida por espaços (ou qualquer whitespace);
 * - cada RP é mantido como texto, preservando zeros à esquerda;
 * - a saída contém apenas a primeira ocorrência de cada RP, separada por vírgulas;
 * - as ocorrências extras são contabilizadas e listadas como duplicadas.
 */
export function formatRpInput(rawInput: string): RpFormatResult {
  const tokens = rawInput
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)

  const seen = new Set<string>()
  const uniqueRps: string[] = []
  const duplicates: string[] = []

  for (const token of tokens) {
    if (seen.has(token)) {
      duplicates.push(token)
      continue
    }

    seen.add(token)
    uniqueRps.push(token)
  }

  return {
    uniqueRps,
    duplicates,
    totalCount: tokens.length,
    uniqueCount: uniqueRps.length,
    duplicateCount: duplicates.length,
    formatted: uniqueRps.join(','),
  }
}
