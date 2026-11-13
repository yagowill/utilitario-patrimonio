import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import fileSaver from 'file-saver'
import type { MergeResult, MergedAssetRecord } from '../types/asset'

const saveAs =
  (fileSaver as unknown as { saveAs?: typeof fileSaver }).saveAs ?? fileSaver

const FONT_FAMILY = 'Calibri'
const FONT_SIZE = 24 // 12 pt
const BLACK = '000000'
const TABLE_WIDTH = 10620
const COLUMN_WIDTHS = [1440, 1515, 3390, 2175, 2100]
const SIGNATURE_TABLE_WIDTH = 10674
const SIGNATURE_COLUMN_WIDTHS = [5499, 5175]

const SOLID_BORDER = {
  style: BorderStyle.SINGLE,
  size: 8,
  color: BLACK,
} as const

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: BLACK,
} as const

function createRun(
  text: string,
  options: {
    bold?: boolean
    size?: number
  } = {},
): TextRun {
  return new TextRun({
    text,
    font: FONT_FAMILY,
    size: options.size ?? FONT_SIZE,
    bold: options.bold ?? false,
  })
}

function createTitleParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [createRun(text, { bold: true })],
  })
}

function createSubtitleParagraph(termNumber: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 120 },
    children: [
      createRun(`TERMO DE BAIXA N°: ${termNumber || '—'}`, { bold: true }),
    ],
  })
}

function createAgencyBox(): Table {
  const borderSingle4 = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: BLACK,
  } as const

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    borders: {
      top: borderSingle4,
      bottom: borderSingle4,
      left: borderSingle4,
      right: borderSingle4,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: TABLE_WIDTH, type: WidthType.DXA },
            margins: {
              top: 80,
              bottom: 80,
              left: 100,
              right: 100,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  createRun('ÓRGÃO: POLÍCIA CIVIL DO ESTADO DO PARÁ'),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

function createHeaderCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: {
      type: ShadingType.CLEAR,
      color: 'auto',
    },
    verticalAlign: VerticalAlign.CENTER,
    margins: {
      top: 100,
      bottom: 100,
      left: 100,
      right: 100,
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 20 },
        children: [createRun(text, { bold: true })],
      }),
    ],
  })
}

function normalizeCellText(value: string): string {
  return value.trim().toUpperCase() || '—'
}

function createDataCell(
  value: string,
  width: number,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: {
      top: 100,
      bottom: 100,
      left: 100,
      right: 100,
    },
    children: [
      new Paragraph({
        alignment,
        spacing: { before: 20, after: 20 },
        children: [createRun(normalizeCellText(value))],
      }),
    ],
  })
}

function createAssetRow(record: MergedAssetRecord): TableRow {
  return new TableRow({
    cantSplit: true,
    children: [
      createDataCell(String(record.order), COLUMN_WIDTHS[0], AlignmentType.CENTER),
      createDataCell(record.rp, COLUMN_WIDTHS[1], AlignmentType.CENTER),
      createDataCell(record.description, COLUMN_WIDTHS[2], AlignmentType.CENTER),
      createDataCell(record.situation, COLUMN_WIDTHS[3], AlignmentType.CENTER),
      createDataCell(record.recommendation, COLUMN_WIDTHS[4], AlignmentType.CENTER),
    ],
  })
}

function createAssetTable(records: MergedAssetRecord[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      createHeaderCell('Nº DE ORDEM', COLUMN_WIDTHS[0]),
      createHeaderCell('Nº DO RP', COLUMN_WIDTHS[1]),
      createHeaderCell('DESCRIÇÃO DO BEM', COLUMN_WIDTHS[2]),
      createHeaderCell('SITUAÇÃO DO BEM', COLUMN_WIDTHS[3]),
      createHeaderCell('RECOMENDAÇÃO', COLUMN_WIDTHS[4]),
    ],
  })

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: COLUMN_WIDTHS,
    borders: {
      top: SOLID_BORDER,
      bottom: SOLID_BORDER,
      left: SOLID_BORDER,
      right: SOLID_BORDER,
      insideHorizontal: SOLID_BORDER,
      insideVertical: SOLID_BORDER,
    },
    rows: [headerRow, ...records.map(createAssetRow)],
  })
}

function createSignatureTable(mergeResult: MergeResult): Table {
  const { metadata } = mergeResult
  const date = metadata.date || '____/____/____'
  const unitChiefName =
    metadata.unitChiefName?.trim().toUpperCase() ||
    'MAÍRA CRISTINA BARROS DE AZEVEDO'
  const agencyHeadName =
    metadata.agencyHeadName?.trim().toUpperCase() ||
    'RAIMUNDO BENASSULY MAUÉS JUNIOR'

  const borderSingle4 = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: BLACK,
  } as const

  return new Table({
    width: { size: SIGNATURE_TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: SIGNATURE_COLUMN_WIDTHS,
    borders: {
      top: borderSingle4,
      bottom: borderSingle4,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: SIGNATURE_COLUMN_WIDTHS[0], type: WidthType.DXA },
            borders: {
              top: borderSingle4,
              bottom: borderSingle4,
              left: NO_BORDER,
              right: NO_BORDER,
            },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40 },
                children: [createRun('UNIDADE DE PATRIMÔNIO')],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40 },
                children: [
                  createRun('DATA: '),
                  createRun(date),
                ],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40 },
                children: [
                  createRun('NOME: '),
                  createRun(unitChiefName),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [createRun('COORDENADORA DO SETOR DE PATRIMÔNIO')],
              }),
            ],
          }),
          new TableCell({
            width: { size: SIGNATURE_COLUMN_WIDTHS[1], type: WidthType.DXA },
            borders: {
              top: borderSingle4,
              bottom: borderSingle4,
              left: NO_BORDER,
              right: NO_BORDER,
            },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40 },
                children: [createRun('TITULAR DO ÓRGÃO')],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40 },
                children: [
                  createRun('DATA: '),
                  createRun(date),
                ],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  createRun('NOME: '),
                  createRun(agencyHeadName),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

function sanitizeFilenamePart(value: string): string {
  return (
    value
      .trim()
      .replace(/\//g, '_')
      .replace(/[\\:*?"<>|]+/g, '-')
      .replace(/\s+/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'SEM_TERMO'
  )
}

/** Gera o Blob do DOCX institucional sem iniciar o download. */
export async function buildMergedDocxBlob(mergeResult: MergeResult): Promise<Blob> {
  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
            },
            margin: {
              top: 440,
              right: 480,
              bottom: 280,
              left: 480,
            },
          },
        },
        children: [
          createTitleParagraph('TERMO DE BAIXA DE BENS MÓVEIS'),
          createSubtitleParagraph(mergeResult.metadata.termNumber),
          createAgencyBox(),
          new Paragraph({
            spacing: { before: 160, after: 160 },
            children: [],
          }),
          createAssetTable(mergeResult.records),
          new Paragraph({
            spacing: { before: 240, after: 160 },
            children: [],
          }),
          createSignatureTable(mergeResult),
        ],
      },
    ],
  })

  return Packer.toBlob(document)
}

export function buildMergedDocxFilename(mergeResult: MergeResult): string {
  return `PUBLICACAO_BENS_BAIXADOS_${sanitizeFilenamePart(mergeResult.metadata.termNumber)}.docx`
}

/** Gera e baixa o DOCX com o nome de arquivo institucional. */
export async function downloadMergedDocx(mergeResult: MergeResult): Promise<void> {
  const blob = await buildMergedDocxBlob(mergeResult)
  saveAs(blob, buildMergedDocxFilename(mergeResult))
}
