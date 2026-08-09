<script setup lang="ts">
import {
  aiOrganizeDraft,
  applyAiOrganizeDraft,
  closeAiOrganizeDraft,
  copyAiOrganizeDraft,
  isAiOrganizeDraftOpen,
  isChatLoading,
} from '../store';
import { useToast } from '../composables/useToast';

const toast = useToast();

async function onCopy() {
  const ok = await copyAiOrganizeDraft();
  if (ok) toast.success('已复制整理结果');
  else toast.warning('复制失败，请手动选择文本');
}

async function onLayout() {
  await applyAiOrganizeDraft();
  toast.success('已一键排版到卡片');
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isAiOrganizeDraftOpen"
      class="content-editor-overlay"
      @click.self="!isChatLoading && closeAiOrganizeDraft()"
    >
      <div class="content-editor-modal organize-draft-modal" role="dialog" aria-label="AI 整理结果">
        <div class="content-editor-header">
          <h3 class="content-editor-title">AI 整理结果</h3>
          <div class="content-editor-header__actions">
            <button class="btn btn--outline btn--sm" type="button" :disabled="isChatLoading" @click="onCopy">
              复制
            </button>
            <button class="btn btn--ghost btn--sm" type="button" :disabled="isChatLoading" @click="closeAiOrganizeDraft">
              ✕
            </button>
          </div>
        </div>
        <p class="organize-draft__tip">可修改标题/副标题/正文/水印，确认后点「一键排版」（不再调用 AI）</p>
        <div class="organize-draft__body">
          <textarea
            v-model="aiOrganizeDraft"
            class="organize-draft__textarea"
            spellcheck="false"
            :disabled="isChatLoading"
          />
        </div>
        <div class="content-editor-footer">
          <span class="content-editor-tip">格式：标题：… / 副标题：… / 正文：… / 水印：…</span>
          <div class="content-editor-footer__actions">
            <button class="btn btn--outline" type="button" :disabled="isChatLoading" @click="closeAiOrganizeDraft">
              稍后处理
            </button>
            <button
              class="btn btn--primary"
              type="button"
              :disabled="isChatLoading || !aiOrganizeDraft.trim()"
              @click="onLayout"
            >
              一键排版
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.organize-draft-modal {
  max-width: 720px;
  height: min(78vh, 720px);
}

.organize-draft__tip {
  margin: 0;
  padding: 0 var(--space-xl) var(--space-sm);
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

.organize-draft__body {
  flex: 1;
  min-height: 0;
  padding: 0 var(--space-xl) var(--space-md);
  display: flex;
}

.organize-draft__textarea {
  flex: 1;
  width: 100%;
  min-height: 280px;
  resize: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-solid);
  color: var(--text);
  padding: var(--space-md);
  font-size: 14px;
  line-height: 1.6;
  font-family: var(--font-mono);
  outline: none;
}

.organize-draft__textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.content-editor-header__actions {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.content-editor-footer__actions {
  display: flex;
  gap: var(--space-md);
  align-items: center;
}
</style>
