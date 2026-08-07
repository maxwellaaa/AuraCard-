<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount, computed } from 'vue';
import { marked } from 'marked';

import {
  cardRefs,
  cardStyle,
  cardCanvasStyle,
  cardDecorationStyle,
  cardFrameDecorStyle,
  cardOrnamentStyle,
  cardIconStyle,
  bgImageUrl,
  bgImageStyle,
  scrimStyle,
  cardTopMeta,
  cardTopMetaStyle,
  cardBodyStyle,
  titleStyle,
  title,
  showSubtitle,
  subtitleStyle,
  subtitle,
  contentStyle,
  splitContents,
  content,
  showWatermark,
  watermark,
  isDownloading,
  sectionMode,
  cardSections,
  activeCardIndex,
  updateSectionField,
  removeCardPage,
  selectCard,
  resolveCardStyle,
  resolveContentFontMetrics,
  accent,
  trackInlineSelection,
  clearInlineSelection,
  looksLikeHtml,
  sanitizeCardHtml,
  suppressBodyBlur,
  placedStickers,
  selectedStickerId,
  selectSticker,
  updatePlacedSticker,
  removePlacedSticker,
} from '../store';

const props = defineProps<{
  text: string;
  index: number;
  cardTitle?: string;
  cardSubtitle?: string;
}>();

const cardRef = ref<HTMLElement | null>(null);
const editingIndex = ref<Record<number, boolean>>({});

const totalCards = computed(() =>
  sectionMode.value && cardSections.value.length
    ? cardSections.value.length
    : splitContents.value.length,
);

const canRemovePage = computed(
  () => sectionMode.value && cardSections.value.length > 1,
);

const isActiveCard = computed(() => activeCardIndex.value === props.index);

const cardLocalStyle = computed(() => {
  if (sectionMode.value && cardSections.value[props.index]) {
    return resolveCardStyle(cardSections.value[props.index].style);
  }
  return resolveCardStyle(undefined);
});

const localTitleStyle = computed(() => {
  const local = cardLocalStyle.value;
  const base = { ...(titleStyle.value as Record<string, string>) };
  base.color = local.textColor;
  base.textAlign = local.titleAlign;
  if (local.titleAlign === 'left') {
    base.borderLeft = `4px solid ${accent.value}`;
    base.paddingLeft = '12px';
  } else {
    base.borderLeft = 'none';
    base.paddingLeft = '0';
  }
  return base;
});

const localSubtitleStyle = computed(() => {
  const local = cardLocalStyle.value;
  return {
    ...subtitleStyle.value,
    textAlign: local.titleAlign,
  } as const;
});

const localContentStyle = computed(() => {
  const local = cardLocalStyle.value;
  const { size, lineHeight } = resolveContentFontMetrics(local.fontSizePx);
  return {
    ...contentStyle.value,
    color: local.textColor,
    textAlign: local.contentAlign,
    fontSize: `${size}px`,
    lineHeight: String(lineHeight),
  } as const;
});

const localCardShellStyle = computed(() => ({
  ...cardStyle.value,
  color: cardLocalStyle.value.textColor,
  '--card-content-font-size': `${cardLocalStyle.value.fontSizePx}px`,
}));

const displayTitle = computed(() => {
  if (sectionMode.value) return props.cardTitle ?? '';
  return props.index === 0 ? title.value : '';
});

const displaySubtitle = computed(() => {
  if (!showSubtitle.value) return '';
  if (sectionMode.value) return props.cardSubtitle || '';
  return props.index === 0 ? subtitle.value : '';
});

const showTitleBlock = computed(
  () => sectionMode.value || props.index === 0 || Boolean(displayTitle.value),
);

onMounted(() => {
  if (cardRef.value) {
    cardRefs.value = [...cardRefs.value, cardRef.value];
  }
});

onBeforeUnmount(() => {
  if (cardRef.value) {
    cardRefs.value = cardRefs.value.filter((node) => node !== cardRef.value);
  }
});

const renderMarkdown = (text: string) => {
  if (looksLikeHtml(text)) return sanitizeCardHtml(text);
  return sanitizeCardHtml(String(marked.parse(text || '') || ''));
};

const handleTitleBlur = (e: Event) => {
  clearInlineSelection();
  const value = (e.target as HTMLElement).innerText;
  if (sectionMode.value) {
    updateSectionField(props.index, 'title', value);
    return;
  }
  title.value = value;
};

const handleSubtitleBlur = (e: Event) => {
  clearInlineSelection();
  const value = (e.target as HTMLElement).innerText;
  if (sectionMode.value) {
    updateSectionField(props.index, 'subtitle', value);
    return;
  }
  subtitle.value = value;
};

const handleWatermarkBlur = (e: Event) => {
  watermark.value = (e.target as HTMLElement).innerText;
};

const trackBodySelection = () => {
  const el = document.getElementById(`edit-content-${props.index}`);
  trackInlineSelection(props.index, 'body', el);
};

const startEdit = async (index: number) => {
  selectCard(index);
  editingIndex.value[index] = true;
  await nextTick();
  const el = document.getElementById(`edit-content-${index}`);
  if (!el) return;
  const raw = props.text || '';
  el.innerHTML = looksLikeHtml(raw)
    ? sanitizeCardHtml(raw)
    : sanitizeCardHtml(String(marked.parse(raw) || ''));
  el.focus();
};

const finishEdit = (index: number, e: Event) => {
  const related = (e as FocusEvent).relatedTarget as HTMLElement | null;
  // 点左侧字号/颜色时不要退出编辑，否则选区样式无法落盘
  if (
    suppressBodyBlur.value ||
    related?.closest?.('.settings-panel, .fontSizeRow, .colorPickerLight')
  ) {
    return;
  }
  clearInlineSelection();
  editingIndex.value[index] = false;
  const el = e.target as HTMLElement;
  const nextBody = sanitizeCardHtml(el.innerHTML || '');
  if (sectionMode.value) {
    updateSectionField(index, 'body', nextBody);
    return;
  }
  const parts = [...splitContents.value];
  parts[index] = nextBody;
  content.value = parts.join('\n\n---\n\n');
};

const onSelectCard = (e?: Event) => {
  // 点在贴纸上时不取消选中（兜底；贴纸自身也会 stopPropagation）
  const target = e?.target as HTMLElement | null;
  if (target?.closest?.('.card__sticker')) return;
  selectCard(props.index);
  selectSticker(null);
};

/** 选中贴纸时移出输入焦点，否则 Delete/Backspace 会被输入框吃掉 */
const blurTypingFocus = () => {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return;
  const tag = active.tagName;
  if (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    active.isContentEditable ||
    active.getAttribute('contenteditable')
  ) {
    active.blur();
  }
};

let dragStickerId: string | null = null;
let dragMode: 'move' | 'resize' = 'move';
let dragStart = { x: 0, y: 0, sx: 0, sy: 0, size: 0 };

const onStickerPointerDown = (e: PointerEvent, id: string) => {
  e.stopPropagation();
  e.preventDefault();
  blurTypingFocus();
  selectCard(props.index);
  selectSticker(id);
  const card = cardRef.value;
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const sticker = placedStickers.value.find((s) => s.id === id);
  if (!sticker) return;
  dragStickerId = id;
  dragMode = 'move';
  dragStart = {
    x: e.clientX,
    y: e.clientY,
    sx: sticker.x,
    sy: sticker.y,
    size: sticker.size,
  };
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

  const onMove = (ev: PointerEvent) => {
    if (!dragStickerId || dragMode !== 'move') return;
    const dx = ((ev.clientX - dragStart.x) / rect.width) * 100;
    const dy = ((ev.clientY - dragStart.y) / rect.height) * 100;
    updatePlacedSticker(dragStickerId, {
      x: Math.max(0, Math.min(92, dragStart.sx + dx)),
      y: Math.max(0, Math.min(92, dragStart.sy + dy)),
    });
  };
  const onUp = () => {
    dragStickerId = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
};

const onStickerResizePointerDown = (e: PointerEvent, id: string) => {
  e.stopPropagation();
  e.preventDefault();
  blurTypingFocus();
  selectCard(props.index);
  selectSticker(id);
  const sticker = placedStickers.value.find((s) => s.id === id);
  if (!sticker) return;
  dragStickerId = id;
  dragMode = 'resize';
  dragStart = {
    x: e.clientX,
    y: e.clientY,
    sx: sticker.x,
    sy: sticker.y,
    size: sticker.size,
  };
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

  const onMove = (ev: PointerEvent) => {
    if (!dragStickerId || dragMode !== 'resize') return;
    const delta = Math.max(ev.clientX - dragStart.x, ev.clientY - dragStart.y);
    const next = Math.round(Math.max(16, Math.min(96, dragStart.size + delta * 0.35)));
    updatePlacedSticker(dragStickerId, { size: next });
  };
  const onUp = () => {
    dragStickerId = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
};
</script>

<script lang="ts">
export default {
  name: 'CardPreview'
}
</script>

<template>
  <div
    class="card-wrapper"
    :class="{ 'is-downloading': isDownloading, 'is-active-card': isActiveCard }"
    @click="onSelectCard"
  >
    <div v-if="totalCards > 1 || sectionMode" class="card-page-number">
      <span>{{ index + 1 }}/{{ totalCards }}{{ isActiveCard ? ' · 编辑中' : '' }}</span>
      <button
        v-if="canRemovePage"
        type="button"
        class="card-page-remove"
        title="删除此页"
        @click.stop="removeCardPage(index)"
      >
        删除
      </button>
    </div>
    <div
      class="card"
      ref="cardRef"
      :style="localCardShellStyle"
    >
      <div class="card__layers">
        <div class="card__canvas" :style="cardCanvasStyle" />
        <div class="card__decor" :style="cardDecorationStyle" />
        <div class="card__frameDecor" :style="cardFrameDecorStyle" />
        <div class="card__ornament" :style="cardOrnamentStyle" />
        <div class="card__icon" :style="cardIconStyle" />
        <div v-if="bgImageUrl" class="card__bgImage" :style="bgImageStyle" />
        <div class="card__scrim" :style="scrimStyle" />
      </div>
      <div
        v-if="cardTopMeta.left || cardTopMeta.right || cardTopMeta.center || cardTopMeta.showCenterDot"
        class="card__topMeta"
        :style="cardTopMetaStyle"
      >
        <span v-if="cardTopMeta.left" class="card__topMetaLeft">
          {{ cardTopMeta.left }}
        </span>
        <span v-if="cardTopMeta.right" class="card__topMetaRight">{{ cardTopMeta.right }}</span>
        <span v-if="cardTopMeta.center" class="card__topMetaCenter">{{ cardTopMeta.center }}</span>
        <span v-else-if="cardTopMeta.showCenterDot" class="card__topMetaDot" />
      </div>
      <div class="card__body" :style="cardBodyStyle">
        <div
          v-if="showTitleBlock"
          class="card__title"
          :style="localTitleStyle"
          contenteditable="plaintext-only"
          data-placeholder="输入标题..."
          @focus="onSelectCard"
          @blur="handleTitleBlur"
        >{{ displayTitle }}</div>
        <div
          v-if="displaySubtitle"
          class="card__subtitle"
          :style="localSubtitleStyle"
          contenteditable="plaintext-only"
          data-placeholder="输入副标题..."
          @focus="onSelectCard"
          @blur="handleSubtitleBlur"
        >{{ displaySubtitle }}</div>
        <div class="card__content-wrapper">
          <div
            v-if="!editingIndex[index]"
            class="card__content markdown-body"
            :style="localContentStyle"
            v-html="renderMarkdown(text)"
            @click="startEdit(index)"
          ></div>
          <div
            v-else
            :id="`edit-content-${index}`"
            class="card__content markdown-body"
            :style="localContentStyle"
            contenteditable="true"
            data-placeholder="输入正文内容，选中文字后可在左侧单独调字号/颜色…"
            @mouseup="trackBodySelection"
            @keyup="trackBodySelection"
            @blur="e => finishEdit(index, e)"
          ></div>
        </div>
      </div>
      <div
        class="card__watermark"
        v-if="showWatermark"
        contenteditable="plaintext-only"
        data-placeholder="输入水印..."
        @blur="handleWatermarkBlur"
      >{{ watermark }}</div>
      <div class="card__stickers" aria-hidden="false">
        <div
          v-for="sticker in placedStickers"
          :key="sticker.id"
          class="card__sticker"
          :class="{ 'is-selected': selectedStickerId === sticker.id }"
          :style="{
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
            fontSize: `${sticker.size}px`,
            color: sticker.color,
            opacity: sticker.opacity,
            transform: `translate(-50%, -50%) rotate(${sticker.rotate}deg)`,
          }"
          @pointerdown="(e) => onStickerPointerDown(e, sticker.id)"
          @mousedown.stop.prevent
          @click.stop
          @dblclick.stop="removePlacedSticker(sticker.id)"
          :title="selectedStickerId === sticker.id ? '拖动移动 · 角点缩放 · Delete 删除 · Esc 取消 · 双击删除' : '点击选中'"
        >
          <svg
            v-if="sticker.kind === 'svg' && sticker.svgPath"
            class="card__stickerSvg"
            :viewBox="sticker.svgViewBox || '0 0 24 24'"
            :width="sticker.size"
            :height="sticker.size"
          >
            <path
              :d="sticker.svgPath"
              :fill="sticker.svgStroke ? 'none' : 'currentColor'"
              :stroke="sticker.svgStroke ? 'currentColor' : undefined"
              :stroke-width="sticker.svgStroke ? 2 : undefined"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span v-else class="card__stickerText" :class="{ 'is-label': sticker.kind === 'text' }">
            {{ sticker.content }}
          </span>
          <button
            v-if="selectedStickerId === sticker.id && !isDownloading"
            type="button"
            class="card__stickerHandle"
            title="拖动缩放"
            aria-label="缩放贴纸"
            @pointerdown.stop="(e) => onStickerResizePointerDown(e, sticker.id)"
            @mousedown.stop.prevent
            @click.stop
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-wrapper {
  position: relative;
}

.card-wrapper.is-active-card .card {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.35), 0 18px 60px rgba(17, 24, 39, 0.12);
}

.card-page-number {
  position: absolute;
  top: -30px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  color: #9ca3af;
  font-weight: 500;
  letter-spacing: 1px;
  z-index: 10;
}

.card-page-remove {
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}

.card-page-remove:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.card__layers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.card__canvas,
.card__decor,
.card__frameDecor,
.card__ornament,
.card__bgImage,
.card__scrim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.card__decor {
  z-index: 0;
}

.card__frameDecor {
  inset: 12px;
  z-index: 0;
}

.card__ornament {
  z-index: 0;
}

.card__bgImage {
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
  z-index: 0;
}

.card__scrim {
  z-index: 0;
}

.card__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 16px;
  min-height: 0;
  position: relative;
  /* 正文层保持可编辑；贴纸层 z-index 必须更高，否则标题会抢走点击 */
  z-index: 1;
  padding-bottom: 40px;
  overflow: visible;
}

.card__body::-webkit-scrollbar {
  width: 4px;
}
.card__body::-webkit-scrollbar-track {
  background: transparent;
}
.card__body::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.card__topMeta {
  position: absolute;
  left: 28px;
  right: 28px;
  top: 22px;
  min-height: 26px;
  z-index: 1;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  letter-spacing: 0.8px;
}

.card__topMetaLeft,
.card__topMetaRight {
  display: inline-flex;
  align-items: center;
}

.card__topMetaCenter,
.card__topMetaDot {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.card__topMetaCenter {
  white-space: nowrap;
}

.card__topMetaDot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.card__title {
  font-size: 38px;
  line-height: 1.2;
  font-weight: 800;
  white-space: pre-wrap;
  word-break: break-word;
  letter-spacing: -0.5px;
  outline: none;
  min-height: 1em;
  flex-shrink: 0;
}

.card__title:empty:before,
.card__subtitle:empty:before,
.card__content:empty:before,
.card__watermark:empty:before {
  content: attr(data-placeholder);
  opacity: 0.5;
  pointer-events: none;
}

.is-downloading .card__title:empty,
.is-downloading .card__subtitle:empty,
.is-downloading .card__content:empty,
.is-downloading .card__watermark:empty {
  display: none !important;
}

.is-downloading .card__body {
  overflow: hidden !important;
}

.card__subtitle {
  font-size: 15px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 600;
  outline: none;
  min-height: 1em;
  flex-shrink: 0;
}

.card__content {
  font-size: var(--card-content-font-size, 20px);
  line-height: var(--card-content-line-height, 1.65);
  white-space: pre-wrap;
  word-break: break-word;
  opacity: 0.96;
  min-height: 24px;
  outline: none;
}

.card__content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.markdown-body) {
  white-space: normal;
}
:deep(.markdown-body) p {
  margin-top: 0;
  margin-bottom: 12px;
}
:deep(.markdown-body) p:last-child {
  margin-bottom: 0;
}
:deep(.markdown-body) pre {
  background-color: #282c34;
  color: #abb2bf;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  font-family:
    ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 14px;
  margin-top: 0;
  margin-bottom: 12px;
}
:deep(.markdown-body) code {
  font-family:
    ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
  background-color: rgba(128, 128, 128, 0.2);
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 16px;
}
:deep(.markdown-body) pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  color: inherit;
}
:deep(.markdown-body) ul,
:deep(.markdown-body) ol {
  margin-top: 0;
  margin-bottom: 12px;
  padding-left: 20px;
}

.card__watermark {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  max-width: calc(100% - 48px);
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  opacity: 0.5;
  white-space: pre-wrap;
  word-break: break-word;
  pointer-events: none;
  z-index: 1;
  outline: none;
  min-height: 1em;
}

.card__stickers {
  position: absolute;
  inset: 0;
  /* 高于 cardBodyStyle 的 inline zIndex:10，确保贴纸可点选 */
  z-index: 30;
  pointer-events: none;
}

.card__sticker {
  position: absolute;
  pointer-events: auto;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  line-height: 1;
  /* 扩大命中区域，避免点到下方 contenteditable */
  padding: 6px;
  margin: -6px;
  border-radius: 8px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12));
  z-index: 1;
}

.card__sticker:active {
  cursor: grabbing;
}

.card__sticker.is-selected {
  outline: none;
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 4px rgba(37, 99, 235, 0.85);
  background: rgba(37, 99, 235, 0.06);
  filter: drop-shadow(0 2px 6px rgba(37, 99, 235, 0.25));
}

.card__stickerHandle {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 14px;
  height: 14px;
  padding: 0;
  border: 2px solid #2563eb;
  border-radius: 3px;
  background: #fff;
  cursor: nwse-resize;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
  z-index: 2;
  pointer-events: auto;
}

.is-downloading .card__sticker.is-selected {
  box-shadow: none;
  background: transparent;
}

.is-downloading .card__stickerHandle {
  display: none !important;
}

.card__stickerText {
  display: inline-block;
  pointer-events: none;
}

.card__stickerText.is-label {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 14%, white);
  font-weight: 800;
  letter-spacing: 0.04em;
  font-size: 0.72em;
}

.card__stickerSvg {
  display: block;
  pointer-events: none;
}
</style>
