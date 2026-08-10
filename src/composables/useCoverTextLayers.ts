import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { loadFontStylesheet, onlineFonts, type OnlineFont } from '../store/fonts'

export type CoverTextAlign = 'left' | 'center' | 'right'

export type CoverTextLayer = {
  id: string
  text: string
  /** left % of canvas */
  x: number
  /** top % of canvas */
  y: number
  /** width % of canvas */
  width: number
  fontSize: number
  fontWeight: number
  textAlign: CoverTextAlign
  /** null = follow cover style template color */
  color: string | null
  /** null = follow cover style template font; otherwise onlineFonts id */
  fontId: string | null
}

export function createCoverTextId() {
  return `cover-text-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function createDefaultCoverTextLayers(): CoverTextLayer[] {
  return [
    {
      id: createCoverTextId(),
      text: '你好',
      x: 8,
      y: 36,
      width: 84,
      fontSize: 48,
      fontWeight: 800,
      textAlign: 'center',
      color: null,
      fontId: null,
    },
    {
      id: createCoverTextId(),
      text: '— 光语 —',
      x: 8,
      y: 88,
      width: 55,
      fontSize: 13,
      fontWeight: 600,
      textAlign: 'left',
      color: null,
      fontId: null,
    },
  ]
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function isTypingTarget(el: EventTarget | null) {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') return true
  return Boolean(el.closest('[contenteditable="true"]'))
}

export function resolveCoverFontFamily(
  fontId: string | null | undefined,
  templateFontFamily?: string,
): string {
  if (fontId) {
    const font = onlineFonts.value.find((f) => f.id === fontId)
    if (font) {
      loadFontStylesheet(font)
      return font.family
    }
  }
  ensureCoverTemplateFontLoaded(templateFontFamily)
  return templateFontFamily || 'inherit'
}

/** Load Google / catalog stylesheet matching a CSS font-family stack (cover templates). */
export function ensureCoverTemplateFontLoaded(fontFamily?: string | null) {
  if (!fontFamily) return
  const normalized = fontFamily.toLowerCase()
  for (const font of onlineFonts.value) {
    const primary = font.family
      .split(',')[0]
      ?.replace(/["']/g, '')
      .trim()
      .toLowerCase()
    if (primary && normalized.includes(primary)) {
      loadFontStylesheet(font)
      return
    }
  }
}

export function resolveLayerPaint(
  layer: CoverTextLayer,
  templateColor: string,
  templateFontFamily?: string,
) {
  return {
    color: layer.color ?? templateColor,
    fontFamily: resolveCoverFontFamily(layer.fontId, templateFontFamily),
  }
}

export function useCoverTextLayers(opts: {
  canvasRef: Ref<HTMLElement | null>
  templateColor: Ref<string>
  templateFontFamily: Ref<string | undefined>
}) {
  const layers = ref<CoverTextLayer[]>(createDefaultCoverTextLayers())
  const selectedId = ref<string | null>(null)
  const editingId = ref<string | null>(null)
  const isDragging = ref(false)

  const selectedLayer = computed(
    () => layers.value.find((l) => l.id === selectedId.value) ?? null,
  )

  const primaryText = computed(() => {
    const title = layers.value.find((l) => l.fontSize >= 28)
    return (title?.text || layers.value[0]?.text || '封面').trim()
  })

  function selectLayer(id: string | null) {
    selectedId.value = id
    if (id == null) editingId.value = null
  }

  function updateLayer(id: string, patch: Partial<CoverTextLayer>) {
    const idx = layers.value.findIndex((l) => l.id === id)
    if (idx < 0) return
    const next = { ...layers.value[idx], ...patch }
    if (typeof next.x === 'number') next.x = clamp(next.x, -10, 95)
    if (typeof next.y === 'number') next.y = clamp(next.y, -5, 96)
    if (typeof next.width === 'number') next.width = clamp(next.width, 12, 100)
    if (typeof next.fontSize === 'number') next.fontSize = clamp(Math.round(next.fontSize), 10, 120)
    layers.value.splice(idx, 1, next)
    if (patch.fontId) {
      const font = onlineFonts.value.find((f) => f.id === patch.fontId)
      if (font) loadFontStylesheet(font)
    }
  }

  function addTextLayer(seed?: Partial<CoverTextLayer>) {
    const layer: CoverTextLayer = {
      id: createCoverTextId(),
      text: seed?.text ?? '双击编辑文字',
      x: seed?.x ?? 20,
      y: seed?.y ?? 45,
      width: seed?.width ?? 60,
      fontSize: seed?.fontSize ?? 28,
      fontWeight: seed?.fontWeight ?? 700,
      textAlign: seed?.textAlign ?? 'center',
      color: seed?.color ?? null,
      fontId: seed?.fontId ?? null,
    }
    layers.value.push(layer)
    selectedId.value = layer.id
    editingId.value = layer.id
    return layer
  }

  function removeLayer(id: string) {
    const idx = layers.value.findIndex((l) => l.id === id)
    if (idx < 0) return
    layers.value.splice(idx, 1)
    if (selectedId.value === id) selectedId.value = null
    if (editingId.value === id) editingId.value = null
  }

  function layerBoxStyle(layer: CoverTextLayer) {
    return {
      left: `${layer.x}%`,
      top: `${layer.y}%`,
      width: `${layer.width}%`,
    } as const
  }

  function layerTextStyle(layer: CoverTextLayer) {
    const paint = resolveLayerPaint(
      layer,
      opts.templateColor.value,
      opts.templateFontFamily.value,
    )
    return {
      fontSize: `${layer.fontSize}px`,
      fontWeight: layer.fontWeight,
      textAlign: layer.textAlign,
      color: paint.color,
      fontFamily: paint.fontFamily,
    } as const
  }

  /** @deprecated Prefer layerBoxStyle + layerTextStyle; kept for callers that still merge both. */
  function layerStyle(layer: CoverTextLayer) {
    return { ...layerBoxStyle(layer), ...layerTextStyle(layer) } as const
  }

  function beginDrag(e: PointerEvent, id: string) {
    if (editingId.value === id) return
    const canvas = opts.canvasRef.value
    if (!canvas) return
    const layer = layers.value.find((l) => l.id === id)
    if (!layer) return

    e.preventDefault()
    e.stopPropagation()
    selectLayer(id)

    const rect = canvas.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const originX = layer.x
    const originY = layer.y
    let moved = false
    isDragging.value = true

    const onMove = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100
      const dy = ((ev.clientY - startY) / rect.height) * 100
      if (!moved && Math.hypot(dx, dy) < 0.4) return
      moved = true
      updateLayer(id, { x: originX + dx, y: originY + dy })
    }
    const onUp = () => {
      isDragging.value = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function onCanvasPointerDown(e: PointerEvent) {
    const target = e.target as HTMLElement | null
    if (target?.closest?.('.coverTextLayer')) return
    selectLayer(null)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return
    if (isTypingTarget(e.target)) return
    if (!selectedId.value) return
    e.preventDefault()
    removeLayer(selectedId.value)
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
  })

  const fontOptions = computed(() => onlineFonts.value as OnlineFont[])

  return {
    layers,
    selectedId,
    editingId,
    selectedLayer,
    primaryText,
    isDragging,
    fontOptions,
    selectLayer,
    updateLayer,
    addTextLayer,
    removeLayer,
    layerBoxStyle,
    layerTextStyle,
    layerStyle,
    beginDrag,
    onCanvasPointerDown,
  }
}
