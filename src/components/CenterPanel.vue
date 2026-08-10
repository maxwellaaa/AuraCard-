<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { MdEditor } from 'md-editor-v3';
import type { ExposeParam } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import {
  splitContents,
  content,
  previewFrameRef,
  previewStageStyle,
  previewWrapperStyle,
  aiSummarizeMessage,
  isChatLoading,
  isDownloading,
  downloadProgress,
  downloadPng,
  downloadCardsZip,
  downloadAllCardsZip,
  cancelDownload,
  exportProjectFile,
  exportContentMarkdown,
  errorMessage,
  resetCardToInitialState,
  sectionMode,
  cardSections,
  applyTitleSegmentedCards,
  exportResolutionId,
  exportResolutionPresets,
  formatExportResolutionLabel,
  activeAspect,
  activeCardIndex,
  addCardPage,
  selectedStickerId,
  selectSticker,
  removePlacedSticker,
  buildColumnFence,
  clampColCount,
  insertAlignedMarkdownTableSample,
  COL_COUNT_MIN,
  COL_COUNT_MAX,
} from '../store';
import type { ColumnDirection, ExportResolutionId } from '../store';
import { useSmartPopover } from '../composables/useSmartPopover';
import CardPreview from './CardPreview.vue';

const isEditingContent = ref(false);
const useAiSummary = ref(false);
const mdFileInputRef = ref<HTMLInputElement | null>(null);
const isDownloadMenuOpen = ref(false);
const downloadMenuRef = ref<HTMLElement | null>(null);
const downloadPanelRef = ref<HTMLElement | null>(null);
const mdEditorRef = ref<ExposeParam>();
const colCount = ref(2);
const showPagePicker = ref(false);
const selectedExportPages = ref<number[]>([]);

const { floatingStyle: downloadMenuStyle, update: updateDownloadMenuPlacement } = useSmartPopover({
  open: isDownloadMenuOpen,
  anchorRef: downloadMenuRef,
  floatingRef: downloadPanelRef,
  preferredPlacement: 'bottom-end',
  minWidth: 280,
  maxWidth: 320,
  maxHeight: 520,
  avoidSelectors: ['.settings-panel', '.chat-panel', '.globalHeader'],
});

watch(showPagePicker, async () => {
  if (!isDownloadMenuOpen.value) return;
  await nextTick();
  updateDownloadMenuPlacement();
});

const exportResolutionOptions = computed(() =>
  exportResolutionPresets.map((preset) => ({
    id: preset.id,
    label: formatExportResolutionLabel(preset, activeAspect.value),
    hint: preset.hint,
  })),
);

const currentResolutionLabel = computed(() => {
  const preset =
    exportResolutionPresets.find((item) => item.id === exportResolutionId.value) ??
    exportResolutionPresets[1];
  return formatExportResolutionLabel(preset, activeAspect.value);
});

const previewCards = computed(() => {
  if (sectionMode.value && cardSections.value.length) {
    return cardSections.value.map((section) => ({
      id: section.id,
      text: section.body,
      cardTitle: section.title,
      cardSubtitle: section.subtitle,
    }));
  }
  return splitContents.value.map((text, index) => ({
    id: `split-${index}`,
    text,
    cardTitle: undefined as string | undefined,
    cardSubtitle: undefined as string | undefined,
  }));
});

const totalPreviewCards = computed(() => previewCards.value.length);

const triggerMdUpload = () => {
  mdFileInputRef.value?.click();
};

const onMdFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    content.value = ev.target?.result as string;
  };
  reader.readAsText(file);
  (e.target as HTMLInputElement).value = '';
};

const handleFinishEdit = async () => {
  if (useAiSummary.value && content.value.trim()) {
    await aiSummarizeMessage(content.value);
  } else if (content.value.trim()) {
    try {
      applyTitleSegmentedCards(content.value);
    } catch {
      sectionMode.value = false;
      cardSections.value = [];
    }
  }
  isEditingContent.value = false;
};

const resetCard = () => {
  resetCardToInitialState();
  useAiSummary.value = false;
  isEditingContent.value = false;
  isDownloadMenuOpen.value = false;
};

const toggleDownloadMenu = () => {
  if (isDownloading.value) return;
  const next = !isDownloadMenuOpen.value;
  isDownloadMenuOpen.value = next;
  if (next) {
    showPagePicker.value = false;
    selectedExportPages.value = Array.from(
      { length: totalPreviewCards.value },
      (_, i) => i,
    );
  }
};

const selectResolution = (id: ExportResolutionId) => {
  exportResolutionId.value = id;
};

const downloadCurrentPage = async () => {
  isDownloadMenuOpen.value = false;
  const idx = Math.min(
    Math.max(0, activeCardIndex.value),
    Math.max(0, totalPreviewCards.value - 1),
  );
  await downloadPng([idx]);
};

const downloadZipAll = async () => {
  isDownloadMenuOpen.value = false;
  await downloadAllCardsZip();
};

const toggleExportPage = (index: number) => {
  const set = new Set(selectedExportPages.value);
  if (set.has(index)) set.delete(index);
  else set.add(index);
  selectedExportPages.value = [...set].sort((a, b) => a - b);
};

const selectAllExportPages = () => {
  selectedExportPages.value = Array.from(
    { length: totalPreviewCards.value },
    (_, i) => i,
  );
};

const downloadSelectedPages = async (mode: 'png' | 'zip') => {
  const idxs = selectedExportPages.value;
  if (!idxs.length) return;
  isDownloadMenuOpen.value = false;
  showPagePicker.value = false;
  if (mode === 'zip') await downloadCardsZip(idxs);
  else await downloadPng(idxs);
};

const insertAlignedTable = () => {
  const block = insertAlignedMarkdownTableSample();
  const editor = mdEditorRef.value;
  if (editor?.insert) {
    editor.insert(() => ({
      targetValue: block,
      select: false,
      deviationStart: 0,
      deviationEnd: 0,
    }));
    return;
  }
  content.value = `${content.value || ''}${block}`;
};

const onCancelDownload = () => {
  cancelDownload();
  isDownloadMenuOpen.value = false;
};

const onSaveProject = async () => {
  await exportProjectFile();
};

const onSaveText = async () => {
  await exportContentMarkdown();
};

const insertColumnBlock = (dir: ColumnDirection) => {
  const n = clampColCount(colCount.value);
  colCount.value = n;
  const block = buildColumnFence(dir, n);
  const editor = mdEditorRef.value;
  if (editor?.insert) {
    editor.insert(() => ({
      targetValue: block,
      select: false,
      deviationStart: 0,
      deviationEnd: 0,
    }));
    return;
  }
  content.value = `${content.value || ''}${block}`;
};

const onDocClick = (e: MouseEvent) => {
  if (!isDownloadMenuOpen.value) return;
  const target = e.target as Node;
  const anchor = downloadMenuRef.value;
  const panel = downloadPanelRef.value;
  if (anchor?.contains(target) || panel?.contains(target)) return;
  isDownloadMenuOpen.value = false;
};

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return Boolean(
    el.closest('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]'),
  );
}

const onStickerKeydown = (e: KeyboardEvent) => {
  const id = selectedStickerId.value;
  if (!id) return;
  if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    selectSticker(null);
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    removePlacedSticker(id);
  }
};

onMounted(() => {
  document.addEventListener('click', onDocClick);
  window.addEventListener('keydown', onStickerKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  window.removeEventListener('keydown', onStickerKeydown);
});
</script>

<template>
  <div class="center-panel-shell">
    <section class="panel center-panel">
    <div class="content-toolbar" role="toolbar" aria-label="卡片内容工具">
      <div class="content-toolbar__group">
        <button class="btn btn--outline btn--sm content-toolbar__action" type="button" @click="isEditingContent = true">
          <svg class="content-toolbar__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          编辑长内容
        </button>
        <button
          class="btn btn--outline btn--sm content-toolbar__action"
          type="button"
          :disabled="isChatLoading || isDownloading"
          title="在末尾新增一页可编辑卡片"
          @click="addCardPage"
        >
          添加页面
        </button>
      </div>

      <span class="content-toolbar__divider" aria-hidden="true"></span>

      <div class="content-toolbar__group">
        <button
          class="btn btn--outline btn--sm content-toolbar__action"
          type="button"
          :disabled="isDownloading || isChatLoading"
          title="导出标题/正文为 Markdown"
          @click="onSaveText"
        >
          保存文字
        </button>
        <button
          class="btn btn--outline btn--sm content-toolbar__action"
          type="button"
          :disabled="isDownloading || isChatLoading"
          title="导出当前卡片项目为 JSON，可稍后重新打开"
          @click="onSaveProject"
        >
          保存项目
        </button>
        <button
          class="btn btn--outline btn--sm content-toolbar__action"
          type="button"
          :disabled="isDownloading || isChatLoading"
          @click="resetCard"
        >
          重置
        </button>
      </div>

      <span class="content-toolbar__divider" aria-hidden="true"></span>

      <div class="content-toolbar__group content-toolbar__group--download">
        <button
          v-if="isDownloading"
          class="btn btn--danger btn--sm content-toolbar__action"
          type="button"
          title="取消当前打包/下载"
          @click="onCancelDownload"
        >
          取消下载
        </button>

        <div ref="downloadMenuRef" class="download-menu" :class="{ 'is-open': isDownloadMenuOpen }">
          <button
            class="btn btn--primary btn--sm content-toolbar__action download-menu__trigger"
            type="button"
            :disabled="isDownloading"
            @click.stop="toggleDownloadMenu"
          >
            <svg class="content-toolbar__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 0-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            {{
              isDownloading
                ? downloadProgress
                  ? `导出中 ${downloadProgress.current}/${downloadProgress.total}…`
                  : '下载中…'
                : '下载卡片'
            }}
            <span class="download-menu__caret" aria-hidden="true">▾</span>
          </button>
        </div>
      </div>
    </div>
    <p v-if="errorMessage" class="content-toolbar__error" role="status">{{ errorMessage }}</p>

    <div class="center-panel__scroll">
      <div class="preview__frame" ref="previewFrameRef">
        <div :style="previewWrapperStyle">
          <div class="preview__stage" :style="previewStageStyle">
            <CardPreview
              v-for="(card, index) in previewCards"
              :key="card.id"
              :text="card.text"
              :index="index"
              :card-title="card.cardTitle"
              :card-subtitle="card.cardSubtitle"
            />
          </div>
        </div>
      </div>
    </div>
    </section>

    <Teleport to="body">
      <div
        v-if="isDownloadMenuOpen"
        ref="downloadPanelRef"
        class="download-menu__panel download-menu__panel--smart"
        :style="downloadMenuStyle"
        data-smart-popover="download-card"
        @click.stop
      >
        <div class="download-menu__head">
          <div class="download-menu__title">导出分辨率</div>
          <div class="download-menu__sub">按 {{ activeAspect.id }} 换算 · {{ currentResolutionLabel }}</div>
        </div>
        <button
          v-for="option in exportResolutionOptions"
          :key="option.id"
          type="button"
          class="download-menu__item"
          :class="{ 'is-active': exportResolutionId === option.id }"
          @click="selectResolution(option.id)"
        >
          <span class="download-menu__itemMain">{{ option.label }}</span>
          <span class="download-menu__itemHint">{{ option.hint }}</span>
        </button>

        <button
          class="btn btn--primary btn--sm download-menu__confirm"
          type="button"
          :disabled="isDownloading || totalPreviewCards < 1"
          title="仅导出当前选中页"
          @click="downloadCurrentPage"
        >
          下载当前页（第 {{ Math.min(activeCardIndex + 1, totalPreviewCards) }} 页）
        </button>
        <button
          class="btn btn--outline btn--sm download-menu__confirm"
          type="button"
          :disabled="isDownloading || totalPreviewCards < 1"
          @click="showPagePicker = !showPagePicker"
        >
          {{ showPagePicker ? '收起页面选择' : '选择页面下载' }}
        </button>

        <div v-if="showPagePicker" class="download-menu__pages">
          <div class="download-menu__pagesHead">
            <span>选择页面</span>
            <button class="btn btn--ghost btn--sm" type="button" @click="selectAllExportPages">全选</button>
          </div>
          <div class="download-menu__pageGrid">
            <label
              v-for="n in totalPreviewCards"
              :key="n"
              class="download-menu__pageChip"
              :class="{ 'is-active': selectedExportPages.includes(n - 1) }"
            >
              <input
                type="checkbox"
                class="srOnly"
                :checked="selectedExportPages.includes(n - 1)"
                @change="toggleExportPage(n - 1)"
              />
              {{ n }}
            </label>
          </div>
          <button
            class="btn btn--primary btn--sm download-menu__confirm"
            type="button"
            :disabled="isDownloading || !selectedExportPages.length"
            @click="downloadSelectedPages('png')"
          >
            下载所选 PNG（{{ selectedExportPages.length }}）
          </button>
          <button
            class="btn btn--outline btn--sm download-menu__confirm"
            type="button"
            :disabled="isDownloading || !selectedExportPages.length"
            @click="downloadSelectedPages('zip')"
          >
            打包所选 ZIP（{{ selectedExportPages.length }}）
          </button>
        </div>

        <button
          class="btn btn--outline btn--sm download-menu__confirm"
          type="button"
          :disabled="isDownloading"
          title="将全部页面打包为 ZIP（沿用上方分辨率）"
          @click="downloadZipAll"
        >
          打包全部（{{ totalPreviewCards }} 页）
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="isEditingContent" class="content-editor-overlay" @click.self="!isChatLoading && (isEditingContent = false)">
        <div class="content-editor-modal">
          <div class="content-editor-header">
            <h3 class="content-editor-title">编辑卡片内容</h3>
            <div class="content-editor-header__actions">
              <button class="btn btn--outline btn--sm" @click="triggerMdUpload" :disabled="isChatLoading">导入 MD 文件</button>
              <input type="file" ref="mdFileInputRef" accept=".md,text/markdown" style="display: none" @change="onMdFileChange" />
              <button class="btn btn--ghost" @click="isEditingContent = false" :disabled="isChatLoading">✕</button>
            </div>
          </div>
          <div class="content-editor-colsBar">
            <span class="content-editor-colsBar__label">正文分栏</span>
            <label class="content-editor-colsBar__count">
              数量
              <select v-model.number="colCount" class="content-editor-colsBar__select">
                <option v-for="n in COL_COUNT_MAX - COL_COUNT_MIN + 1" :key="n" :value="n + COL_COUNT_MIN - 1">
                  {{ n + COL_COUNT_MIN - 1 }}
                </option>
              </select>
            </label>
            <button
              class="btn btn--outline btn--sm"
              type="button"
              :disabled="isChatLoading"
              title="并排竖向分栏（左右列）"
              @click="insertColumnBlock('v')"
            >
              竖排分栏
            </button>
            <button
              class="btn btn--outline btn--sm"
              type="button"
              :disabled="isChatLoading"
              title="上下横条分栏（叠层行）"
              @click="insertColumnBlock('h')"
            >
              横排分栏
            </button>
            <button
              class="btn btn--outline btn--sm"
              type="button"
              :disabled="isChatLoading"
              title="插入带左/中/右对齐的 Markdown 表格"
              @click="insertAlignedTable"
            >
              对齐表格
            </button>
            <span class="ui-hint content-editor-colsBar__hint">表格可用 MD 对齐；卡片内点单元格可调列宽/对齐</span>
          </div>
          <div class="content-editor-body">
            <MdEditor
              ref="mdEditorRef"
              v-model="content"
              :toolbars="['bold', 'underline', 'italic', 'strikeThrough', 'sub', 'sup', 'quote', 'unorderedList', 'orderedList', 'task', '-', 'codeRow', 'code', 'link', 'image', 'table', 'mermaid', 'katex', '-', 'revoke', 'next', '=', 'pageFullscreen', 'fullscreen', 'preview', 'htmlPreview', 'catalog']"
              placeholder="在此输入 Markdown 格式的长文本..."
              style="flex: 1; min-height: 0;"
            />
          </div>
          <div class="content-editor-footer">
            <span class="ui-hint content-editor-tip">表格 / 分栏 / 对齐均可；默认按原文排版，勾选后才走 AI 重新整理</span>
            <div class="content-editor-footer__actions">
              <label class="content-editor-summaryToggle">
                <input type="checkbox" v-model="useAiSummary" :disabled="isChatLoading" class="content-editor-summaryToggle__input" />
                AI 重新整理
              </label>
              <button class="btn btn--primary" @click="handleFinishEdit" :disabled="isChatLoading">
                {{ isChatLoading ? '正在整理...' : (useAiSummary ? 'AI 生成卡片' : '直接排版') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.center-panel-shell {
  display: contents;
}

.content-editor-header__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.content-editor-colsBar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  background: rgba(37, 99, 235, 0.03);
}

.content-editor-colsBar__label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.content-editor-colsBar__count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
}

.content-editor-colsBar__select {
  height: 28px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-solid, #fff);
  color: var(--text);
  font-size: 13px;
}

.content-editor-colsBar__hint {
  margin-left: auto;
}

.content-editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.content-editor-footer__actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.content-editor-summaryToggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--primary);
  font-weight: 600;
}

.content-editor-summaryToggle__input {
  accent-color: var(--primary);
  width: 16px;
  height: 16px;
}

.content-editor-body :deep(.md-editor) {
  border: none;
  border-radius: 0;
  height: 100%;
}

.download-menu {
  position: relative;
}

.download-menu__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.download-menu__caret {
  font-size: 10px;
  opacity: 0.85;
  line-height: 1;
}

.download-menu__panel {
  width: 280px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-solid, #fff);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-sizing: border-box;
}


.download-menu__head {
  padding: 4px 8px 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

.download-menu__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.download-menu__sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
}

.download-menu__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: var(--text);
}

.download-menu__item:hover {
  background: rgba(37, 99, 235, 0.06);
}

.download-menu__item.is-active {
  background: rgba(37, 99, 235, 0.1);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.25);
}

.download-menu__itemMain {
  font-size: 13px;
  font-weight: 600;
}

.download-menu__itemHint {
  font-size: 11px;
  color: var(--muted);
}

.download-menu__confirm {
  margin-top: 6px;
  width: 100%;
  justify-content: center;
}

.download-menu__pages {
  margin-top: 4px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.04);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.download-menu__pagesHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.download-menu__pageGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.download-menu__pageChip {
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border-strong);
  background: var(--surface-solid);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.download-menu__pageChip.is-active {
  background: var(--primary-light);
  border-color: var(--primary-ring);
  color: var(--primary);
}
</style>
