<script setup lang="ts">
import {
  AiModelOption,
  AiProviderId,
  AiProviderOption,
  AspectId,
  AspectPreset,
  BgTab,
  ChatMessage,
  ChatRole,
  TemplateConfig,
  TemplateId,
  accent,
  activeAspect,
  activeGradientNode,
  aiApiKey,
  aiBaseUrl,
  aiModel,
  aiProvider,
  aiProviderOptions,
  aiSummarizeLastAssistant,
  aiTestMessage,
  aiTestStatus,
  aspectId,
  aspectPresets,
  availableAiModels,
  background,
  backgroundCss,
  bgFileInputRef,
  bgImageName,
  bgImageSizeText,
  bgImageStyle,
  bgImageUrl,
  bgOpacity,
  bgOpacityPercent,
  bgTab,
  callAiChat,
  cardBodyStyle,
  cardCanvasStyle,
  cardDecorationStyle,
  cardFrameDecorStyle,
  cardOrnamentStyle,
  cardRefs,
  cardStyle,
  cardTopMeta,
  cardTopMetaStyle,
  chatEndpoint,
  chatError,
  chatInput,
  chatMessages,
  clearBgImage,
  clearChat,
  colorSwatches,
  content,
  customAiBaseUrl,
  downloadPng,
  errorMessage,
  formatBytes,
  gradientAngle,
  height,
  hexToRgb,
  initStore,
  isAiKeyVisible,
  isAiSettingsOpen,
  isBgDragging,
  isChatLoading,
  isCustomAiProvider,
  isDownloading,
  isLightText,
  isSettingsCollapsed,
  isTestingAiConnection,
  localSummarizeToCard,
  newId,
  normalizeBaseUrl,
  onBgDragEnter,
  onBgDragLeave,
  onBgDrop,
  onPickBgImage,
  openBgPicker,
  padding,
  parseCardFromText,
  previewFrameRef,
  previewScale,
  previewSize,
  previewStageStyle,
  radius,
  relativeLuminance,
  rotateGradient,
  safeFilename,
  scrimStyle,
  selectedAiProvider,
  selectedTemplate,
  selectedTemplateId,
  sendChat,
  setAiTestFeedback,
  setBgFile,
  setChatError,
  showWatermark,
  showSubtitle,
  subtitle,
  subtitleStyle,
  swapColors,
  syncAiProviderSettings,
  templates,
  testAiConnection,
  textAlignment,
  contentTextAlignment,
  textColor,
  contentFontSizePx,
  title,
  titleStyle,
  updateActiveGradientColor,
  watermark,
  width,
  sectionMode,
  cardSections,
  activeCardIndex,
  updateSectionStyle,
  resolveCardStyle,
  selectCard,
  applyStyleToAllCards,
  inlineSelection,
  applyStyleToCurrentSelection,
  persistActiveSelectionField,
  preserveInlineSelection,
  hasTableSelection,
  tableSelection,
  preserveTableSelection,
  setSelectedColumnAlign,
  setSelectedColumnWidth,
  moveSelectedColumn,
  onlineFonts,
  selectedFontId,
  setSelectedFontId,
  updateOnlineFonts,
  fontsUpdateMessage,
  isUpdatingFonts,
  addCustomFont,
  userPresets,
  saveCurrentAsPreset,
  applyPreset,
  overwritePreset,
  deletePreset,
  presetMessage,
  savedProjects,
  saveProjectToLibrary,
  loadProjectFromLibrary,
  deleteProjectFromLibrary,
  exportProjectFile,
  importProjectFile,
  exportContentMarkdown,
  projectMessage,
} from '../store'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useSmartPopover } from '../composables/useSmartPopover'
import UiPanelIntro from './ui/UiPanelIntro.vue'
import OnlineStickersPanel from './OnlineStickersPanel.vue'

const presetNameInput = ref('')
const projectNameInput = ref('')
const projectFileInputRef = ref<HTMLInputElement | null>(null)
const customFontLabel = ref('')
const customFontFamily = ref('')
const customFontCssUrl = ref('')
const showCustomFontForm = ref(false)
/** 二级菜单：字体 / 贴纸 / 预设 */
const extraPanel = ref<'fonts' | 'stickers' | 'presets' | null>(null)
const extraEntryRowRef = ref<HTMLElement | null>(null)
const extraPanelElRef = ref<HTMLElement | null>(null)
const isExtraPanelOpen = computed(() => extraPanel.value !== null)

const extraPanelTitle = computed(() => {
  if (extraPanel.value === 'fonts') return '在线字体'
  if (extraPanel.value === 'stickers') return '在线贴纸'
  if (extraPanel.value === 'presets') return '用户预设'
  return ''
})

const { floatingStyle: extraPanelStyle } = useSmartPopover({
  open: isExtraPanelOpen,
  anchorRef: extraEntryRowRef,
  floatingRef: extraPanelElRef,
  preferredPlacement: ['right-start', 'right-end', 'bottom-start', 'left-start'],
  minWidth: 300,
  maxWidth: 360,
  maxHeight: 640,
  offset: 10,
  // Fly out beside settings; avoid AI rail + header (not the settings panel itself)
  avoidSelectors: ['.chat-panel', '.globalHeader'],
})

function openExtraPanel(id: 'fonts' | 'stickers' | 'presets') {
  extraPanel.value = extraPanel.value === id ? null : id
}

function closeExtraPanel() {
  extraPanel.value = null
}

function onExtraPanelDocClick(e: MouseEvent) {
  if (!extraPanel.value) return
  const target = e.target as Node
  if (extraEntryRowRef.value?.contains(target) || extraPanelElRef.value?.contains(target)) return
  closeExtraPanel()
}

onMounted(() => document.addEventListener('click', onExtraPanelDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onExtraPanelDocClick))

async function onUpdateFonts() {
  await updateOnlineFonts()
}

function onSavePreset() {
  saveCurrentAsPreset(presetNameInput.value)
  presetNameInput.value = ''
}

function onSaveProjectLibrary() {
  saveProjectToLibrary(projectNameInput.value)
  projectNameInput.value = ''
}

async function onExportProject() {
  await exportProjectFile(projectNameInput.value || undefined)
}

async function onExportText() {
  await exportContentMarkdown()
}

function onPickProjectFile() {
  projectFileInputRef.value?.click()
}

async function onProjectFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  await importProjectFile(file)
  ;(e.target as HTMLInputElement).value = ''
}

function onAddCustomFont() {
  const font = addCustomFont({
    label: customFontLabel.value,
    family: customFontFamily.value,
    cssUrl: customFontCssUrl.value || undefined,
  })
  if (font) {
    customFontLabel.value = ''
    customFontFamily.value = ''
    customFontCssUrl.value = ''
    showCustomFontForm.value = false
  }
}

const totalEditableCards = computed(() =>
  sectionMode.value && cardSections.value.length ? cardSections.value.length : 1,
)

const activeStyle = computed(() => {
  if (sectionMode.value && cardSections.value[activeCardIndex.value]) {
    return resolveCardStyle(cardSections.value[activeCardIndex.value].style)
  }
  return resolveCardStyle(undefined)
})

const hasInlineSelection = computed(
  () =>
    inlineSelection.value.active &&
    inlineSelection.value.cardIndex === activeCardIndex.value,
)

function patchActiveStyle(patch: {
  fontSizePx?: number
  titleAlign?: 'left' | 'center' | 'right' | 'justify'
  contentAlign?: 'left' | 'center' | 'right'
  textColor?: string
}) {
  const isInlineTextPatch =
    patch.fontSizePx != null ||
    patch.textColor != null ||
    patch.contentAlign != null

  // 有选区时：字号/颜色/正文对齐只改选中文字；失败不回退改整页
  if (hasInlineSelection.value && isInlineTextPatch && patch.titleAlign == null) {
    const ok = applyStyleToCurrentSelection({
      fontSizePx: patch.fontSizePx,
      textColor: patch.textColor,
      textAlign: patch.contentAlign,
    })
    if (ok) {
      persistActiveSelectionField()
    }
    return
  }

  if (sectionMode.value || totalEditableCards.value > 1) {
    updateSectionStyle(activeCardIndex.value, patch)
    return
  }
  if (patch.fontSizePx != null) contentFontSizePx.value = patch.fontSizePx
  if (patch.titleAlign != null) textAlignment.value = patch.titleAlign
  if (patch.contentAlign != null) contentTextAlignment.value = patch.contentAlign
  if (patch.textColor != null) textColor.value = patch.textColor
}

function applyToAllCards() {
  applyStyleToAllCards()
}

const editingTextColor = computed({
  get: () => activeStyle.value.textColor,
  set: (v: string) => patchActiveStyle({ textColor: v }),
})

const editingFontSize = computed({
  get: () => activeStyle.value.fontSizePx,
  set: (v: number) => patchActiveStyle({ fontSizePx: Number(v) }),
})

const editingTitleAlign = computed({
  get: () => activeStyle.value.titleAlign,
  set: (v: 'left' | 'center' | 'right' | 'justify') =>
    patchActiveStyle({ titleAlign: v }),
})

const editingContentAlign = computed({
  get: () => activeStyle.value.contentAlign,
  set: (v: 'left' | 'center' | 'right') => patchActiveStyle({ contentAlign: v }),
})
</script>

<template>
      <aside class="panel settings-panel" :class="{ 'settings-panel--collapsed': isSettingsCollapsed }">
        <div v-if="isSettingsCollapsed" class="panel__header">
          <button class="collapse-toggle" @click="isSettingsCollapsed = !isSettingsCollapsed" :title="isSettingsCollapsed ? '展开' : '折叠'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
        <UiPanelIntro v-else title="卡片设置">
          <template #actions>
            <button class="collapse-toggle" @click="isSettingsCollapsed = !isSettingsCollapsed" :title="isSettingsCollapsed ? '展开' : '折叠'">
              <svg v-if="!isSettingsCollapsed" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </template>
        </UiPanelIntro>
        
        <div class="settings-content" v-show="!isSettingsCollapsed">
          <div class="group">
            <div class="field">
              <span class="group__title">模板</span>
              <div class="segmented segmented--3">
                <button
                  v-for="t in templates"
                  :key="t.id"
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': selectedTemplateId === t.id }"
                  type="button"
                  @click="selectedTemplateId = t.id"
                >
                  {{ t.name }}
                </button>
              </div>
            </div>
          </div>

          <div class="group">
            <div ref="extraEntryRowRef" class="extraEntryRow" role="toolbar" aria-label="扩展工具">
              <button
                type="button"
                class="extraEntryRow__btn"
                :class="{ 'is-active': extraPanel === 'fonts' }"
                @click.stop="openExtraPanel('fonts')"
              >
                在线字体
              </button>
              <button
                type="button"
                class="extraEntryRow__btn"
                :class="{ 'is-active': extraPanel === 'stickers' }"
                @click.stop="openExtraPanel('stickers')"
              >
                在线贴纸
              </button>
              <button
                type="button"
                class="extraEntryRow__btn"
                :class="{ 'is-active': extraPanel === 'presets' }"
                @click.stop="openExtraPanel('presets')"
              >
                用户预设
              </button>
            </div>
          </div>

          <div class="group">
            <div class="field">
              <span class="group__title">卡片比例</span>
              <div class="segmented">
                <button
                  v-for="a in aspectPresets"
                  :key="a.id"
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': aspectId === a.id }"
                  type="button"
                  @click="aspectId = a.id"
                >
                  {{ a.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="group">
            <div class="field">
              <span class="group__title">背景设置</span>
              <div class="segmented segmented--3">
                <button
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': bgTab === 'solid' }"
                  type="button"
                  @click="bgTab = 'solid'"
                >
                  纯色
                </button>
                <button
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': bgTab === 'gradient' }"
                  type="button"
                  @click="bgTab = 'gradient'"
                >
                  渐变
                </button>
                <button
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': bgTab === 'image' }"
                  type="button"
                  @click="bgTab = 'image'"
                >
                  图片
                </button>
              </div>
            </div>

            <div v-show="bgTab === 'solid'">
              <div class="field">
                <div class="colorPickerLight">
                  <label class="colorPickerLight__native-wrapper">
                    <input class="colorPickerLight__native" type="color" v-model="background" />
                    <span class="colorPickerLight__dot" :style="{ backgroundColor: background }" />
                  </label>
                  <input 
                    class="colorPickerLight__input" 
                    type="text" 
                    v-model="background" 
                    @blur="() => { if (!/^#[0-9A-Fa-f]{6}$/i.test(background)) background = '#ffffff'; }"
                  />
                </div>
              </div>
              <div class="field">
                <div class="colorSwatchesLight">
                  <button
                    v-for="sw in colorSwatches"
                    :key="sw"
                    class="colorSwatchesLight__btn"
                    type="button"
                    :style="{ backgroundColor: sw }"
                    @click="background = sw"
                  />
                </div>
              </div>
            </div>

            <div v-show="bgTab === 'gradient'">
              <div class="field" style="margin-top: 8px;">
                <div class="gradient-control">
                  <div class="gradient-track-wrapper">
                    <div class="gradient-track" :style="{ background: `linear-gradient(90deg, ${background}, ${accent})` }"></div>
                    
                    <div class="gradient-handle gradient-handle--left" :class="{ 'gradient-handle--active': activeGradientNode === 'background' }" @click="activeGradientNode = 'background'">
                      <div class="gradient-handle__inner" :style="{ backgroundColor: background }"></div>
                      <input type="color" v-model="background" class="gradient-handle__input" @click.stop="activeGradientNode = 'background'" />
                    </div>

                    <div class="gradient-handle gradient-handle--right" :class="{ 'gradient-handle--active': activeGradientNode === 'accent' }" @click="activeGradientNode = 'accent'">
                      <div class="gradient-handle__inner" :style="{ backgroundColor: accent }"></div>
                      <input type="color" v-model="accent" class="gradient-handle__input" @click.stop="activeGradientNode = 'accent'" />
                    </div>
                  </div>

                  <div class="gradient-actions">
                    <button class="icon-btn" type="button" @click="swapColors" title="交换颜色" aria-label="交换颜色">
                      <span class="icon-btn__glyph">⇄</span>
                    </button>
                    <button class="icon-btn" type="button" @click="rotateGradient" title="重置角度" aria-label="重置角度">
                      <span class="icon-btn__glyph">↺</span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="field" style="margin-top: 8px;">
                <div class="colorSwatchesLight">
                  <button
                    v-for="sw in colorSwatches"
                    :key="sw"
                    class="colorSwatchesLight__btn"
                    type="button"
                    :style="{ backgroundColor: sw }"
                    @click="updateActiveGradientColor(sw)"
                  />
                </div>
              </div>
            </div>

            <div v-show="bgTab === 'image'" class="field" style="margin-top: 8px;">
                <input ref="bgFileInputRef" class="srOnly" type="file" accept="image/*" @change="onPickBgImage" />
                <div
                  class="uploadCard"
                  :class="{ 'uploadCard--active': isBgDragging, 'uploadCard--withImage': !!bgImageUrl }"
                  role="button"
                  tabindex="0"
                  @click="openBgPicker"
                  @dragenter.prevent="onBgDragEnter"
                  @dragover.prevent="onBgDragEnter"
                  @dragleave="onBgDragLeave"
                  @drop.prevent="onBgDrop"
                >
                  <div v-if="bgImageUrl" class="uploadCard__thumb" :style="{ backgroundImage: `url(${bgImageUrl})` }" />
                  <div v-else class="uploadCard__empty uploadCard__empty--full">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5;margin-bottom:4px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <div class="uploadCard__emptyTitle">点击或拖拽上传背景图</div>
                  </div>
                  <div v-if="bgImageUrl" class="uploadCard__meta">
                    <div class="uploadCard__metaTitle">{{ bgImageName }}</div>
                    <div class="uploadCard__actions">
                      <button class="btn btn--ghost btn--sm" type="button" @click.stop="openBgPicker">更换</button>
                      <button class="btn btn--danger btn--sm" type="button" @click.stop="clearBgImage">移除</button>
                    </div>
                  </div>
                </div>
                <div class="row" style="margin-top: 8px;" v-if="bgImageUrl">
                  <div class="opacity">
                    <div class="opacity__label">透明度</div>
                    <input v-model.number="bgOpacityPercent" class="range" type="range" min="0" max="100" />
                  </div>
                </div>
              </div>
            </div>

          <div class="group">
            <div class="group__title">文字设置</div>
            <p class="ui-hint" style="margin-top: 6px;">
              <template v-if="hasInlineSelection">
                已选中正文文字 — 调整字号/颜色/对齐将<strong>只作用于选区</strong>
              </template>
              <template v-else>
                点击卡片进入编辑并选中文字可局部调样式；未选中时作用于
                <strong>第 {{ activeCardIndex + 1 }}/{{ totalEditableCards }} 页</strong>
              </template>
            </p>
            <div v-if="sectionMode && cardSections.length > 1" class="field" style="margin-top: 8px;">
              <div class="segmented" style="flex-wrap: wrap;">
                <button
                  v-for="(_, i) in cardSections"
                  :key="cardSections[i].id"
                  type="button"
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': activeCardIndex === i }"
                  @click="selectCard(i)"
                >
                  {{ i + 1 }}
                </button>
              </div>
              <button
                class="btn btn--outline btn--sm"
                type="button"
                style="margin-top: 8px; width: 100%; justify-content: center;"
                title="把当前页的颜色/字号/对齐同步到全部卡片"
                @click="applyToAllCards"
              >
                一键应用到全部卡片
              </button>
            </div>
            <div class="field" style="margin-top: 8px;" @mousedown="preserveInlineSelection">
              <div class="colorPickerLight">
                <label class="colorPickerLight__native-wrapper">
                  <input class="colorPickerLight__native" type="color" v-model="editingTextColor" />
                  <span class="colorPickerLight__dot" :style="{ backgroundColor: editingTextColor }" />
                </label>
                <input 
                  class="colorPickerLight__input" 
                  type="text" 
                  v-model="editingTextColor" 
                  @blur="() => { if (!/^#[0-9A-Fa-f]{6}$/i.test(editingTextColor)) editingTextColor = '#000000'; }"
                />
              </div>
            </div>

            <div class="field" @mousedown="preserveInlineSelection">
              <div class="fontSizeRow">
                <div class="fontSizeRow__head">
                  <span class="fontSizeRow__label">正文字号</span>
                  <strong class="fontSizeRow__value">{{ editingFontSize }} px</strong>
                </div>
                <input
                  v-model.number="editingFontSize"
                  class="range"
                  type="range"
                  min="12"
                  max="28"
                  step="1"
                />
                <div class="fontSizeRow__presets">
                  <button type="button" class="fontSizeRow__chip" :class="{ 'is-active': editingFontSize === 14 }" @click="editingFontSize = 14">紧凑 14</button>
                  <button type="button" class="fontSizeRow__chip" :class="{ 'is-active': editingFontSize === 18 }" @click="editingFontSize = 18">推荐 18</button>
                  <button type="button" class="fontSizeRow__chip" :class="{ 'is-active': editingFontSize === 22 }" @click="editingFontSize = 22">舒适 22</button>
                  <button type="button" class="fontSizeRow__chip" :class="{ 'is-active': editingFontSize === 26 }" @click="editingFontSize = 26">醒目 26</button>
                </div>
                <p class="ui-hint">
                  {{ hasInlineSelection ? '当前：仅修改选中文字的字号' : '未选中文字时修改整页正文字号；小红书常用 16–20。' }}
                </p>
              </div>
            </div>

            <div class="field" @mousedown="preserveInlineSelection">
              <div class="alignRow__label">标题对齐</div>
              <div class="segmented segmented--4">
                <button
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': editingTitleAlign === 'left' }"
                  @click="editingTitleAlign = 'left'"
                  title="标题左对齐"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6H20M4 12H14M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': editingTitleAlign === 'center' }"
                  @click="editingTitleAlign = 'center'"
                  title="标题居中"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6H20M7 12H17M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': editingTitleAlign === 'right' }"
                  @click="editingTitleAlign = 'right'"
                  title="标题右对齐"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6H20M10 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': editingTitleAlign === 'justify' }"
                  @click="editingTitleAlign = 'justify'"
                  title="标题两端对齐"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="field" @mousedown="preserveInlineSelection">
              <div class="alignRow__label">正文对齐</div>
              <div class="segmented segmented--3">
                <button
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': editingContentAlign === 'left' }"
                  @click="editingContentAlign = 'left'"
                  :title="hasInlineSelection ? '仅对齐选中文字' : '正文左对齐'"
                >
                  左侧
                </button>
                <button
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': editingContentAlign === 'center' }"
                  @click="editingContentAlign = 'center'"
                  :title="hasInlineSelection ? '仅对齐选中文字' : '正文居中'"
                >
                  居中
                </button>
                <button
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': editingContentAlign === 'right' }"
                  @click="editingContentAlign = 'right'"
                  :title="hasInlineSelection ? '仅对齐选中文字' : '正文右对齐'"
                >
                  右侧
                </button>
              </div>
              <p class="ui-hint">
                {{
                  hasInlineSelection
                    ? '已选中文字 — 正文对齐/字号/颜色仅作用于选区'
                    : '未选中时对齐作用于整页；选中正文后可单独对齐。可用「一键应用到全部卡片」同步整页样式。'
                }}
              </p>
            </div>

            <div
              v-if="hasTableSelection"
              class="field tableControls"
              style="margin-top: 8px;"
              @mousedown="preserveTableSelection"
            >
              <div class="alignRow__label">
                表格列 {{ tableSelection.colIndex + 1 }}/{{ tableSelection.colCount }}
              </div>
              <div class="segmented segmented--3">
                <button
                  type="button"
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': tableSelection.align === 'left' }"
                  @click="setSelectedColumnAlign('left')"
                >
                  左
                </button>
                <button
                  type="button"
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': tableSelection.align === 'center' }"
                  @click="setSelectedColumnAlign('center')"
                >
                  中
                </button>
                <button
                  type="button"
                  class="segmented__btn"
                  :class="{ 'segmented__btn--active': tableSelection.align === 'right' }"
                  @click="setSelectedColumnAlign('right')"
                >
                  右
                </button>
              </div>
              <div class="fontSizeRow" style="margin-top: 8px;">
                <div class="fontSizeRow__head">
                  <span class="fontSizeRow__label">列宽</span>
                  <strong class="fontSizeRow__value">{{ tableSelection.widthPercent }}%</strong>
                </div>
                <input
                  class="range"
                  type="range"
                  min="10"
                  max="80"
                  step="1"
                  :value="tableSelection.widthPercent"
                  @input="setSelectedColumnWidth(Number(($event.target as HTMLInputElement).value))"
                />
              </div>
              <div class="presetActionRow" style="margin-top: 6px;">
                <button
                  class="btn btn--outline btn--sm"
                  type="button"
                  :disabled="tableSelection.colIndex <= 0"
                  @click="moveSelectedColumn(-1)"
                >
                  左移列
                </button>
                <button
                  class="btn btn--outline btn--sm"
                  type="button"
                  :disabled="tableSelection.colIndex >= tableSelection.colCount - 1"
                  @click="moveSelectedColumn(1)"
                >
                  右移列
                </button>
              </div>
              <p class="ui-hint">在卡片正文编辑态点击表格单元格后调整；导出将保留对齐与列宽。</p>
            </div>
          </div>

          <div class="group">
            <div class="group__title">副标题</div>
            <label class="watermark-switch">
              <span class="watermark-switch__label">显示副标题</span>
              <input v-model="showSubtitle" type="checkbox" />
            </label>
          </div>

          <div class="group">
            <div class="group__title">水印</div>
            <label class="watermark-switch">
              <span class="watermark-switch__label">添加水印</span>
              <input v-model="showWatermark" type="checkbox" />
            </label>
            <div v-if="showWatermark" class="watermark-input-wrapper">
              <input 
                v-model="watermark" 
                class="watermark-input" 
                type="text" 
                placeholder="输入水印内容..." 
              />
            </div>
          </div>
        </div>

      </aside>

      <Teleport to="body">
        <div
          v-if="extraPanel"
          ref="extraPanelElRef"
          class="extraSubmenu extraSubmenu--smart"
          role="dialog"
          :aria-label="extraPanelTitle"
          :style="extraPanelStyle"
          data-smart-popover="extra-panel"
          @click.stop
        >
          <div class="extraSubmenu__header">
            <button type="button" class="extraSubmenu__back" @click="closeExtraPanel" title="关闭">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              关闭
            </button>
            <strong class="extraSubmenu__title">{{ extraPanelTitle }}</strong>
            <button type="button" class="extraSubmenu__close" @click="closeExtraPanel" aria-label="关闭">×</button>
          </div>

          <div class="extraSubmenu__body">
            <template v-if="extraPanel === 'fonts'">
              <div class="field">
                <span class="group__title">选择字体</span>
                <select
                  class="watermark-input"
                  :value="selectedFontId"
                  @change="setSelectedFontId(($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="f in onlineFonts" :key="f.id" :value="f.id">
                    {{ f.label }}
                  </option>
                </select>
                <div class="presetActionRow">
                  <button class="btn btn--outline btn--sm" type="button" :disabled="isUpdatingFonts" @click="onUpdateFonts">
                    {{ isUpdatingFonts ? '更新中…' : '手动更新字体' }}
                  </button>
                  <button class="btn btn--outline btn--sm" type="button" @click="showCustomFontForm = !showCustomFontForm">
                    添加自定义
                  </button>
                </div>
                <p v-if="fontsUpdateMessage" class="ui-hint">{{ fontsUpdateMessage }}</p>
                <div v-if="showCustomFontForm" class="customFontForm">
                  <input v-model="customFontLabel" class="watermark-input" type="text" placeholder="显示名称，如 霞鹜文楷" />
                  <input v-model="customFontFamily" class="watermark-input" type="text" placeholder='CSS family，如 "LXGW WenKai", serif' />
                  <input v-model="customFontCssUrl" class="watermark-input" type="url" placeholder="可选：字体 CSS URL" />
                  <button class="btn btn--primary btn--sm" type="button" @click="onAddCustomFont">保存字体</button>
                </div>
              </div>
            </template>

            <template v-else-if="extraPanel === 'stickers'">
              <OnlineStickersPanel />
            </template>

            <template v-else-if="extraPanel === 'presets'">
              <div class="field">
                <span class="group__title">保存卡片项目</span>
                <p class="ui-hint">保存完整项目（版式/分页/贴纸等），可本地列表重开或导出 JSON</p>
                <div class="presetSaveRow">
                  <input v-model="projectNameInput" class="watermark-input presetSaveRow__input" type="text" placeholder="项目名称" />
                  <button class="btn btn--primary btn--sm" type="button" @click="onSaveProjectLibrary">存到列表</button>
                </div>
                <div class="presetActionRow">
                  <button class="btn btn--outline btn--sm" type="button" @click="onExportProject">导出 JSON</button>
                  <button class="btn btn--outline btn--sm" type="button" @click="onPickProjectFile">导入 JSON</button>
                  <button class="btn btn--outline btn--sm" type="button" @click="onExportText">保存文字 MD</button>
                </div>
                <input
                  ref="projectFileInputRef"
                  class="srOnly"
                  type="file"
                  accept=".json,application/json,.auracard.json"
                  @change="onProjectFileChange"
                />
                <p v-if="projectMessage" class="ui-hint">{{ projectMessage }}</p>
              </div>
              <div class="field fieldStack">
                <span class="group__title">我的项目</span>
                <div v-if="savedProjects.length" class="presetList">
                  <div v-for="p in savedProjects" :key="p.savedAt" class="presetList__item">
                    <strong class="presetList__name">{{ p.name }}</strong>
                    <div class="presetList__actions">
                      <button class="btn btn--outline btn--sm" type="button" @click="loadProjectFromLibrary(String(p.savedAt))">打开</button>
                      <button class="btn btn--danger btn--sm" type="button" @click="deleteProjectFromLibrary(p.savedAt)">删除</button>
                    </div>
                  </div>
                </div>
                <p v-else class="ui-hint">暂无保存的项目</p>
              </div>
              <div class="field fieldStack">
                <span class="group__title">保存预设</span>
                <p class="ui-hint">仅排版样式快捷复用（模板/配色/字体等）</p>
                <div class="presetSaveRow">
                  <input v-model="presetNameInput" class="watermark-input presetSaveRow__input" type="text" placeholder="预设名称" />
                  <button class="btn btn--primary btn--sm" type="button" @click="onSavePreset">保存</button>
                </div>
                <p v-if="presetMessage" class="ui-hint">{{ presetMessage }}</p>
              </div>
              <div class="field fieldStack">
                <span class="group__title">我的预设</span>
                <div v-if="userPresets.length" class="presetList">
                  <div v-for="p in userPresets" :key="p.id" class="presetList__item">
                    <strong class="presetList__name">{{ p.name }}</strong>
                    <div class="presetList__actions">
                      <button class="btn btn--outline btn--sm" type="button" @click="applyPreset(p.id)">应用</button>
                      <button class="btn btn--outline btn--sm" type="button" @click="overwritePreset(p.id)">覆盖更新</button>
                      <button class="btn btn--danger btn--sm" type="button" @click="deletePreset(p.id)">删除</button>
                    </div>
                  </div>
                </div>
                <p v-else class="ui-hint">暂无预设</p>
              </div>
            </template>
          </div>
        </div>
      </Teleport>
</template>

<style scoped>
.extraEntryRow {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xs);
}

.extraEntryRow__btn {
  border: 1px solid var(--border-strong);
  background: var(--surface-solid);
  color: var(--muted);
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-xs);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.extraEntryRow__btn:hover {
  border-color: var(--primary-ring);
  color: var(--primary);
  background: var(--primary-light);
}

.extraEntryRow__btn.is-active {
  background: var(--primary-light);
  border-color: var(--primary-ring);
  color: var(--primary);
  font-weight: 700;
}

.settings-panel {
  position: relative;
}

.extraSubmenu {
  display: flex;
  flex-direction: column;
  background: var(--surface-solid, #fff);
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
  box-sizing: border-box;
  min-height: 240px;
}

.extraSubmenu--smart {
  /* position/size from useSmartPopover (fixed) */
  inset: auto;
}


.extraSubmenu__header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-bottom: 1px solid var(--border);
  background: var(--surface-solid);
}

.extraSubmenu__back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  padding: var(--space-xs) 2px;
}

.extraSubmenu__back:hover {
  color: var(--primary);
}

.extraSubmenu__title {
  text-align: center;
  font-size: 14px;
  color: var(--text);
}

.extraSubmenu__close {
  border: none;
  background: transparent;
  color: var(--muted2);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 0 var(--space-xs);
}

.extraSubmenu__close:hover {
  color: var(--text);
}

.extraSubmenu__body {
  flex: 1;
  overflow: auto;
  padding: var(--space-md);
}

.fieldStack {
  margin-top: var(--space-md);
}

.presetSaveRow {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.presetSaveRow__input {
  flex: 1;
  min-width: 0;
}

.presetActionRow {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.customFontForm {
  display: grid;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.presetList {
  display: grid;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.presetList__item {
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--surface-solid);
}

.presetList__name {
  font-size: 13px;
  color: var(--text);
}

.presetList__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}
</style>
