<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  stickerSearchQuery,
  stickerCategory,
  filteredStickerPack,
  STICKER_CATEGORIES,
  addStickerFromPack,
  placedStickers,
  selectedStickerId,
  selectSticker,
  updatePlacedSticker,
  removePlacedSticker,
  clearStickers,
  updateOnlineStickers,
  stickersUpdateMessage,
  isUpdatingStickers,
  setStickerCategory,
  setStickerSearchQuery,
  type StickerCategoryId,
  type StickerPackItem,
} from '../store'

const searchDraft = ref(stickerSearchQuery.value)

const selectedPlacedSticker = computed(() =>
  placedStickers.value.find((s) => s.id === selectedStickerId.value) || null,
)

function onSearch() {
  setStickerSearchQuery(searchDraft.value.trim())
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    onSearch()
  }
}

function clearSearch() {
  searchDraft.value = ''
  setStickerSearchQuery('')
}

function pickCategory(id: StickerCategoryId | 'all') {
  setStickerCategory(id)
}

function thumbPreview(item: StickerPackItem) {
  if (item.kind === 'svg') return '◆'
  return item.content || item.label
}

function pathAttrs(item: StickerPackItem) {
  if (item.svgStroke) {
    return {
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    } as const
  }
  return { fill: 'currentColor' } as const
}
</script>

<template>
  <div class="stickerPanel">
    <div class="field">
      <span class="group__title">分类</span>
      <div class="segmented segmented--3 stickerPanel__cats">
        <button
          type="button"
          class="segmented__btn"
          :class="{ 'segmented__btn--active': stickerCategory === 'all' }"
          @click="pickCategory('all')"
        >
          全部
        </button>
        <button
          v-for="cat in STICKER_CATEGORIES"
          :key="cat.id"
          type="button"
          class="segmented__btn"
          :class="{ 'segmented__btn--active': stickerCategory === cat.id }"
          @click="pickCategory(cat.id)"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <div class="field" style="margin-top: 8px;">
      <div class="stickerPanel__search">
        <input
          v-model="searchDraft"
          class="watermark-input"
          type="search"
          placeholder="搜索素材，如 表情 / 星星"
          aria-label="搜索贴纸"
          @keydown="onSearchKeydown"
        />
        <button class="btn btn--outline btn--sm" type="button" @click="onSearch">搜索</button>
        <button
          v-if="stickerSearchQuery.trim()"
          class="btn btn--outline btn--sm"
          type="button"
          @click="clearSearch"
        >
          清除
        </button>
      </div>
    </div>

    <div class="field" style="margin-top: 8px;">
      <div class="stickerPanel__toolbar">
        <button
          class="btn btn--outline btn--sm"
          type="button"
          :disabled="isUpdatingStickers"
          @click="updateOnlineStickers()"
        >
          {{ isUpdatingStickers ? '更新中…' : '更新素材清单' }}
        </button>
        <span class="fontSizeRow__tip">{{ filteredStickerPack.length }} 项</span>
      </div>
      <p v-if="stickersUpdateMessage" class="fontSizeRow__tip">{{ stickersUpdateMessage }}</p>
      <p class="fontSizeRow__tip">点击添加 · 选中后可拖动/缩放 · Delete/Backspace 删除 · Esc 取消选中 · 双击删除</p>
    </div>

    <div v-if="filteredStickerPack.length" class="stickerPanel__grid">
      <button
        v-for="item in filteredStickerPack"
        :key="item.id"
        type="button"
        class="stickerPanel__thumb"
        :title="item.label"
        @click="addStickerFromPack(item.id)"
      >
        <span
          class="stickerPanel__preview"
          :style="item.color ? { color: item.color } : undefined"
        >
          <svg
            v-if="item.kind === 'svg' && item.svgPath"
            class="stickerPanel__svg"
            :viewBox="item.svgViewBox || '0 0 24 24'"
          >
            <path :d="item.svgPath" v-bind="pathAttrs(item)" />
          </svg>
          <template v-else>{{ thumbPreview(item) }}</template>
        </span>
        <span class="stickerPanel__label">{{ item.label }}</span>
      </button>
    </div>
    <p v-else class="fontSizeRow__tip" style="margin-top: 8px;">未找到相关素材</p>

    <div v-if="selectedPlacedSticker" class="field stickerPanel__adjust">
      <span class="group__title">选中贴纸</span>
      <div class="fontSizeRow__head" style="margin-top: 6px;">
        <span class="fontSizeRow__label">大小 {{ selectedPlacedSticker.size }}</span>
      </div>
      <input
        class="range"
        type="range"
        min="16"
        max="96"
        :value="selectedPlacedSticker.size"
        @input="updatePlacedSticker(selectedPlacedSticker.id, { size: Number(($event.target as HTMLInputElement).value) })"
      />
      <div class="fontSizeRow__head" style="margin-top: 6px;">
        <span class="fontSizeRow__label">旋转 {{ selectedPlacedSticker.rotate }}°</span>
      </div>
      <input
        class="range"
        type="range"
        min="-45"
        max="45"
        :value="selectedPlacedSticker.rotate"
        @input="updatePlacedSticker(selectedPlacedSticker.id, { rotate: Number(($event.target as HTMLInputElement).value) })"
      />
      <div class="fontSizeRow__head" style="margin-top: 6px;">
        <span class="fontSizeRow__label">透明度 {{ Math.round(selectedPlacedSticker.opacity * 100) }}%</span>
      </div>
      <input
        class="range"
        type="range"
        min="20"
        max="100"
        :value="Math.round(selectedPlacedSticker.opacity * 100)"
        @input="updatePlacedSticker(selectedPlacedSticker.id, { opacity: Number(($event.target as HTMLInputElement).value) / 100 })"
      />
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button class="btn btn--outline btn--sm" type="button" @click="removePlacedSticker(selectedPlacedSticker.id)">
          删除贴纸
        </button>
        <button class="btn btn--outline btn--sm" type="button" @click="selectSticker(null)">
          取消选中
        </button>
      </div>
    </div>

    <button
      v-if="placedStickers.length"
      class="btn btn--outline btn--sm"
      type="button"
      style="margin-top: 8px; width: 100%; justify-content: center;"
      @click="clearStickers"
    >
      清空全部贴纸（{{ placedStickers.length }}）
    </button>
  </div>
</template>

<style scoped>
.stickerPanel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stickerPanel__cats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stickerPanel__search {
  display: flex;
  gap: 6px;
  align-items: stretch;
  flex-wrap: wrap;
}

.stickerPanel__search .watermark-input {
  flex: 1;
  min-width: 120px;
}

.stickerPanel__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stickerPanel__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 4px;
}

.stickerPanel__thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: #fff;
  border-radius: 10px;
  padding: 8px 4px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.stickerPanel__thumb:hover {
  border-color: rgba(37, 99, 235, 0.35);
  color: #1d4ed8;
  background: rgba(37, 99, 235, 0.04);
}

.stickerPanel__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  font-size: 22px;
  line-height: 1;
  color: #0f172a;
}

.stickerPanel__svg {
  width: 24px;
  height: 24px;
}

.stickerPanel__label {
  font-size: 10px;
  color: #64748b;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stickerPanel__adjust {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}
</style>
