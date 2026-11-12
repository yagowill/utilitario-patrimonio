import type {
  LaudoAssetRecord,
  LaudoParseResult,
  PdfPageText,
  PdfTextItem,
  TermoAssetRecord,
  TermoMetadata,
  TermoParseResult,
} from '../types/asset'

interface TextLine {
  pageNumber: number
  y: number
  height: number
  items: PdfTextItem[]
  text: string
}

interface TextCell {
  text: string
  x: number
  width: number
  height: number
}

interface TermoColumnAnchors {
  order: number
  rp: number
  description: number
  reason: number
}

interface LaudoColumnAnchors {
  order: number
  rp: number
  description: number
  situation: number
  recommendation: number
}

const LINE_TOLERANCE = 4
const CELL_GAP = 3
const HEADER_CELL_GAP = 4
const COLUMN_TOLERANCE = 45
const REASON_TOLERANCE = 28
const SITUATION_TOLERANCE = 28
const RECOMMENDATION_TOLERANCE = 30

const ORDER_PATTERN = /^\d{1,5}\.?\s*$/
const RP_PATTERN = /^\d{2,}[.,;:]?$/

const REASON_KEYWORDS = [
  'INSERVIBILIDADE',
  'OBSOLESCENCIA',
  'IRRECUPERABILIDADE',
  'TRANSFERENCIA',
  'ALIENACAO',
  'DOACAO',
  'DESTRUICAO',
  'EXTRAVIO',
  'BAIXA',
  'DESCARTE',
  'RECICLAGEM',
  'LEILAO',
  'INCINERACAO',
  'DESFAZIMENTO',
  'INUTILIZACAO',
  'SINISTRO',
  'PERDA',
  'ROUBO',
  'FURTO',
]

const TERMO_END_MARKERS = [
  'UNIDADE DE PATRIMONIO',
  'TITULAR DO ORGAO',
  'ASSINATURA',
  'COORDENADORA DO SETOR DE PATRIMONIO',
  'PROTOCOLO',
]

// "GERADO EM" não entra na lista: em documentos com várias páginas ele aparece
// no rodapé de todas elas e encerraria a leitura prematuramente.
const LAUDO_END_MARKERS = [
  'UNIDADE DE PATRIMONIO',
  'TITULAR DO ORGAO',
  'ASSINATURA',
  'COORDENADOR',
  'COMISSAO DE AVALIACAO',
  'PROTOCOLO',
  'BELÉM,',
  'BELEM,',
]

const TERMO_STRUCTURAL_PATTERNS = [
  /^TERMO DE BAIXA DE BENS MOVEIS$/,
  /^TERMO DE BAIXA N[°ºO]?\s*:/,
  /^ORGAO\s*:/,
  /^N[°ºO] DE$/,
  /^N[°ºO] DO RP\b/,
  /^ORDEM$/,
  /^DESCRICAO DO BEM\b/,
  /^MOTIVO DA BAIXA\b/,
  /^GERADO EM\b/,
  /^SISTEMA DE PATRIMONIO\b/,
  /^PAGINA \d+ DE \d+$/,
]

const ROLE_LABEL_WORDS = [
  'UNIDADE',
  'PATRIMONIO',
  'TITULAR',
  'ORGAO',
  'COORDENADORA',
  'COORDENADOR',
  'SETOR',
  'DATA',
  'NOME',
  'ASSINATURA',
  'GERADO',
  'TERMO',
  'BAIXA',
  'LAUDO',
  'AVALIACAO',
  'POLICIA',
  'CIVIL',
  'ESTADO',
  'PARA',
  'SECRETARIA',
  'ADMINISTRACAO',
]

const MONTHS: Record<string, string> = {
  janeiro: '01',
  fevereiro: '02',
  marco: '03',
  abril: '04',
  maio: '05',
  junho: '06',
  julho: '07',
  agosto: '08',
  setembro: '09',
  outubro: '10',
  novembro: '11',
  dezembro: '12',
}

/** Remove acentos e coloca o texto em caixa alta apenas para comparações internas. */
function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeDescription(value: string): string {
  return normalizeWhitespace(value).toUpperCase()
}

function normalizeReason(value: string): string {
  return normalizeWhitespace(value).replace(/[.;,]+$/g, '').toUpperCase()
}

function normalizeSituation(value: string): string {
  return normalizeWhitespace(value).replace(/[.;,]+$/g, '').toUpperCase()
}

function normalizeRecommendation(value: string): string {
  return normalizeWhitespace(value).replace(/[.;,]+$/g, '').toUpperCase()
}

function normalizeRp(value: string): string {
  const match = value.match(/\d+/)
  return match ? match[0] : ''
}

/** O RP deve ocupar a célula inteira; descrições com números não são RPs. */
function isRpCellText(value: string): boolean {
  return RP_PATTERN.test(value.trim())
}

function normalizeOrder(value: string): number | undefined {
  const match = value.match(/\d+/)

  if (!match) {
    return undefined
  }

  const parsed = Number.parseInt(match[0], 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeDate(value: string): string {
  return value.replace(/\s+/g, '').trim()
}

function buildLines(pages: PdfPageText[]): TextLine[] {
  const lines: TextLine[] = []

  for (const page of pages) {
    const sortedItems = [...page.items].sort((a, b) => a.y - b.y || a.x - b.x)
    let currentLineItems: PdfTextItem[] = []
    let currentY: number | null = null

    const flushLine = (): void => {
      if (currentLineItems.length === 0 || currentY === null) {
        return
      }

      const uniqueItems = currentLineItems.filter((item, index, array) => {
        return array.findIndex((other) => other.x === item.x && other.text === item.text) === index
      })

      uniqueItems.sort((a, b) => a.x - b.x)

      lines.push({
        pageNumber: page.pageNumber,
        y: currentY,
        height: Math.max(...uniqueItems.map((item) => item.height), 0),
        items: uniqueItems,
        text: normalizeWhitespace(uniqueItems.map((item) => item.text).join(' ')),
      })

      currentLineItems = []
    }

    for (const item of sortedItems) {
      if (currentY === null || Math.abs(item.y - currentY) > LINE_TOLERANCE) {
        flushLine()
        currentY = item.y
        currentLineItems = [item]
        continue
      }

      currentLineItems.push(item)
    }

    flushLine()
  }

  return lines
}

function clusterCells(items: PdfTextItem[], maxGap = CELL_GAP): TextCell[] {
  const sortedItems = [...items].sort((a, b) => a.x - b.x)
  const cells: TextCell[] = []

  for (const item of sortedItems) {
    const current = cells[cells.length - 1]
    const currentRight = current ? current.x + current.width : 0
    const isPunctuation = /^[.,;:!?-]+$/.test(item.text)

    if (current && (item.x <= currentRight + maxGap || (isPunctuation && item.x <= currentRight + 10))) {
      current.text = normalizeWhitespace(`${current.text} ${item.text}`)
      current.width = Math.max(current.width, item.x + item.width - current.x)
      current.height = Math.max(current.height, item.height)
      continue
    }

    cells.push({
      text: item.text,
      x: item.x,
      width: Math.max(item.width, 0),
      height: item.height,
    })
  }

  return cells
}

function cellsHaveAnyMarker(cells: TextCell[], markers: string[]): boolean {
  const normalized = normalizeForMatch(cells.map((cell) => cell.text).join(' '))
  return markers.some((marker) => normalized.includes(marker))
}

function isLikelyReason(value: string): boolean {
  const normalized = normalizeForMatch(value)
  return REASON_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function isHeaderWord(value: string): boolean {
  const normalized = normalizeForMatch(value)
  return (
    normalized.includes('ORDEM') ||
    normalized.includes('RP') ||
    normalized.includes('DESCRICAO') ||
    normalized.includes('MOTIVO') ||
    normalized.includes('SITUACAO') ||
    normalized.includes('RECOMENDACAO')
  )
}

function countHeaderKeywords(value: string): number {
  const normalized = normalizeForMatch(value)
  const keywords = [
    /ORDEM/,
    /\bRP\b/,
    /DESCRICAO/,
    /MOTIVO/,
    /SITUACAO/,
    /RECOMENDACAO/,
  ]

  return keywords.filter((keyword) => keyword.test(normalized)).length
}

function findAnchorX(
  cells: TextCell[],
  items: PdfTextItem[],
  pattern: RegExp,
): number | undefined {
  const matchingItems = items
    .filter((item) => pattern.test(normalizeForMatch(item.text)))
    .sort(
      (a, b) =>
        countHeaderKeywords(a.text) - countHeaderKeywords(b.text) || a.width - b.width,
    )

  // Células do cabeçalho podem agrupar rótulos vizinhos (ex.: "N° DE ORDEM Nº DO RP").
  // Nesse caso, a posição do item individual é mais precisa que a da célula.
  if (matchingItems.length > 0 && countHeaderKeywords(matchingItems[0].text) <= 1) {
    return matchingItems[0].x
  }

  const matchingCells = cells
    .filter((cell) => pattern.test(normalizeForMatch(cell.text)))
    .sort(
      (a, b) =>
        countHeaderKeywords(a.text) - countHeaderKeywords(b.text) || a.width - b.width,
    )
  const matchingCell = matchingCells[0]

  if (matchingCell) {
    if (countHeaderKeywords(matchingCell.text) > 1 && matchingItems.length > 0) {
      return matchingItems[0].x
    }

    return matchingCell.x
  }

  return matchingItems[0]?.x
}

function extractTermoAnchors(line: TextLine): TermoColumnAnchors | null {
  const cells = clusterCells(line.items, HEADER_CELL_GAP)
  const order = findAnchorX(cells, line.items, /ORDEM/)
  const rp = findAnchorX(cells, line.items, /\bRP\b/)
  const description = findAnchorX(cells, line.items, /DESCRICAO/)
  const reason = findAnchorX(cells, line.items, /MOTIVO/)

  if (order === undefined || rp === undefined || description === undefined || reason === undefined) {
    return null
  }

  if (!(order < rp && rp < description && description < reason)) {
    return null
  }

  return { order, rp, description, reason }
}

function extractLaudoAnchors(line: TextLine): LaudoColumnAnchors | null {
  const cells = clusterCells(line.items, HEADER_CELL_GAP)
  const order = findAnchorX(cells, line.items, /ORDEM/)
  const rp = findAnchorX(cells, line.items, /\bRP\b/)
  const description = findAnchorX(cells, line.items, /DESCRICAO/)
  const situation = findAnchorX(cells, line.items, /SITUACAO/)
  const recommendation = findAnchorX(cells, line.items, /RECOMENDACAO/)

  if (
    order === undefined ||
    rp === undefined ||
    description === undefined ||
    situation === undefined ||
    recommendation === undefined
  ) {
    return null
  }

  if (!(order < rp && rp < description && description < situation && situation < recommendation)) {
    return null
  }

  return { order, rp, description, situation, recommendation }
}

function isTermoStructuralLine(line: TextLine): boolean {
  const normalized = normalizeForMatch(line.text)
  return TERMO_STRUCTURAL_PATTERNS.some((pattern) => pattern.test(normalized))
}

function isTermoHeader(line: TextLine): boolean {
  const normalized = normalizeForMatch(line.text)
  const hasRp = /\bRP\b/.test(normalized)
  const hasDescription = normalized.includes('DESCRICAO')
  const hasReason = normalized.includes('MOTIVO')

  // O rótulo "ORDEM" pode estar em uma linha separada do restante do cabeçalho
  // em tabelas estreitas; por isso ele não é obrigatório nesta detecção.
  return hasRp && (hasDescription || hasReason)
}

function isLaudoHeader(line: TextLine): boolean {
  const normalized = normalizeForMatch(line.text)
  const hasOrder = normalized.includes('ORDEM')
  const hasRp = /\bRP\b/.test(normalized)
  const hasDescription = normalized.includes('DESCRICAO')
  const hasSituation = normalized.includes('SITUACAO')
  const hasRecommendation = normalized.includes('RECOMENDACAO')

  return hasRp && hasRecommendation && (hasOrder || hasDescription || hasSituation)
}

function findNearbyAnchor(
  lines: TextLine[],
  lineIndex: number,
  pattern: RegExp,
): number | undefined {
  const line = lines[lineIndex]
  const nearby = lines.filter((candidate, index) => {
    return (
      candidate.pageNumber === line.pageNumber &&
      Math.abs(candidate.y - line.y) <= 18 &&
      index !== lineIndex &&
      isHeaderWord(candidate.text)
    )
  })

  for (const candidate of nearby) {
    const cell = clusterCells(candidate.items, HEADER_CELL_GAP).find((item) =>
      pattern.test(normalizeForMatch(item.text)),
    )

    if (cell) {
      return cell.x
    }

    const item = candidate.items.find((entry) => pattern.test(normalizeForMatch(entry.text)))

    if (item) {
      return item.x
    }
  }

  return undefined
}

function findTermoHeaderAnchors(lines: TextLine[], lineIndex: number): TermoColumnAnchors | null {
  const line = lines[lineIndex]
  const direct = extractTermoAnchors(line)

  if (direct) {
    return direct
  }

  const cells = clusterCells(line.items, HEADER_CELL_GAP)
  const order = findAnchorX(cells, line.items, /ORDEM/) ?? findNearbyAnchor(lines, lineIndex, /ORDEM/)
  const rp = findAnchorX(cells, line.items, /\bRP\b/) ?? findNearbyAnchor(lines, lineIndex, /\bRP\b/)
  const description =
    findAnchorX(cells, line.items, /DESCRICAO/) ?? findNearbyAnchor(lines, lineIndex, /DESCRICAO/)
  const reason = findAnchorX(cells, line.items, /MOTIVO/) ?? findNearbyAnchor(lines, lineIndex, /MOTIVO/)

  if (order === undefined || rp === undefined || description === undefined || reason === undefined) {
    return null
  }

  if (!(order < rp && rp < description && description < reason)) {
    return null
  }

  return { order, rp, description, reason }
}

function findLaudoHeaderAnchors(lines: TextLine[], lineIndex: number): LaudoColumnAnchors | null {
  const line = lines[lineIndex]
  const direct = extractLaudoAnchors(line)

  if (direct) {
    return direct
  }

  const cells = clusterCells(line.items, HEADER_CELL_GAP)
  const order = findAnchorX(cells, line.items, /ORDEM/) ?? findNearbyAnchor(lines, lineIndex, /ORDEM/)
  const rp = findAnchorX(cells, line.items, /\bRP\b/) ?? findNearbyAnchor(lines, lineIndex, /\bRP\b/)
  const description =
    findAnchorX(cells, line.items, /DESCRICAO/) ?? findNearbyAnchor(lines, lineIndex, /DESCRICAO/)
  const situation =
    findAnchorX(cells, line.items, /SITUACAO/) ?? findNearbyAnchor(lines, lineIndex, /SITUACAO/)
  const recommendation =
    findAnchorX(cells, line.items, /RECOMENDACAO/) ??
    findNearbyAnchor(lines, lineIndex, /RECOMENDACAO/)

  if (
    order === undefined ||
    rp === undefined ||
    description === undefined ||
    situation === undefined ||
    recommendation === undefined
  ) {
    return null
  }

  if (!(order < rp && rp < description && description < situation && situation < recommendation)) {
    return null
  }

  return { order, rp, description, situation, recommendation }
}

function areSameTermoAnchors(
  first: TermoColumnAnchors,
  second: TermoColumnAnchors,
): boolean {
  return (
    Math.abs(first.order - second.order) <= 30 &&
    Math.abs(first.rp - second.rp) <= 30 &&
    Math.abs(first.reason - second.reason) <= 30
  )
}

function areSameLaudoAnchors(
  first: LaudoColumnAnchors,
  second: LaudoColumnAnchors,
): boolean {
  return (
    Math.abs(first.order - second.order) <= 30 &&
    Math.abs(first.rp - second.rp) <= 30 &&
    Math.abs(first.recommendation - second.recommendation) <= 30
  )
}

function findTermoHeaderLineIndex(lines: TextLine[]): number {
  const titleIndex = lines.findIndex((line) =>
    /TERMO\s+DE\s+BAIXA/i.test(normalizeForMatch(line.text)),
  )
  const candidates = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => isTermoHeader(line))

  if (candidates.length === 0) {
    return -1
  }

  if (titleIndex < 0) {
    return candidates[0].index
  }

  const titleLine = lines[titleIndex]
  const titleItem = titleLine.items.find((item) =>
    /TERMO\s+DE\s+BAIXA/i.test(normalizeForMatch(item.text)),
  )
  const titleCenter = titleItem
    ? titleItem.x + titleItem.width / 2
    : (titleLine.items[0]?.x ?? 0)

  let bestIndex = candidates[0].index
  let bestScore = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    if (candidate.index < titleIndex) {
      continue
    }

    const candidateAnchors = findTermoHeaderAnchors(lines, candidate.index)

    if (!candidateAnchors) {
      continue
    }

    const candidateCenter = (candidateAnchors.order + candidateAnchors.reason) / 2
    const score = Math.abs(candidateCenter - titleCenter)

    if (score < bestScore) {
      bestScore = score
      bestIndex = candidate.index
    }
  }

  return bestIndex
}

function findLaudoHeaderLineIndex(lines: TextLine[]): number {
  const titleIndex = lines.findIndex((line) =>
    /LAUDO\s+DE\s+AVALIA/i.test(normalizeForMatch(line.text)),
  )
  const candidates = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => isLaudoHeader(line))

  if (candidates.length === 0) {
    return -1
  }

  if (titleIndex < 0) {
    return candidates[0].index
  }

  const titleLine = lines[titleIndex]
  const titleItem = titleLine.items.find((item) =>
    /LAUDO\s+DE\s+AVALIA/i.test(normalizeForMatch(item.text)),
  )
  const titleCenter = titleItem
    ? titleItem.x + titleItem.width / 2
    : (titleLine.items[0]?.x ?? 0)

  let bestIndex = candidates[0].index
  let bestScore = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    if (candidate.index < titleIndex) {
      continue
    }

    const candidateAnchors = findLaudoHeaderAnchors(lines, candidate.index)

    if (!candidateAnchors) {
      continue
    }

    const candidateCenter =
      (candidateAnchors.order + candidateAnchors.recommendation) / 2
    const score = Math.abs(candidateCenter - titleCenter)

    if (score < bestScore) {
      bestScore = score
      bestIndex = candidate.index
    }
  }

  return bestIndex
}

function inferTermoAnchors(line: TextLine): TermoColumnAnchors | null {
  const cells = clusterCells(line.items, CELL_GAP)
  const orderCell = cells.find((cell) => ORDER_PATTERN.test(cell.text.trim()))

  if (!orderCell) {
    return null
  }

  const rpCell = cells.find(
    (cell) => cell.x > orderCell.x && isRpCellText(cell.text),
  )

  if (!rpCell) {
    return null
  }

  const remainingCells = cells.filter((cell) => cell.x > rpCell.x)

  if (remainingCells.length < 2) {
    return null
  }

  return {
    order: orderCell.x,
    rp: rpCell.x,
    description: remainingCells[0].x,
    reason: remainingCells[remainingCells.length - 1].x,
  }
}

function inferLaudoAnchors(line: TextLine): LaudoColumnAnchors | null {
  const cells = clusterCells(line.items, CELL_GAP)
  const orderCell = cells.find((cell) => ORDER_PATTERN.test(cell.text.trim()))

  if (!orderCell) {
    return null
  }

  const rpCell = cells.find(
    (cell) => cell.x > orderCell.x && isRpCellText(cell.text),
  )

  if (!rpCell) {
    return null
  }

  const remainingCells = cells.filter((cell) => cell.x > rpCell.x)

  if (remainingCells.length < 3) {
    return null
  }

  return {
    order: orderCell.x,
    rp: rpCell.x,
    description: remainingCells[0].x,
    situation: remainingCells[remainingCells.length - 2].x,
    recommendation: remainingCells[remainingCells.length - 1].x,
  }
}

function getTableCells(
  line: TextLine,
  leftAnchor: number,
  lastAnchor: number,
): TextCell[] {
  const rightBound = lastAnchor + Math.max(50, (lastAnchor - leftAnchor) * 0.15)

  return clusterCells(line.items, CELL_GAP).filter(
    (cell) => cell.x >= leftAnchor - COLUMN_TOLERANCE && cell.x <= rightBound,
  )
}

function findCellNear(
  cells: TextCell[],
  anchorX: number,
  tolerance: number,
  predicate: (cell: TextCell) => boolean,
): TextCell | undefined {
  return cells
    .filter((cell) => Math.abs(cell.x - anchorX) <= tolerance && predicate(cell))
    .sort((a, b) => Math.abs(a.x - anchorX) - Math.abs(b.x - anchorX))[0]
}

function parseCombinedOrderAndRp(
  value: string,
): { order: number; rp: string } | undefined {
  const match = normalizeWhitespace(value).match(/^(\d{1,5})\.?\s+(\d{2,})$/)

  if (!match) {
    return undefined
  }

  return {
    order: Number.parseInt(match[1], 10),
    rp: match[2],
  }
}

function extractTermNumber(lines: TextLine[]): string {
  const fullText = lines.map((line) => line.text).join('\n')
  const patterns = [
    /TERMO\s+DE\s+BAIXA\s+N[°ºO]?\s*:?\s*(\d{2,4}\s*\/\s*\d+)/i,
    /TERMO\s+DE\s+BAIXA\s+N[°ºO]?\s*:?\s*(\d+(?:\s*\/\s*\d+)?)/i,
    /N[°ºO]\s*:?\s*(\d{2,4}\s*\/\s*\d+)/i,
  ]

  for (const pattern of patterns) {
    const match = fullText.match(pattern)

    if (match?.[1]) {
      return match[1].replace(/\s+/g, '')
    }
  }

  return ''
}

function extractDate(lines: TextLine[]): string {
  const fullText = lines.map((line) => line.text).join('\n')
  const generatedMatch = fullText.match(
    /GERADO\s+EM\s*:?\s*(\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4})/i,
  )

  if (generatedMatch?.[1]) {
    return normalizeDate(generatedMatch[1])
  }

  const dataMatches = [...fullText.matchAll(/DATA\s*:?\s*(\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4})/gi)]

  if (dataMatches.length > 0) {
    return normalizeDate(dataMatches[dataMatches.length - 1][1])
  }

  const longDateMatch = fullText.match(
    /BEL[EÉ]M\s*,?\s*(\d{1,2})\s+DE\s+([A-Za-zÇç]+)\s+DE\s+(\d{4})/i,
  )

  if (longDateMatch) {
    const month = MONTHS[normalizeForMatch(longDateMatch[2]).toLowerCase()]

    if (month) {
      return `${longDateMatch[1].padStart(2, '0')}/${month}/${longDateMatch[3]}`
    }
  }

  const anyDate = fullText.match(/\b(\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4})\b/)

  return anyDate?.[1] ? normalizeDate(anyDate[1]) : ''
}

function cleanName(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/\b(ASSINATURA|DATA|CPF|MATR[IÍ]CULA|CARGO|FUN[CÇ][AÃ]O)\s*:.*$/i, '')
      .replace(/[_–—]+/g, ' ')
      .replace(/^[\s.,;:-]+|[\s.,;:-]+$/g, ''),
  )
}

function isNameLike(value: string): boolean {
  const cleaned = cleanName(value.replace(/^NOME\s*:\s*/i, ''))

  if (cleaned.length < 5 || cleaned.length > 100 || /\d/.test(cleaned)) {
    return false
  }

  const words = cleaned.split(/\s+/)

  if (words.length < 2) {
    return false
  }

  const normalized = normalizeForMatch(cleaned)

  if (ROLE_LABEL_WORDS.some((word) => normalized.includes(word))) {
    return false
  }

  return /^[A-Za-zÀ-ÿ.' -]+$/.test(cleaned)
}

function findNameNearRole(lines: TextLine[], rolePattern: RegExp): string {
  const roleIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => rolePattern.test(normalizeForMatch(line.text)))
    .map(({ index }) => index)

  for (const roleIndex of roleIndexes) {
    const searchIndexes = [
      roleIndex - 1,
      roleIndex - 2,
      roleIndex - 3,
      roleIndex + 1,
      roleIndex + 2,
      roleIndex + 3,
    ]

    for (const index of searchIndexes) {
      const candidate = lines[index]

      if (!candidate) {
        continue
      }

      const nameMatch = candidate.text.match(/NOME\s*:\s*(.+)/i)

      if (nameMatch) {
        const name = cleanName(nameMatch[1])

        if (name && isNameLike(name)) {
          return name
        }
      }

      if (isNameLike(candidate.text)) {
        return cleanName(candidate.text)
      }
    }
  }

  return ''
}

function extractSignatureNames(lines: TextLine[]): { unitChiefName: string; agencyHeadName: string } {
  const names: string[] = []

  for (const line of lines) {
    const matches = line.text.matchAll(
      /NOME\s*:\s*(.+?)(?=\s+(?:NOME|DATA|ASSINATURA|CPF|MATR[IÍ]CULA|CARGO|FUN[CÇ][AÃ]O)\s*:|$)/gi,
    )

    for (const match of matches) {
      const name = cleanName(match[1])

      if (name && isNameLike(name)) {
        names.push(name)
      }
    }
  }

  const uniqueNames = names.filter((name, index, array) => {
    return array.findIndex((other) => normalizeForMatch(other) === normalizeForMatch(name)) === index
  })

  if (uniqueNames.length >= 2) {
    return {
      unitChiefName: uniqueNames[uniqueNames.length - 2],
      agencyHeadName: uniqueNames[uniqueNames.length - 1],
    }
  }

  if (uniqueNames.length === 1) {
    const unitChief = findNameNearRole(lines, /UNIDADE DE PATRIMONIO|COORDENADOR/)
    const agencyHead = findNameNearRole(lines, /TITULAR DO ORGAO/)

    return {
      unitChiefName: unitChief || uniqueNames[0],
      agencyHeadName: agencyHead || '',
    }
  }

  return {
    unitChiefName: findNameNearRole(lines, /UNIDADE DE PATRIMONIO|COORDENADOR/),
    agencyHeadName: findNameNearRole(lines, /TITULAR DO ORGAO/),
  }
}

function extractTermoMetadata(
  lines: TextLine[],
  signatureStartIndex = 0,
): TermoMetadata {
  // Em diários oficiais, o bloco de assinatura do termo anterior pode aparecer
  // antes do título. Consideramos apenas as linhas a partir do cabeçalho da
  // tabela selecionada para não atribuir nomes de outro termo.
  const signatureLines = signatureStartIndex > 0 ? lines.slice(signatureStartIndex) : lines
  const { unitChiefName, agencyHeadName } = extractSignatureNames(signatureLines)

  return {
    termNumber: extractTermNumber(lines),
    date: extractDate(lines),
    unitChiefName,
    agencyHeadName,
  }
}

function isTermoEndLine(cells: TextCell[]): boolean {
  return cellsHaveAnyMarker(cells, TERMO_END_MARKERS)
}

function isLaudoEndLine(cells: TextCell[]): boolean {
  return cellsHaveAnyMarker(cells, LAUDO_END_MARKERS)
}

/**
 * Extrai os registros do Termo de Baixa. O parser usa as coordenadas das colunas
 * do cabeçalho e trata linhas de continuação (descrições que quebram entre páginas)
 * anexando o texto residual ao registro anterior.
 */
export function parseTermoPages(pages: PdfPageText[]): TermoParseResult {
  const lines = buildLines(pages)
  const headerLineIndex = findTermoHeaderLineIndex(lines)
  const metadata = extractTermoMetadata(
    lines,
    headerLineIndex >= 0 ? headerLineIndex : 0,
  )
  const records: TermoAssetRecord[] = []
  let anchors =
    headerLineIndex >= 0 ? findTermoHeaderAnchors(lines, headerLineIndex) : null
  let tableStarted = anchors !== null
  let lastRecord: TermoAssetRecord | null = null
  const firstLineIndex = headerLineIndex >= 0 ? headerLineIndex + 1 : 0

  for (let lineIndex = firstLineIndex; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]

    // Cabeçalhos e rodapés de página repetidos não fazem parte da tabela e não
    // devem ser anexados ao último registro como continuação de descrição.
    if (isTermoStructuralLine(line)) {
      continue
    }

    if (isTermoHeader(line)) {
      const headerAnchors = findTermoHeaderAnchors(lines, lineIndex)

      if (headerAnchors) {
        if (!anchors) {
          anchors = headerAnchors
          tableStarted = true
          continue
        }

        if (areSameTermoAnchors(anchors, headerAnchors)) {
          anchors = headerAnchors
          continue
        }

        // Outra tabela na mesma página (ex.: diário oficial com vários termos):
        // encerra a leitura para não misturar registros de termos diferentes.
        if (records.length > 0) {
          break
        }

        anchors = headerAnchors
        tableStarted = true
        continue
      }
    }

    if (!tableStarted) {
      const inferredAnchors = inferTermoAnchors(line)

      if (!inferredAnchors) {
        continue
      }

      anchors = inferredAnchors
      tableStarted = true
    }

    if (!anchors) {
      continue
    }

    const activeAnchors = anchors
    const cells = getTableCells(line, activeAnchors.order, activeAnchors.reason)

    if (cells.length === 0) {
      continue
    }

    if (records.length > 0 && isTermoEndLine(cells)) {
      break
    }

    const orderCell = findCellNear(cells, activeAnchors.order, COLUMN_TOLERANCE, (cell) =>
      ORDER_PATTERN.test(cell.text.trim()),
    )
    const rpCell = findCellNear(cells, activeAnchors.rp, COLUMN_TOLERANCE, (cell) =>
      isRpCellText(cell.text),
    )

    let orderValue = orderCell ? normalizeOrder(orderCell.text) : undefined
    let rpValue = rpCell ? normalizeRp(rpCell.text) : undefined

    if (!rpValue && orderCell) {
      const combined = parseCombinedOrderAndRp(orderCell.text)

      if (combined) {
        orderValue = combined.order
        rpValue = combined.rp
      }
    }

    const consumedCells = new Set<TextCell>()

    if (orderCell) {
      consumedCells.add(orderCell)
    }

    if (rpCell) {
      consumedCells.add(rpCell)
    }

    const reasonCells = cells.filter(
      (cell) => !consumedCells.has(cell) && cell.x >= activeAnchors.reason - REASON_TOLERANCE,
    )
    const descriptionCells = cells.filter(
      (cell) =>
        !consumedCells.has(cell) &&
        !reasonCells.includes(cell) &&
        cell.x > (rpCell?.x ?? activeAnchors.rp - 10),
    )

    const descriptionText = normalizeDescription(
      descriptionCells.map((cell) => cell.text).join(' '),
    )
    const reasonText = normalizeReason(reasonCells.map((cell) => cell.text).join(' '))

    if (rpValue) {
      const record: TermoAssetRecord = {
        order: orderValue ?? (lastRecord ? lastRecord.order + 1 : records.length + 1),
        rp: rpValue,
        description: descriptionText,
        reason: reasonText,
      }

      records.push(record)
      lastRecord = record
      continue
    }

    if (!lastRecord) {
      continue
    }

    // Linha órfã de continuação: pode ser o restante de uma descrição ou de um motivo.
    if (reasonText && isLikelyReason(reasonText)) {
      if (!lastRecord.reason) {
        lastRecord.reason = reasonText
      } else if (!normalizeForMatch(lastRecord.reason).includes(normalizeForMatch(reasonText))) {
        lastRecord.reason = normalizeReason(`${lastRecord.reason} ${reasonText}`)
      }
    } else if (reasonText) {
      lastRecord.description = normalizeDescription(`${lastRecord.description} ${reasonText}`)
    }

    if (descriptionText) {
      lastRecord.description = normalizeDescription(`${lastRecord.description} ${descriptionText}`)
    }
  }

  return {
    metadata,
    records: records.map((record) => ({
      ...record,
      description: record.description || 'DESCRIÇÃO NÃO INFORMADA',
      reason: record.reason || 'NÃO INFORMADO',
    })),
    pageCount: pages.length,
  }
}

/**
 * Extrai os registros do Laudo de Avaliação indexados pelo RP. Linhas sem RP são
 * tratadas como continuação da recomendação anterior ou ignoradas quando são
 * apenas resíduos de descrição no início de uma página.
 */
export function parseLaudoPages(pages: PdfPageText[]): LaudoParseResult {
  const lines = buildLines(pages)
  const records: LaudoAssetRecord[] = []
  const headerLineIndex = findLaudoHeaderLineIndex(lines)
  let anchors =
    headerLineIndex >= 0 ? findLaudoHeaderAnchors(lines, headerLineIndex) : null
  let tableStarted = anchors !== null
  let lastRecord: LaudoAssetRecord | null = null
  const firstLineIndex = headerLineIndex >= 0 ? headerLineIndex + 1 : 0

  for (let lineIndex = firstLineIndex; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]

    if (isLaudoHeader(line)) {
      const headerAnchors = findLaudoHeaderAnchors(lines, lineIndex)

      if (headerAnchors) {
        if (!anchors) {
          anchors = headerAnchors
          tableStarted = true
          continue
        }

        if (areSameLaudoAnchors(anchors, headerAnchors)) {
          anchors = headerAnchors
          continue
        }

        if (records.length > 0) {
          break
        }

        anchors = headerAnchors
        tableStarted = true
        continue
      }
    }

    if (!tableStarted) {
      const inferredAnchors = inferLaudoAnchors(line)

      if (!inferredAnchors) {
        continue
      }

      anchors = inferredAnchors
      tableStarted = true
    }

    if (!anchors) {
      continue
    }

    const activeAnchors = anchors
    const cells = getTableCells(line, activeAnchors.order, activeAnchors.recommendation)

    if (cells.length === 0) {
      continue
    }

    if (records.length > 0 && isLaudoEndLine(cells)) {
      break
    }

    const orderCell = findCellNear(cells, activeAnchors.order, COLUMN_TOLERANCE, (cell) =>
      ORDER_PATTERN.test(cell.text.trim()),
    )
    const rpCell = findCellNear(cells, activeAnchors.rp, COLUMN_TOLERANCE, (cell) =>
      isRpCellText(cell.text),
    )

    let orderValue = orderCell ? normalizeOrder(orderCell.text) : undefined
    let rpValue = rpCell ? normalizeRp(rpCell.text) : undefined

    if (!rpValue && orderCell) {
      const combined = parseCombinedOrderAndRp(orderCell.text)

      if (combined) {
        orderValue = combined.order
        rpValue = combined.rp
      }
    }

    const consumedCells = new Set<TextCell>()

    if (orderCell) {
      consumedCells.add(orderCell)
    }

    if (rpCell) {
      consumedCells.add(rpCell)
    }

    const recommendationCells = cells.filter(
      (cell) =>
        !consumedCells.has(cell) &&
        cell.x >= activeAnchors.recommendation - RECOMMENDATION_TOLERANCE,
    )
    const situationCells = cells.filter(
      (cell) =>
        !consumedCells.has(cell) &&
        !recommendationCells.includes(cell) &&
        cell.x >= activeAnchors.situation - SITUATION_TOLERANCE,
    )

    const situationText = normalizeSituation(situationCells.map((cell) => cell.text).join(' '))
    const recommendationText = normalizeRecommendation(
      recommendationCells.map((cell) => cell.text).join(' '),
    )

    if (rpValue) {
      const record: LaudoAssetRecord = {
        order: orderValue,
        rp: rpValue,
        situation: situationText,
        recommendation: recommendationText,
      }

      records.push(record)
      lastRecord = record
      continue
    }

    if (!lastRecord) {
      continue
    }

    if (situationText) {
      if (!lastRecord.situation) {
        lastRecord.situation = situationText
      } else if (
        !normalizeForMatch(lastRecord.situation).includes(normalizeForMatch(situationText))
      ) {
        lastRecord.situation = normalizeSituation(
          `${lastRecord.situation} ${situationText}`,
        )
      }
    }

    if (recommendationText) {
      if (!lastRecord.recommendation) {
        lastRecord.recommendation = recommendationText
      } else if (
        !normalizeForMatch(lastRecord.recommendation).includes(normalizeForMatch(recommendationText))
      ) {
        lastRecord.recommendation = normalizeRecommendation(
          `${lastRecord.recommendation} ${recommendationText}`,
        )
      }
    }
  }

  return {
    records: records.map((record) => ({
      ...record,
      situation: record.situation || 'INSERVÍVEL',
      recommendation: record.recommendation || 'INCINERAÇÃO',
    })),
    pageCount: pages.length,
  }
}


