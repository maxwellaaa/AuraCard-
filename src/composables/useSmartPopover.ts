import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  watch,
  type CSSProperties,
  type MaybeRef,
  type Ref,
} from 'vue'

export type SmartPlacement =
  | 'bottom-start'
  | 'bottom-end'
  | 'top-start'
  | 'top-end'
  | 'right-start'
  | 'right-end'
  | 'left-start'
  | 'left-end'

export interface RectBox {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

export const DEFAULT_AVOID_SELECTORS = [
  '.settings-panel',
  '.chat-panel',
  '.globalHeader',
] as const

export interface UseSmartPopoverOptions {
  open: MaybeRef<boolean>
  anchorRef: Ref<HTMLElement | null | undefined>
  /** Floating panel element (teleported). Alias: panelRef */
  floatingRef?: Ref<HTMLElement | null | undefined>
  panelRef?: Ref<HTMLElement | null | undefined>
  /** Preferred placement. Alias: preferred */
  preferredPlacement?: MaybeRef<SmartPlacement | SmartPlacement[] | undefined>
  preferred?: MaybeRef<SmartPlacement | SmartPlacement[] | undefined>
  /** Gap between anchor and panel. Alias: gap */
  offset?: MaybeRef<number | undefined>
  gap?: MaybeRef<number | undefined>
  padding?: MaybeRef<number | undefined>
  avoidSelectors?: MaybeRef<string[] | undefined>
  /** Match anchor width */
  matchWidth?: MaybeRef<boolean | undefined>
  width?: MaybeRef<number | 'anchor' | undefined>
  minWidth?: MaybeRef<number | undefined>
  maxWidth?: MaybeRef<number | undefined>
  maxHeight?: MaybeRef<number | undefined>
  zIndex?: MaybeRef<number | undefined>
}

function toRect(el: DOMRect | RectBox): RectBox {
  return {
    top: el.top,
    left: el.left,
    right: el.right,
    bottom: el.bottom,
    width: el.width,
    height: el.height,
  }
}

function intersectionArea(a: RectBox, b: RectBox): number {
  const left = Math.max(a.left, b.left)
  const right = Math.min(a.right, b.right)
  const top = Math.max(a.top, b.top)
  const bottom = Math.min(a.bottom, b.bottom)
  const w = right - left
  const h = bottom - top
  if (w <= 0 || h <= 0) return 0
  return w * h
}

function viewportRect(padding: number): RectBox {
  const w = window.innerWidth
  const h = window.innerHeight
  return {
    top: padding,
    left: padding,
    right: w - padding,
    bottom: h - padding,
    width: Math.max(0, w - padding * 2),
    height: Math.max(0, h - padding * 2),
  }
}

function collectObstacles(selectors: string[], anchor: HTMLElement | null): RectBox[] {
  const out: RectBox[] = []
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((node) => {
      if (!(node instanceof HTMLElement)) return
      if (anchor && (node === anchor || node.contains(anchor))) return
      const r = node.getBoundingClientRect()
      if (r.width < 8 || r.height < 8) return
      // Skip fully collapsed rails
      if (r.width < 72 && (sel.includes('settings-panel') || sel.includes('chat-panel'))) return
      out.push(toRect(r))
    })
  }
  return out
}

function placeRaw(
  placement: SmartPlacement,
  anchor: RectBox,
  width: number,
  height: number,
  gap: number,
): { left: number; top: number } {
  switch (placement) {
    case 'bottom-start':
      return { left: anchor.left, top: anchor.bottom + gap }
    case 'bottom-end':
      return { left: anchor.right - width, top: anchor.bottom + gap }
    case 'top-start':
      return { left: anchor.left, top: anchor.top - gap - height }
    case 'top-end':
      return { left: anchor.right - width, top: anchor.top - gap - height }
    case 'right-start':
      return { left: anchor.right + gap, top: anchor.top }
    case 'right-end':
      return { left: anchor.right + gap, top: anchor.bottom - height }
    case 'left-start':
      return { left: anchor.left - gap - width, top: anchor.top }
    case 'left-end':
      return { left: anchor.left - gap - width, top: anchor.bottom - height }
    default:
      return { left: anchor.left, top: anchor.bottom + gap }
  }
}

function clamp(n: number, min: number, max: number) {
  if (max < min) return min
  return Math.min(max, Math.max(min, n))
}

function scorePlacement(
  box: RectBox,
  vp: RectBox,
  obstacles: RectBox[],
  preferredIndex: number,
): number {
  const overflowX = Math.max(0, vp.left - box.left) + Math.max(0, box.right - vp.right)
  const overflowY = Math.max(0, vp.top - box.top) + Math.max(0, box.bottom - vp.bottom)
  let obstacleHit = 0
  for (const o of obstacles) {
    obstacleHit += intersectionArea(box, o)
  }
  const preferredBonus = preferredIndex >= 0 ? (8 - preferredIndex) * 4000 : 0
  return preferredBonus - overflowX * 80 - overflowY * 80 - obstacleHit * 2.5
}

function nudgeOffObstacles(box: RectBox, obstacles: RectBox[], vp: RectBox): RectBox {
  let { left, top, width, height } = box
  for (const o of obstacles) {
    const hit = intersectionArea(
      { left, top, right: left + width, bottom: top + height, width, height },
      o,
    )
    if (hit <= 0) continue
    const boxCx = left + width / 2
    const obsCx = o.left + o.width / 2
    if (boxCx <= obsCx) left = o.left - width - 8
    else left = o.right + 8

    const after = {
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
    }
    if (intersectionArea(after, o) > hit * 0.5) {
      const boxCy = top + height / 2
      const obsCy = o.top + o.height / 2
      if (boxCy <= obsCy) top = o.top - height - 8
      else top = o.bottom + 8
    }
  }
  left = clamp(left, vp.left, vp.right - width)
  top = clamp(top, vp.top, vp.bottom - height)
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  }
}

export function computeSmartPopoverPosition(opts: {
  anchor: RectBox
  panelWidth: number
  panelHeight: number
  preferred: SmartPlacement[]
  gap: number
  padding: number
  obstacles: RectBox[]
  maxHeight: number
}): { left: number; top: number; placement: SmartPlacement; maxHeight: number } {
  const vp = viewportRect(opts.padding)
  const height = Math.min(opts.panelHeight, opts.maxHeight, vp.height)
  const width = Math.min(opts.panelWidth, vp.width)

  const candidates = Array.from(
    new Set<SmartPlacement>([
      ...opts.preferred,
      'bottom-end',
      'bottom-start',
      'top-end',
      'top-start',
      'right-start',
      'left-start',
    ]),
  )

  let best = {
    placement: candidates[0] as SmartPlacement,
    left: opts.anchor.left,
    top: opts.anchor.bottom + opts.gap,
    score: -Infinity,
  }

  for (let i = 0; i < candidates.length; i++) {
    const placement = candidates[i]
    const raw = placeRaw(placement, opts.anchor, width, height, opts.gap)
    let left = clamp(raw.left, vp.left, vp.right - width)
    let top = clamp(raw.top, vp.top, vp.bottom - height)
    let box: RectBox = {
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
    }
    box = nudgeOffObstacles(box, opts.obstacles, vp)
    const preferredIndex = opts.preferred.indexOf(placement)
    const score = scorePlacement(box, vp, opts.obstacles, preferredIndex)
    if (score > best.score) {
      best = { placement, left: box.left, top: box.top, score }
    }
  }

  const roomBelow = vp.bottom - best.top
  const maxHeight = Math.max(120, Math.min(opts.maxHeight, roomBelow))

  return {
    left: best.left,
    top: best.top,
    placement: best.placement,
    maxHeight,
  }
}

export function useSmartPopover(options: UseSmartPopoverOptions) {
  const floatingEl = computed(
    () => options.floatingRef?.value ?? options.panelRef?.value ?? null,
  )

  const preferredList = computed((): SmartPlacement[] => {
    const p = unref(options.preferredPlacement) ?? unref(options.preferred) ?? 'bottom-end'
    return Array.isArray(p) ? p : [p]
  })

  const floatingStyle = ref<CSSProperties>({
    position: 'fixed',
    top: '0px',
    left: '0px',
    zIndex: 60,
    visibility: 'hidden',
  })
  /** @deprecated use floatingStyle */
  const panelStyle = floatingStyle
  const placement = ref<SmartPlacement>('bottom-end')

  let raf = 0

  function measurePanelSize(el: HTMLElement | null): { width: number; height: number } {
    const matchWidth = Boolean(unref(options.matchWidth))
    const widthOpt = unref(options.width)
    const minWidth = unref(options.minWidth)
    const maxWidth = unref(options.maxWidth)
    const anchorW = options.anchorRef.value?.getBoundingClientRect().width ?? 280

    if (!el) {
      let width = typeof widthOpt === 'number' ? widthOpt : matchWidth ? anchorW : minWidth ?? 280
      if (minWidth) width = Math.max(width, minWidth)
      if (maxWidth) width = Math.min(width, maxWidth)
      return { width, height: 280 }
    }

    const rect = el.getBoundingClientRect()
    let width = rect.width || el.offsetWidth || 280
    let height = rect.height || el.offsetHeight || 280

    if (matchWidth || widthOpt === 'anchor') {
      width = Math.max(width, anchorW)
    } else if (typeof widthOpt === 'number') {
      width = widthOpt
    }
    if (minWidth) width = Math.max(width, minWidth)
    if (maxWidth) width = Math.min(width, maxWidth)
    return { width, height }
  }

  function update() {
    const open = Boolean(unref(options.open))
    const anchorEl = options.anchorRef.value
    const gap = unref(options.offset) ?? unref(options.gap) ?? 8
    const padding = unref(options.padding) ?? 10
    const zIndex = unref(options.zIndex) ?? 60
    const avoidSelectors = unref(options.avoidSelectors) ?? [...DEFAULT_AVOID_SELECTORS]
    const matchWidth = Boolean(unref(options.matchWidth))
    const widthOpt = unref(options.width)
    const minWidth = unref(options.minWidth)
    const maxWidth = unref(options.maxWidth)

    if (!open || !anchorEl) {
      floatingStyle.value = {
        position: 'fixed',
        top: '0px',
        left: '0px',
        zIndex,
        visibility: 'hidden',
        pointerEvents: 'none',
      }
      return
    }

    const anchor = toRect(anchorEl.getBoundingClientRect())
    const panelEl = floatingEl.value
    const size = measurePanelSize(panelEl)
    const maxHeightCap =
      unref(options.maxHeight) ?? Math.min(560, window.innerHeight - padding * 2)
    const obstacles = collectObstacles(avoidSelectors, anchorEl)

    const result = computeSmartPopoverPosition({
      anchor,
      panelWidth: size.width,
      panelHeight: size.height,
      preferred: preferredList.value,
      gap,
      padding,
      obstacles,
      maxHeight: maxHeightCap,
    })

    placement.value = result.placement

    const style: CSSProperties = {
      position: 'fixed',
      top: `${Math.round(result.top)}px`,
      left: `${Math.round(result.left)}px`,
      zIndex,
      visibility: 'visible',
      pointerEvents: 'auto',
      maxHeight: `${Math.round(result.maxHeight)}px`,
      overflow: 'auto',
      boxSizing: 'border-box',
    }

    if (matchWidth || widthOpt === 'anchor') {
      style.width = `${Math.round(anchor.width)}px`
    } else if (typeof widthOpt === 'number') {
      style.width = `${widthOpt}px`
    } else if (minWidth && !panelEl) {
      style.width = `${minWidth}px`
    }
    if (minWidth) style.minWidth = `${minWidth}px`
    if (maxWidth) style.maxWidth = `${maxWidth}px`

    floatingStyle.value = style
  }

  function scheduleUpdate() {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      update()
      requestAnimationFrame(update)
    })
  }

  watch(
    () => unref(options.open),
    async (open) => {
      if (open) {
        await nextTick()
        scheduleUpdate()
      } else {
        update()
      }
    },
  )

  watch(
    () => [
      options.anchorRef.value,
      floatingEl.value,
      preferredList.value.join(','),
      unref(options.matchWidth),
      unref(options.minWidth),
      unref(options.maxWidth),
      unref(options.maxHeight),
    ],
    () => {
      if (unref(options.open)) scheduleUpdate()
    },
  )

  onMounted(() => {
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, true)
    if (unref(options.open)) scheduleUpdate()
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', scheduleUpdate)
    window.removeEventListener('scroll', scheduleUpdate, true)
  })

  return {
    floatingStyle,
    panelStyle,
    placement,
    update: scheduleUpdate,
  }
}
