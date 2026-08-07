import { ref } from "vue";
import {
  selectedTemplateId,
  aspectId,
  height,
  title,
  subtitle,
  content,
  watermark,
  showWatermark,
  showSubtitle,
  background,
  textColor,
  textAlignment,
  contentTextAlignment,
  contentFontSizePx,
  accent,
  radius,
  padding,
  bgTab,
  gradientAngle,
  bgImageUrl,
  bgOpacityPercent,
  sectionMode,
  cardSections,
  activeCardIndex,
} from "./state";
import { selectedFontId, setSelectedFontId } from "./fonts";
import { placedStickers, setPlacedStickers, type PlacedSticker } from "./stickers";
import type { TemplateId, AspectId, BgTab, CardSection } from "./types";

export type UserLayoutPreset = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  snapshot: LayoutSnapshot;
};

export type LayoutSnapshot = {
  selectedTemplateId: TemplateId;
  aspectId: AspectId;
  height: number;
  title: string;
  subtitle: string;
  content: string;
  watermark: string;
  showWatermark: boolean;
  showSubtitle: boolean;
  background: string;
  textColor: string;
  textAlignment: "left" | "center" | "right" | "justify";
  contentTextAlignment: "left" | "center" | "right";
  contentFontSizePx: number;
  accent: string;
  radius: number;
  padding: number;
  bgTab: BgTab;
  gradientAngle: number;
  bgImageUrl: string | null;
  bgOpacityPercent: number;
  selectedFontId: string;
  stickers: PlacedSticker[];
  sectionMode: boolean;
  cardSections: CardSection[];
  activeCardIndex: number;
};

const STORAGE_KEY = "auracard.userPresets";

export const userPresets = ref<UserLayoutPreset[]>([]);
export const presetMessage = ref("");

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as UserLayoutPreset[];
    if (Array.isArray(parsed)) userPresets.value = parsed;
  } catch {
    userPresets.value = [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets.value));
}

export function captureLayoutSnapshot(): LayoutSnapshot {
  return {
    selectedTemplateId: selectedTemplateId.value,
    aspectId: aspectId.value,
    height: height.value,
    title: title.value,
    subtitle: subtitle.value,
    content: content.value,
    watermark: watermark.value,
    showWatermark: showWatermark.value,
    showSubtitle: showSubtitle.value,
    background: background.value,
    textColor: textColor.value,
    textAlignment: textAlignment.value,
    contentTextAlignment: contentTextAlignment.value,
    contentFontSizePx: contentFontSizePx.value,
    accent: accent.value,
    radius: radius.value,
    padding: padding.value,
    bgTab: bgTab.value,
    gradientAngle: gradientAngle.value,
    bgImageUrl: bgImageUrl.value,
    bgOpacityPercent: bgOpacityPercent.value,
    selectedFontId: selectedFontId.value,
    stickers: placedStickers.value.map((s) => ({ ...s })),
    sectionMode: sectionMode.value,
    cardSections: cardSections.value.map((s) => ({
      ...s,
      style: s.style ? { ...s.style } : undefined,
    })),
    activeCardIndex: activeCardIndex.value,
  };
}

export function applyLayoutSnapshot(snap: LayoutSnapshot) {
  // 先切模板（会触发默认配色 watch），再覆盖为预设快照
  selectedTemplateId.value = snap.selectedTemplateId;
  aspectId.value = snap.aspectId;
  height.value = snap.height;
  title.value = snap.title;
  subtitle.value = snap.subtitle;
  content.value = snap.content;
  watermark.value = snap.watermark;
  showWatermark.value = snap.showWatermark;
  showSubtitle.value = snap.showSubtitle;
  background.value = snap.background;
  textColor.value = snap.textColor;
  textAlignment.value = snap.textAlignment;
  contentTextAlignment.value = snap.contentTextAlignment;
  contentFontSizePx.value = snap.contentFontSizePx;
  accent.value = snap.accent;
  radius.value = snap.radius;
  padding.value = snap.padding;
  bgTab.value = snap.bgTab;
  gradientAngle.value = snap.gradientAngle;
  bgImageUrl.value = snap.bgImageUrl;
  bgOpacityPercent.value = snap.bgOpacityPercent;
  setSelectedFontId(snap.selectedFontId || "system");
  setPlacedStickers(snap.stickers || []);
  sectionMode.value = Boolean(snap.sectionMode);
  cardSections.value = Array.isArray(snap.cardSections)
    ? snap.cardSections.map((s) => ({ ...s }))
    : [];
  activeCardIndex.value = snap.activeCardIndex || 0;

  // 再次写回可能被模板 watch 覆盖的字段
  background.value = snap.background;
  textColor.value = snap.textColor;
  textAlignment.value = snap.textAlignment;
  contentTextAlignment.value = snap.contentTextAlignment;
  accent.value = snap.accent;
  radius.value = snap.radius;
  padding.value = snap.padding;
  bgTab.value = snap.bgTab;
}

export function saveCurrentAsPreset(name: string) {
  const trimmed = name.trim() || `预设 ${userPresets.value.length + 1}`;
  const now = Date.now();
  const preset: UserLayoutPreset = {
    id: `preset-${now}`,
    name: trimmed,
    createdAt: now,
    updatedAt: now,
    snapshot: captureLayoutSnapshot(),
  };
  userPresets.value = [preset, ...userPresets.value];
  persist();
  presetMessage.value = `已保存「${trimmed}」`;
  return preset;
}

export function overwritePreset(id: string) {
  const idx = userPresets.value.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const now = Date.now();
  const next = [...userPresets.value];
  next[idx] = {
    ...next[idx],
    updatedAt: now,
    snapshot: captureLayoutSnapshot(),
  };
  userPresets.value = next;
  persist();
  presetMessage.value = `已更新「${next[idx].name}」`;
}

export function applyPreset(id: string) {
  const preset = userPresets.value.find((p) => p.id === id);
  if (!preset) return;
  applyLayoutSnapshot(preset.snapshot);
  presetMessage.value = `已应用「${preset.name}」`;
}

export function renamePreset(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  userPresets.value = userPresets.value.map((p) =>
    p.id === id ? { ...p, name: trimmed, updatedAt: Date.now() } : p,
  );
  persist();
}

export function deletePreset(id: string) {
  userPresets.value = userPresets.value.filter((p) => p.id !== id);
  persist();
  presetMessage.value = "已删除预设";
}

export function initPresets() {
  loadFromStorage();
}
