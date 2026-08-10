import { toPng, getFontEmbedCSS } from 'html-to-image'
import type { ExportResolutionPreset } from '../store/types'

const CAPTURE_TIMEOUT_MS = 30_000
const FONT_EMBED_TIMEOUT_MS = 4_000

export type CoverAspectId = '1:1' | '3:4' | '9:16' | '16:9'

export type CoverAspectPreset = {
  id: CoverAspectId
  label: string
  w: number
  h: number
}

export const coverAspectPresets: CoverAspectPreset[] = [
  { id: '1:1', label: '1:1', w: 1, h: 1 },
  { id: '3:4', label: '3:4', w: 3, h: 4 },
  { id: '9:16', label: '9:16', w: 9, h: 16 },
  { id: '16:9', label: '16:9', w: 16, h: 9 },
]

export function getCoverExportPixelSize(
  preset: ExportResolutionPreset,
  aspect: Pick<CoverAspectPreset, 'w' | 'h'>,
) {
  if (preset.targetWidth) {
    const w = preset.targetWidth
    const h = Math.round((w * aspect.h) / aspect.w)
    return { w, h }
  }
  return null
}

export function formatCoverExportLabel(
  preset: ExportResolutionPreset,
  aspect: Pick<CoverAspectPreset, 'w' | 'h'>,
) {
  const size = getCoverExportPixelSize(preset, aspect)
  if (size) return `${preset.label} · ${size.w}×${size.h}`
  return `${preset.label} · ${preset.hint}`
}

function resolveCoverPixelRatio(
  node: HTMLElement,
  preset: ExportResolutionPreset,
  aspect: Pick<CoverAspectPreset, 'w' | 'h'>,
) {
  if (preset.pixelRatio && preset.pixelRatio > 0) {
    return Math.min(preset.pixelRatio, 3)
  }
  const target = getCoverExportPixelSize(preset, aspect)
  if (!target) return 2
  const nodeWidth = Math.max(1, node.offsetWidth || node.getBoundingClientRect().width)
  // Exact scale to requested width; cap extreme ratios that explode memory/time.
  return Math.min(4, Math.max(1, target.w / nodeWidth))
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

async function resolveFontEmbedCSS(node: HTMLElement): Promise<string> {
  try {
    return await withTimeout(
      getFontEmbedCSS(node),
      FONT_EMBED_TIMEOUT_MS,
      'font embed',
    )
  } catch {
    return ''
  }
}

/**
 * Fast cover capture: skipFonts first (fonts already on the page),
 * short embed timeout only as fallback, pixelRatio from resolution preset.
 */
export async function captureCoverPng(
  node: HTMLElement,
  preset: ExportResolutionPreset,
  aspect: Pick<CoverAspectPreset, 'w' | 'h'>,
): Promise<string> {
  const pixelRatio = resolveCoverPixelRatio(node, preset, aspect)

  // Fast path: reuse faces already loaded in the document (no Google Fonts re-fetch).
  try {
    return await withTimeout(
      toPng(node, {
        cacheBust: false,
        pixelRatio,
        skipFonts: true,
        fontEmbedCSS: '',
      }),
      CAPTURE_TIMEOUT_MS,
      'cover capture',
    )
  } catch (firstError) {
    const fontEmbedCSS = await resolveFontEmbedCSS(node)
    return await withTimeout(
      toPng(node, {
        cacheBust: false,
        pixelRatio,
        fontEmbedCSS,
        skipFonts: !fontEmbedCSS,
      }),
      CAPTURE_TIMEOUT_MS,
      'cover capture (embed fonts)',
    ).catch((secondError) => {
      throw secondError instanceof Error ? secondError : firstError
    })
  }
}
