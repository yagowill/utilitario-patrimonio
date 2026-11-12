import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PdfPageText, PdfTextItem, TermoParseResult, LaudoParseResult } from '../types/asset'
import { parseLaudoPages, parseTermoPages } from './tableParser'

// O worker é resolvido pelo Vite como asset com hash, funcionando em produção na Vercel.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const LINE_HEIGHT_FALLBACK = 10

/**
 * Lê um PDF inteiramente no navegador e devolve os itens de texto com coordenadas
 * normalizadas (origem no canto superior esquerdo da página).
 */
export async function extractPdfPages(file: File): Promise<PdfPageText[]> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  })

  try {
    const pdf = await loadingTask.promise
    const pages: PdfPageText[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })
      const textContent = await page.getTextContent()
      const items: PdfTextItem[] = []

      for (const rawItem of textContent.items) {
        if (!('str' in rawItem)) {
          continue
        }

        const text = rawItem.str.replace(/\u00a0/g, ' ').trim()

        if (!text) {
          continue
        }

        // A transformação do viewport converte a origem do PDF (base esquerda)
        // para coordenadas de tela (topo esquerdo), inclusive em páginas rotacionadas.
        const transformed = pdfjsLib.Util.transform(viewport.transform, rawItem.transform)

        items.push({
          text,
          x: transformed[4],
          y: transformed[5],
          width: Math.max(0, rawItem.width * viewport.scale),
          height:
            Math.abs(transformed[3]) ||
            Math.abs(rawItem.height) ||
            LINE_HEIGHT_FALLBACK,
        })
      }

      pages.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        items,
      })

      page.cleanup()
    }

    return pages
  } finally {
    await loadingTask.destroy()
  }
}

/** Extrai metadados e registros do Termo de Baixa de Bens Móveis. */
export async function parseTermoPdf(file: File): Promise<TermoParseResult> {
  const pages = await extractPdfPages(file)
  return parseTermoPages(pages)
}

/** Extrai os registros do Laudo de Avaliação de Bens Móveis. */
export async function parseLaudoPdf(file: File): Promise<LaudoParseResult> {
  const pages = await extractPdfPages(file)
  return parseLaudoPages(pages)
}
